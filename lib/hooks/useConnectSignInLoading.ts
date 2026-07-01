"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { celo } from "wagmi/chains";
import type { WalletVerificationStatus } from "@/lib/hooks/useWalletVerification";

export function useConnectSignInLoading(
  isHero: boolean,
  verificationStatus: WalletVerificationStatus,
  enabled: boolean,
) {
  const [clientReady, setClientReady] = useState(false);
  const { isConnected, address, chainId, isConnecting, isReconnecting } = useAccount();

  useEffect(() => {
    setClientReady(true);
  }, []);

  if (!enabled || !isHero) return false;

  const walletLikelyConnected =
    isConnecting || isReconnecting || Boolean(isConnected && address);

  if (!clientReady) {
    return walletLikelyConnected;
  }

  if (!isConnected || !address) return false;
  if (chainId !== celo.id) return false;
  return verificationStatus === "loading";
}
