"use client";

import { useCallback, useMemo, useState } from "react";
import { useIdentitySDK } from "@goodsdks/identity-sdk";
import { type Address, zeroAddress } from "viem";
import { useChainId, useReadContract } from "wagmi";
import { identityAbi } from "@/lib/onchain/abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "@/lib/onchain/constants";

export type WalletVerificationStatus =
  | "idle"
  | "loading"
  | "isWhitelistedRoot"
  | "isLinkedWallet"
  | "notVerified";

export function useWalletVerification(address: Address | undefined) {
  const chainId = useChainId();
  const identitySDK = useIdentitySDK("production");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    data: whitelistedRoot,
    isLoading,
    isFetching,
    refetch,
  } = useReadContract({
    address: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "getWhitelistedRoot",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const status: WalletVerificationStatus = useMemo(() => {
    if (!address) return "idle";
    if (isLoading || isFetching) return "loading";
    if (!whitelistedRoot || whitelistedRoot === zeroAddress) return "notVerified";
    if (whitelistedRoot.toLowerCase() === address.toLowerCase()) {
      return "isWhitelistedRoot";
    }
    return "isLinkedWallet";
  }, [address, isLoading, isFetching, whitelistedRoot]);

  const generateFVLink = useCallback(async () => {
    if (!identitySDK) {
      throw new Error("Identity SDK not initialized");
    }

    const link = await identitySDK.generateFVLink(
      false,
      window.location.href,
      chainId
    );

    if (!link) {
      throw new Error("No verification link generated");
    }

    setIsRedirecting(true);
    window.location.href = link;
  }, [identitySDK, chainId]);

  return {
    status,
    whitelistedRoot,
    generateFVLink,
    sdkReady: !!identitySDK,
    isRedirecting,
    refetch,
  };
}
