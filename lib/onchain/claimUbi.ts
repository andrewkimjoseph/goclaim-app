import { encodeFunctionData, formatUnits, type Address, type Hex } from "viem";
import { celo } from "viem/chains";
import { erc20Abi } from "./abis/erc20";
import { goClaimAbi } from "./abis/goClaim";
import { ubiSchemeAbi } from "./abis/ubiScheme";
import {
  GOOD_DOLLAR_TOKEN_ADDRESS,
  GOCLAIM_PROXY_ADDRESS,
  UBI_SCHEME_PROXY_ADDRESS,
} from "./constants";
import { checkUbiClaimEligibility } from "./eligibility";
import {
  isGoClaimSigningConfigured,
  signTokenTransferredRequest,
  signUbiClaimedRequest,
} from "./goClaim/signatures";
import { createGoClaimAccountClientFromPrivateKey } from "./goClaimAccountClient";
import { requireGoClaimSigningInProduction } from "./goClaim/persistEventLog";

export type ClaimUbiResult =
  | {
      claimed: true;
      eoaAddress: Hex;
      goClaimAccountAddress: Hex;
      whitelistedRoot: Hex;
      entitlement: string;
      userOpHash: Hex;
      transactionHash: Hex;
      goClaimEventsLogged: boolean;
    }
  | {
      claimed: false;
      eoaAddress: Hex;
      goClaimAccountAddress: Hex;
      whitelistedRoot: Hex;
      entitlement: "0";
      reason: "already_claimed";
      goClaimEventsLogged: false;
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
      goClaimAccountAddress: eligibility.goClaimAccountAddress,
      whitelistedRoot: eligibility.whitelistedRoot,
      entitlement: "0",
      reason: "already_claimed",
      goClaimEventsLogged: false,
    };
  }

  if (eligibility.status === "not_whitelisted") {
    throw new Error(
      "GoClaim account is not GoodDollar whitelisted (UBIScheme: not whitelisted)."
    );
  }

  if (eligibility.status === "no_entitlement") {
    throw new Error(
      "No UBI entitlement for this identity root (period not started or daily UBI not active)."
    );
  }

  const { aa } = await createGoClaimAccountClientFromPrivateKey(privateKeyHex);

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

  const steps: Array<{
    kind: "contract" | "erc20";
    to: Address;
    data: Hex;
    description: string;
  }> = [
    {
      kind: "contract",
      to: UBI_SCHEME_PROXY_ADDRESS,
      data: claimData,
      description: "Claim daily UBI",
    },
    {
      kind: "erc20",
      to: GOOD_DOLLAR_TOKEN_ADDRESS,
      data: transferData,
      description: "Transfer G$ to root",
    },
  ];

  let goClaimEventsLogged = false;

  requireGoClaimSigningInProduction();
  if (isGoClaimSigningConfigured()) {
    goClaimEventsLogged = true;
    const goClaimAddress = GOCLAIM_PROXY_ADDRESS;
    const [ubiSigned, transferSigned] = await Promise.all([
      signUbiClaimedRequest(
        eligibility.goClaimAccountAddress,
        eligibility.whitelistedRoot,
        GOOD_DOLLAR_TOKEN_ADDRESS,
        eligibility.entitlement
      ),
      signTokenTransferredRequest(
        eligibility.goClaimAccountAddress,
        rootAddress,
        GOOD_DOLLAR_TOKEN_ADDRESS,
        eligibility.entitlement
      ),
    ]);

    const logUbiData = encodeFunctionData({
      abi: goClaimAbi,
      functionName: "logUbiClaimed",
      args: [
        eligibility.goClaimAccountAddress,
        eligibility.whitelistedRoot,
        GOOD_DOLLAR_TOKEN_ADDRESS,
        eligibility.entitlement,
        ubiSigned.nonce,
        ubiSigned.signature,
      ],
    });

    const logTransferData = encodeFunctionData({
      abi: goClaimAbi,
      functionName: "logTokenTransferred",
      args: [
        eligibility.goClaimAccountAddress,
        rootAddress,
        GOOD_DOLLAR_TOKEN_ADDRESS,
        eligibility.entitlement,
        transferSigned.nonce,
        transferSigned.signature,
      ],
    });

    steps.push(
      {
        kind: "contract",
        to: goClaimAddress,
        data: logUbiData,
        description: "Log UBI claimed",
      },
      {
        kind: "contract",
        to: goClaimAddress,
        data: logTransferData,
        description: "Log token transferred",
      }
    );
  }

  const result = await aa.sendPreparedFlow({
    preparedFlow: true,
    chainId: celo.id,
    from: aa.smartAccountAddress,
    summary: "GoClaim UBI claim",
    steps,
  });

  if (!result.success) {
    throw new Error("User operation failed");
  }

  return {
    claimed: true,
    eoaAddress: eligibility.eoaAddress,
    goClaimAccountAddress: eligibility.goClaimAccountAddress,
    whitelistedRoot: eligibility.whitelistedRoot,
    entitlement: eligibility.entitlement.toString(),
    userOpHash: result.userOpHashes[0]!,
    transactionHash: result.transactionHashes[0]!,
    goClaimEventsLogged,
  };
}

function truncateGdToTwoDecimals(value: string): string {
  const dot = value.indexOf(".");
  if (dot === -1) return value;

  const whole = value.slice(0, dot);
  const fraction = value.slice(dot + 1, dot + 3);
  if (!fraction || /^0+$/.test(fraction)) return whole;

  return `${whole}.${fraction.replace(/0+$/, "")}`;
}

const gdNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const gdWholeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatGdAmount(amountWei: string): string {
  const formatted = formatUnits(BigInt(amountWei), 18);
  const truncated = truncateGdToTwoDecimals(formatted) || "0";
  const value = Number(truncated);
  return Number.isFinite(value) ? gdNumberFormatter.format(value) : truncated;
}

/** Truncate fractional G$ (floor at token whole units) for dashboard headline stats. */
export function formatGdAmountWhole(amountWei: string): string {
  const whole = BigInt(amountWei) / BigInt(10) ** BigInt(18);
  const value = Number(whole);
  return Number.isFinite(value) ? gdWholeNumberFormatter.format(value) : whole.toString();
}

export function formatEntitlementGd(entitlementWei: string): string {
  return formatGdAmount(entitlementWei);
}
