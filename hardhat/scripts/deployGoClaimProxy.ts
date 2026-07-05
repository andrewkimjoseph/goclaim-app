import hre from "hardhat";
import { config as loadEnv } from "dotenv";
import {
  type Address,
  type Hex,
  encodeFunctionData,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { GOCLAIM_IMPLEMENTATION_ADDRESS } from "../constants";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env.local" });
loadEnv({ path: "../.env" });

const DEFAULT_IDENTITY =
  "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as Address;

const PROXY_ARTIFACT =
  "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy";

async function main() {
  const rawPk = process.env.APP_PRIVATE_KEY ?? process.env.DEPLOYER_PK;
  if (!rawPk) {
    throw new Error("APP_PRIVATE_KEY not found in environment variables");
  }

  const infuraApiKey = process.env.INFURA_API_KEY;
  const rpcUrl = infuraApiKey
    ? `https://celo-mainnet.infura.io/v3/${infuraApiKey}`
    : "https://forno.celo.org";

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

  const identityContract = getAddress(
    (process.env.IDENTITY_PROXY_ADDRESS ?? DEFAULT_IDENTITY) as Address
  );

  console.log(`Deployer / owner: ${account.address}`);
  console.log(`GoClaim signer: ${account.address}`);
  console.log(`Identity contract: ${identityContract}`);

  const goClaimArtifact = await hre.artifacts.readArtifact("GoClaim");
  const proxyArtifact = await hre.artifacts.readArtifact(PROXY_ARTIFACT);

  const initData = encodeFunctionData({
    abi: goClaimArtifact.abi,
    functionName: "initialize",
    args: [account.address, account.address, identityContract],
  });

  let implAddress: Address;
  const proxyOnly = process.env.PROXY_ONLY === "1";

  if (proxyOnly) {
    implAddress = getAddress(GOCLAIM_IMPLEMENTATION_ADDRESS);
    console.log(`Using configured implementation: ${implAddress}`);
  } else {
    const implHash = await walletClient.deployContract({
      abi: goClaimArtifact.abi,
      bytecode: goClaimArtifact.bytecode as Hex,
    });
    const implRcpt = await publicClient.waitForTransactionReceipt({
      hash: implHash,
    });
    if (!implRcpt.contractAddress) {
      throw new Error("Implementation deployment failed");
    }
    implAddress = implRcpt.contractAddress;
    console.log(`Implementation: ${implAddress}`);
  }

  const proxyHash = await walletClient.deployContract({
    abi: proxyArtifact.abi,
    bytecode: proxyArtifact.bytecode as Hex,
    args: [implAddress, initData],
  });
  const proxyRcpt = await publicClient.waitForTransactionReceipt({
    hash: proxyHash,
  });
  const proxyAddress = proxyRcpt.contractAddress;
  if (!proxyAddress) {
    throw new Error("Proxy deployment failed");
  }

  console.log(`GoClaim proxy deployed at: ${proxyAddress}`);
  console.log(`Implementation: ${implAddress}`);
  console.log(`Init data: ${initData}`);
  console.log(
    "Update GOCLAIM_PROXY_ADDRESS and GOCLAIM_IMPLEMENTATION_ADDRESS in lib/onchain/constants.ts"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
