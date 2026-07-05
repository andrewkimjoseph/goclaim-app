import hre from "hardhat";
import { config as loadEnv } from "dotenv";
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  formatEther,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import {
  GOCLAIM_PROXY_ADDRESS,
} from "../constants";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env.local" });
loadEnv({ path: "../.env" });

const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function getImplementationFromSlot(rawValue: Hex): Address {
  const stripped = rawValue.replace(/^0x/, "");
  const implementation = `0x${stripped.slice(24)}`;
  return getAddress(implementation);
}

async function main() {
  const rawPk = process.env.APP_PRIVATE_KEY ?? process.env.DEPLOYER_PK;
  if (!rawPk) {
    throw new Error("APP_PRIVATE_KEY not found in environment variables");
  }

  const newImplementationRaw = process.env.NEW_GOCLAIM_IMPLEMENTATION;
  if (!newImplementationRaw) {
    throw new Error("NEW_GOCLAIM_IMPLEMENTATION not found in environment variables");
  }

  const infuraApiKey = process.env.INFURA_API_KEY;
  const rpcUrl = infuraApiKey
    ? `https://celo-mainnet.infura.io/v3/${infuraApiKey}`
    : "https://forno.celo.org";

  const proxyAddress = getAddress(GOCLAIM_PROXY_ADDRESS);
  const newImplementation = getAddress(newImplementationRaw as Address);

  const account = privateKeyToAccount(
    (rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`) as Hex
  );
  const publicClient = createPublicClient({
    chain: celo,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    chain: celo,
    transport: http(rpcUrl),
    account,
  });

  const artifact = await hre.artifacts.readArtifact("GoClaim");

  console.log(`Upgrader: ${account.address}`);
  console.log(`Proxy: ${proxyAddress}`);
  console.log(`Candidate implementation: ${newImplementation}`);

  const [owner, version, balance, implementationSlot] = await Promise.all([
    publicClient.readContract({
      address: proxyAddress,
      abi: artifact.abi,
      functionName: "owner",
      args: [],
    }),
    publicClient.readContract({
      address: proxyAddress,
      abi: artifact.abi,
      functionName: "version",
      args: [],
    }),
    publicClient.getBalance({ address: account.address }),
    publicClient.getStorageAt({
      address: proxyAddress,
      slot: EIP1967_IMPLEMENTATION_SLOT,
    }),
  ]);

  if (!implementationSlot) {
    throw new Error("Failed to fetch ERC1967 implementation slot value");
  }

  const currentImplementation = getImplementationFromSlot(implementationSlot);
  const nextVersion = BigInt(version) + 1n;

  console.log(`Owner (proxy): ${owner}`);
  console.log(`Current version: ${version.toString()}`);
  console.log(`Current implementation: ${currentImplementation}`);
  console.log(`Upgrader balance: ${formatEther(balance)} CELO`);
  console.log(`Target version: ${nextVersion.toString()}`);

  if (getAddress(owner as Address) !== getAddress(account.address)) {
    throw new Error(
      `Signer ${account.address} is not owner ${owner}. Upgrade would revert.`
    );
  }
  if (newImplementation === currentImplementation) {
    throw new Error("New implementation equals current implementation");
  }

  console.log("Simulating upgradeToAndBumpVersion...");
  await publicClient.simulateContract({
    address: proxyAddress,
    abi: artifact.abi,
    functionName: "upgradeToAndBumpVersion",
    args: [newImplementation, nextVersion],
    account: account.address,
  });
  console.log("Simulation successful.");

  const txHash = await walletClient.writeContract({
    address: proxyAddress,
    abi: artifact.abi,
    functionName: "upgradeToAndBumpVersion",
    args: [newImplementation, nextVersion],
  });
  console.log(`Upgrade tx: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Upgrade confirmed in block: ${receipt.blockNumber.toString()}`);

  const [versionAfter, implementationSlotAfter] = await Promise.all([
    publicClient.readContract({
      address: proxyAddress,
      abi: artifact.abi,
      functionName: "version",
      args: [],
    }),
    publicClient.getStorageAt({
      address: proxyAddress,
      slot: EIP1967_IMPLEMENTATION_SLOT,
    }),
  ]);

  if (!implementationSlotAfter) {
    throw new Error("Failed to fetch implementation slot after upgrade");
  }

  const implementationAfter = getImplementationFromSlot(implementationSlotAfter);
  console.log(`Version after: ${versionAfter.toString()}`);
  console.log(`Implementation after: ${implementationAfter}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
