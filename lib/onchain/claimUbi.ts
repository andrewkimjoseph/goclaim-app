import { encodeFunctionData, formatUnits, type Address, type Hex } from "viem";
import { erc20Abi } from "./abis/erc20";
import { ubiSchemeAbi } from "./abis/ubiScheme";
import { appendDataSuffix } from "./attribution";
import {
  GOOD_DOLLAR_TOKEN_ADDRESS,
  UBI_SCHEME_PROXY_ADDRESS,
} from "./constants";
import { checkUbiClaimEligibility } from "./eligibility";
import { createSmartAccountClientFromPrivateKey } from "./smartAccountClient";

export type ClaimUbiResult =
  | {
      claimed: true;
      eoaAddress: Hex;
      smartAccountAddress: Hex;
      whitelistedRoot: Hex;
      entitlement: string;
      userOpHash: Hex;
      transactionHash: Hex;
    }
  | {
      claimed: false;
      eoaAddress: Hex;
      smartAccountAddress: Hex;
      whitelistedRoot: Hex;
      entitlement: "0";
      reason: "already_claimed";
    };

export async function claimUbi(
  privateKeyHex: Hex,
  rootAddress: Address
): Promise<ClaimUbiResult> {
  const eligibility = await checkUbiClaimEligibility(privateKeyHex);

  if (eligibility.status === "already_claimed") {
    return {
      claimed: false,
      eoaAddress: eligibility.eoaAddress,
      smartAccountAddress: eligibility.smartAccountAddress,
      whitelistedRoot: eligibility.whitelistedRoot,
      entitlement: "0",
      reason: "already_claimed",
    };
  }

  if (eligibility.status === "not_whitelisted") {
    throw new Error(
      "Smart account is not GoodDollar whitelisted (UBIScheme: not whitelisted)."
    );
  }

  if (eligibility.status === "no_entitlement") {
    throw new Error(
      "No UBI entitlement for this identity root (period not started or daily UBI not active)."
    );
  }

  const { smartAccountClient } =
    await createSmartAccountClientFromPrivateKey(privateKeyHex);

  const claimData = encodeFunctionData({
    abi: ubiSchemeAbi,
    functionName: "claim",
    args: [],
  });

  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [rootAddress, eligibility.entitlement],
  });

  const userOpHash = await smartAccountClient.sendUserOperation({
    calls: [
      {
        to: UBI_SCHEME_PROXY_ADDRESS,
        data: appendDataSuffix(claimData),
      },
      {
        to: GOOD_DOLLAR_TOKEN_ADDRESS,
        data: appendDataSuffix(transferData),
      },
    ],
  });

  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  if (!receipt.success) {
    throw new Error("User operation failed");
  }

  return {
    claimed: true,
    eoaAddress: eligibility.eoaAddress,
    smartAccountAddress: eligibility.smartAccountAddress,
    whitelistedRoot: eligibility.whitelistedRoot,
    entitlement: eligibility.entitlement.toString(),
    userOpHash,
    transactionHash: receipt.receipt.transactionHash,
  };
}

export function formatEntitlementGd(entitlementWei: string): string {
  return formatUnits(BigInt(entitlementWei), 18);
}
