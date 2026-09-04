import { type Hex, zeroAddress } from "viem";
import { identityAbi } from "./abis/identity";
import { ubiSchemeAbi } from "./abis/ubiScheme";
import { IDENTITY_PROXY_ADDRESS, UBI_SCHEME_PROXY_ADDRESS } from "./constants";
import { publicClient } from "./config";
import { deriveGoClaimAccount } from "./deriveGoClaimAccount";

const SECONDS_PER_DAY = BigInt(86_400);

type EligibilityBase = {
  eoaAddress: Hex;
  goClaimAccountAddress: Hex;
  whitelistedRoot: Hex;
};

export type UbiSchemePauseState = {
  paused: boolean;
  currentDay: bigint;
  periodStart: bigint;
  dayRolled: boolean;
};

export type UbiClaimEligibility =
  | (EligibilityBase & { status: "scheme_paused"; entitlement: "0" })
  | (EligibilityBase & { status: "already_claimed"; entitlement: "0" })
  | (EligibilityBase & { status: "eligible"; entitlement: bigint })
  | (EligibilityBase & { status: "not_whitelisted"; entitlement: "0" })
  | (EligibilityBase & { status: "no_entitlement"; entitlement: "0" });

export function ubiSchemeDayRolled(
  currentDay: bigint,
  periodStart: bigint,
  nowSec = BigInt(Math.floor(Date.now() / 1000))
): boolean {
  const today = (nowSec - periodStart) / SECONDS_PER_DAY;
  return currentDay === today;
}

export async function getUbiSchemePauseState(): Promise<UbiSchemePauseState> {
  const [pausedResult, currentDayResult, periodStartResult] =
    await publicClient.multicall({
      contracts: [
        {
          address: UBI_SCHEME_PROXY_ADDRESS,
          abi: ubiSchemeAbi,
          functionName: "paused",
        },
        {
          address: UBI_SCHEME_PROXY_ADDRESS,
          abi: ubiSchemeAbi,
          functionName: "currentDay",
        },
        {
          address: UBI_SCHEME_PROXY_ADDRESS,
          abi: ubiSchemeAbi,
          functionName: "periodStart",
        },
      ],
    });

  if (pausedResult.status !== "success") {
    throw new Error("Failed to read paused from UBI scheme");
  }
  if (currentDayResult.status !== "success") {
    throw new Error("Failed to read currentDay from UBI scheme");
  }
  if (periodStartResult.status !== "success") {
    throw new Error("Failed to read periodStart from UBI scheme");
  }

  const currentDay = currentDayResult.result;
  const periodStart = periodStartResult.result;

  return {
    paused: pausedResult.result,
    currentDay,
    periodStart,
    dayRolled: ubiSchemeDayRolled(currentDay, periodStart),
  };
}

export async function checkUbiClaimEligibility(
  privateKeyHex: Hex
): Promise<UbiClaimEligibility> {
  const { eoaAddress, goClaimAccountAddress } =
    await deriveGoClaimAccount(privateKeyHex);

  const whitelistedRoot = await publicClient.readContract({
    address: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "getWhitelistedRoot",
    args: [goClaimAccountAddress],
  });

  const base: EligibilityBase = {
    eoaAddress,
    goClaimAccountAddress,
    whitelistedRoot,
  };

  if (whitelistedRoot === zeroAddress) {
    return { ...base, status: "not_whitelisted", entitlement: "0" };
  }

  const [
    pausedResult,
    currentDayResult,
    periodStartResult,
    hasClaimedResult,
    entitlementResult,
  ] = await publicClient.multicall({
    contracts: [
      {
        address: UBI_SCHEME_PROXY_ADDRESS,
        abi: ubiSchemeAbi,
        functionName: "paused",
      },
      {
        address: UBI_SCHEME_PROXY_ADDRESS,
        abi: ubiSchemeAbi,
        functionName: "currentDay",
      },
      {
        address: UBI_SCHEME_PROXY_ADDRESS,
        abi: ubiSchemeAbi,
        functionName: "periodStart",
      },
      {
        address: UBI_SCHEME_PROXY_ADDRESS,
        abi: ubiSchemeAbi,
        functionName: "hasClaimed",
        args: [whitelistedRoot],
      },
      {
        address: UBI_SCHEME_PROXY_ADDRESS,
        abi: ubiSchemeAbi,
        functionName: "checkEntitlement",
        args: [whitelistedRoot],
      },
    ],
  });

  if (pausedResult.status !== "success") {
    throw new Error("Failed to read paused from UBI scheme");
  }
  if (pausedResult.result) {
    return { ...base, status: "scheme_paused", entitlement: "0" };
  }

  if (hasClaimedResult.status !== "success") {
    throw new Error("Failed to read hasClaimed from UBI scheme");
  }
  if (currentDayResult.status !== "success") {
    throw new Error("Failed to read currentDay from UBI scheme");
  }
  if (periodStartResult.status !== "success") {
    throw new Error("Failed to read periodStart from UBI scheme");
  }

  const dayRolled = ubiSchemeDayRolled(
    currentDayResult.result,
    periodStartResult.result
  );
  if (dayRolled && hasClaimedResult.result) {
    return { ...base, status: "already_claimed", entitlement: "0" };
  }

  if (entitlementResult.status !== "success") {
    throw new Error("Failed to read checkEntitlement from UBI scheme");
  }

  const entitlement = entitlementResult.result;

  if (entitlement === BigInt(0)) {
    return { ...base, status: "no_entitlement", entitlement: "0" };
  }

  return { ...base, status: "eligible", entitlement };
}

export async function getLinkStatus(
  goClaimAccountAddress: Hex,
  rootAddress: Hex
): Promise<{
  isWhitelisted: boolean;
  linkComplete: boolean;
  whitelistedRoot: Hex;
}> {
  const whitelistedRoot = await publicClient.readContract({
    address: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "getWhitelistedRoot",
    args: [goClaimAccountAddress],
  });

  const isWhitelisted = whitelistedRoot !== zeroAddress;
  const linkComplete =
    isWhitelisted &&
    whitelistedRoot.toLowerCase() === rootAddress.toLowerCase();

  return { isWhitelisted, linkComplete, whitelistedRoot };
}
