import hre from "hardhat";
import { config as loadEnv } from "dotenv";
import { GOCLAIM_IMPLEMENTATION_ADDRESS } from "../constants";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env.local" });
loadEnv({ path: "../.env" });

async function main() {
  const implementationAddress = GOCLAIM_IMPLEMENTATION_ADDRESS;

  console.log(`Verifying GoClaim implementation at ${implementationAddress}...`);

  await hre.run("verify:verify", {
    address: implementationAddress,
    constructorArguments: [],
    contract: "contracts/GoClaim.sol:GoClaim",
  });

  console.log("Verification submitted successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
