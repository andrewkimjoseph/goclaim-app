"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { type Address } from "viem";
import { useAccount } from "wagmi";
import { useSiweAuth } from "@/lib/hooks/useSiweAuth";
import { useSession } from "@/lib/hooks/useSession";
import {
  useWalletVerification,
  type WalletVerificationStatus,
} from "@/lib/hooks/useWalletVerification";
import { copy } from "@/lib/copy";
import { truncateAddress } from "@/lib/formatAddress";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type ConnectSignInProps = {
  onSuccess?: () => void;
  label?: string;
  variant?: "default" | "hero";
};

function InlineSpinner({ className = "border-black/30 border-t-black" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${className}`}
      role="status"
      aria-hidden
    />
  );
}

function WalletStatusCard({
  displayAddress,
  accountName,
  verificationStatus,
  isHero,
}: {
  displayAddress?: string;
  accountName: string;
  verificationStatus: WalletVerificationStatus;
  isHero: boolean;
}) {
  const cardClass = isHero ? "card-paper" : "card";
  const hintClass = isHero ? "text-black/70" : "text-foreground/70";
  const addressClass = isHero ? "text-black" : "text-foreground";

  return (
    <div className={`${cardClass} min-w-0 overflow-hidden flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p
          className={`min-w-0 flex-1 text-xs font-display font-semibold uppercase tracking-wider ${
            isHero ? "text-black/50" : "text-foreground/60"
          }`}
        >
          {copy.auth.walletCardLabel}
        </p>
        {verificationStatus === "isWhitelistedRoot" && <VerifiedBadge />}
      </div>

      {verificationStatus === "loading" && (
        <p className={`text-xs ${hintClass} flex items-center gap-2`}>
          <InlineSpinner className={isHero ? "border-black/30 border-t-black" : "border-foreground/30 border-t-foreground"} />
          {copy.auth.checkingVerification}
        </p>
      )}

      <p
        className={`font-display font-bold text-lg truncate min-w-0 ${addressClass}`}
        title={displayAddress}
      >
        {displayAddress ? truncateAddress(displayAddress) : accountName}
      </p>

      {verificationStatus === "isLinkedWallet" && (
        <p className={`text-xs ${isHero ? "text-red-700" : "text-red-600"}`}>
          {copy.auth.linkedWalletHint}
        </p>
      )}
    </div>
  );
}

export function ConnectSignIn({
  onSuccess,
  label = copy.auth.connectWallet,
  variant = "default",
}: ConnectSignInProps) {
  const router = useRouter();
  const { signIn, isLoading, error, isConnected, address } = useSiweAuth();
  const { authenticated, rootAddress, checked, refresh } = useSession();
  const { address: walletAddress } = useAccount();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const displayAddress = walletAddress ?? address;
  const verificationAddress = walletAddress as Address | undefined;
  const {
    status: verificationStatus,
    generateFVLink,
    sdkReady,
    isRedirecting,
  } = useWalletVerification(verificationAddress);

  const walletMatchesSession =
    authenticated &&
    address &&
    rootAddress &&
    address.toLowerCase() === rootAddress.toLowerCase();

  const canSignIn = verificationStatus === "isWhitelistedRoot";

  async function goToDashboard() {
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/dashboard");
    }
  }

  async function handleGetVerified() {
    setVerificationError(null);
    setIsGeneratingLink(true);
    try {
      await generateFVLink();
    } catch (err) {
      setIsGeneratingLink(false);
      setVerificationError(
        err instanceof Error ? err.message : "Could not start verification"
      );
    }
  }

  const isHero = variant === "hero";
  const primaryBtn = "btn-primary";
  const secondaryBtn = isHero ? "btn-hero-secondary" : "btn-secondary";
  const ghostBtn = isHero ? "btn-hero-secondary" : "btn-ghost";
  const hintErrorClass = isHero ? "text-red-200" : "text-red-600";

  if (!checked) {
    return <LoadingSpinner label={copy.auth.checkingSession} />;
  }

  if (authenticated) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <button onClick={goToDashboard} className={primaryBtn}>
          {copy.auth.goToDashboard}
        </button>
        {isConnected && !walletMatchesSession && address && (
          <p className={`text-xs text-center ${hintErrorClass}`}>
            {copy.auth.walletMismatch}
          </p>
        )}
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;
            if (!connected) {
              return (
                <button onClick={openConnectModal} className={`${secondaryBtn} text-sm`}>
                  {copy.auth.connectToFinishSetup}
                </button>
              );
            }
            return (
              <button onClick={openAccountModal} className={`${ghostBtn} text-sm`}>
                {account.displayName}
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    );
  }

  const showGetVerified =
    walletAddress &&
    verificationStatus === "notVerified" &&
    sdkReady;

  const getVerifiedLabel = isGeneratingLink
    ? copy.auth.preparingVerification
    : isRedirecting
      ? copy.auth.redirectingVerification
      : copy.auth.getVerified;

  return (
    <div className="flex flex-col gap-3 w-full">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              className="w-full"
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {!connected ? (
                <button onClick={openConnectModal} className={primaryBtn}>
                  {label}
                </button>
              ) : chain.unsupported ? (
                <button onClick={openChainModal} className={secondaryBtn}>
                  {copy.auth.wrongNetwork}
                </button>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <WalletStatusCard
                    displayAddress={displayAddress}
                    accountName={account.displayName}
                    verificationStatus={verificationStatus}
                    isHero={isHero}
                  />

                  {showGetVerified && (
                    <button
                      type="button"
                      onClick={handleGetVerified}
                      disabled={isGeneratingLink || isRedirecting}
                      className={`${primaryBtn} text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2`}
                    >
                      {(isGeneratingLink || isRedirecting) && (
                        <InlineSpinner className="border-white/30 border-t-white" />
                      )}
                      {getVerifiedLabel}
                    </button>
                  )}

                  {canSignIn && (
                    <button
                      disabled={isLoading}
                      onClick={async () => {
                        const ok = await signIn();
                        if (ok) {
                          await refresh();
                          if (onSuccess) onSuccess();
                        }
                      }}
                      className={`${primaryBtn} disabled:opacity-50`}
                    >
                      {isLoading ? copy.auth.signingIn : copy.auth.signIn}
                    </button>
                  )}

                  {isHero ? (
                    <button onClick={openAccountModal} className="btn-hero-tertiary text-sm">
                      {copy.auth.changeWallet}
                    </button>
                  ) : (
                    <button onClick={openAccountModal} className={`${ghostBtn} text-sm`}>
                      {copy.auth.changeWallet}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>
      {(error || verificationError) && (
        <p className={`text-sm text-center ${hintErrorClass}`}>
          {error ?? verificationError}
        </p>
      )}
      {isConnected && !error && !verificationError && canSignIn && !isHero && (
        <p className="text-foreground/70 text-sm text-center">
          {copy.auth.signInHint}
        </p>
      )}
      {!isConnected && !error && !isHero && (
        <p className="text-foreground/60 text-xs text-center">
          {copy.auth.sessionHint}
        </p>
      )}
    </div>
  );
}
