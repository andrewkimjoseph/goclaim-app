import hre from "hardhat";
import { config as loadEnv } from "dotenv";
import {
  type Address,
  type Hex,
  encodeFunctionData,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  GOCLAIM_IMPLEMENTATION_ADDRESS,
  GOCLAIM_PROXY_ADDRESS,
} from "../constants";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env.local" });
loadEnv({ path: "../.env" });

const DEFAULT_IDENTITY =
  "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as Address;

const PROXY_ARTIFACT =
  "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy";

async function verifyProxyLinkOnCeloscan(
  proxyAddress: Address,
  implementationAddress: Address
): Promise<void> {
  const apiKey =
    process.env.CELOSCAN_API_KEY ?? process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    throw new Error("CELOSCAN_API_KEY not found");
  }

  const params = new URLSearchParams({
    chainid: "42220",
    module: "contract",
    action: "verifyproxycontract",
    address: proxyAddress,
    expectedimplementation: implementationAddress,
    apikey: apiKey,
  });

  const submitRes = await fetch(
    `https://api.etherscan.io/v2/api?${params.toString()}`,
    { method: "POST" }
  );
  const submitJson = (await submitRes.json()) as {
    status: string;
    result: string;
  };

  if (submitJson.status !== "1") {
    throw new Error(
      `Celoscan proxy link failed: ${submitJson.result}`
    );
  }

  const guid = submitJson.result;
  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusParams = new URLSearchParams({
      chainid: "42220",
      module: "contract",
      action: "checkproxyverification",
      guid,
      apikey: apiKey,
    });

    const statusRes = await fetch(
      `https://api.etherscan.io/v2/api?${statusParams.toString()}`
    );
    const statusJson = (await statusRes.json()) as {
      status: string;
      result: string;
    };

    if (statusJson.status === "1") {
      console.log(statusJson.result);
      return;
    }

    if (
      !/pending|in progress|queue/i.test(statusJson.result) &&
      statusJson.status === "0"
    ) {
      throw new Error(`Celoscan proxy link failed: ${statusJson.result}`);
    }
  }

  throw new Error("Timed out waiting for Celoscan proxy link");
}

async function main() {
  const proxyAddress = getAddress(GOCLAIM_PROXY_ADDRESS);
  const implementationAddress = getAddress(GOCLAIM_IMPLEMENTATION_ADDRESS);

  const rawPk = process.env.APP_PRIVATE_KEY ?? process.env.DEPLOYER_PK;
  if (!rawPk) {
    throw new Error("APP_PRIVATE_KEY not found");
  }

  const account = privateKeyToAccount(
    (rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`) as Hex
  );
  const identityContract = getAddress(
    (process.env.IDENTITY_PROXY_ADDRESS ?? DEFAULT_IDENTITY) as Address
  );

  const goClaimArtifact = await hre.artifacts.readArtifact("GoClaim");
  const initData = encodeFunctionData({
    abi: goClaimArtifact.abi,
    functionName: "initialize",
    args: [account.address, account.address, identityContract],
  });

  console.log(`Verifying ERC1967 proxy at ${proxyAddress}...`);
  console.log(`Implementation: ${implementationAddress}`);

  await hre.run("verify:verify", {
    address: proxyAddress,
    constructorArguments: [implementationAddress, initData],
    contract: PROXY_ARTIFACT,
  });

  console.log("Full source verification succeeded on Celoscan.");

  await verifyProxyLinkOnCeloscan(proxyAddress, implementationAddress);

  console.log(
    `Celoscan: https://celoscan.io/address/${proxyAddress}#code`
  );
  console.log(
    `Sourcify: https://repo.sourcify.dev/contracts/full_match/42220/${proxyAddress.toLowerCase()}/`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
