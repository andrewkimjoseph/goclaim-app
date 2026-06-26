"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import { ClaimHistoryTable } from "@/components/ClaimHistoryTable";
import { CopyAddress } from "@/components/CopyAddress";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ConnectAgentButton } from "@/components/ConnectAgentButton";
import { SetupChecklist } from "@/components/SetupChecklist";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { type Address } from "viem";
import { copy, formatClaimSchedule } from "@/lib/copy";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type AgentStatus = {
  hasAgent: boolean;
  rootAddress?: string;
  simpleSmartAccountAddress?: string;
  smartAccountAddress?: string;
  isCounterfactual?: boolean;
  isActive?: boolean;
  lastClaimedAt?: string | null;
  linkStatus?: "active" | "pending" | "linked_other";
  linkComplete?: boolean;
  lifetimeClaims?: number;
  claimLogs?: Array<{
    id: string;
    status: string;
    txHash: string | null;
    errorMsg: string | null;
    claimedAt: string;
    transfer?: {
      recipientAddress: string;
      amountWei: string;
      amountGd: string;
      txHash: string;
      userOpHash: string;
      transferredAt: string;
    } | null;
  }>;
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOnboardingShown = useRef(false);
  const [claimSchedule, setClaimSchedule] = useState<string>(
    copy.time.claimScheduleUtc
  );

  useEffect(() => {
    setClaimSchedule(formatClaimSchedule());
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/status", { credentials: "include" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load status");
      }
      const data = (await res.json()) as AgentStatus;
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const simpleSmartAccount =
    status?.simpleSmartAccountAddress ?? status?.smartAccountAddress;
  const linkComplete = status?.linkComplete ?? false;

  useEffect(() => {
    if (!simpleSmartAccount || linkComplete) {
      if (linkComplete) setShowOnboarding(false);
      return;
    }

    if (searchParams.get("onboarding") === "1") {
      setShowOnboarding(true);
      return;
    }

    if (!autoOnboardingShown.current) {
      autoOnboardingShown.current = true;
      setShowOnboarding(true);
    }
  }, [searchParams, simpleSmartAccount, linkComplete]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label={copy.dashboard.loading} />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-300">{error ?? "Something went wrong"}</p>
        <Link href="/" className="btn-primary">
          {copy.dashboard.backToHome}
        </Link>
      </div>
    );
  }

  if (!status.hasAgent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-foreground/70 text-center">{copy.dashboard.noAgent}</p>
        <button
          onClick={async () => {
            await fetch("/api/agent/create", {
              method: "POST",
              credentials: "include",
            });
            fetchStatus();
          }}
          className="btn-primary"
        >
          {copy.dashboard.setupGoClaim}
        </button>
      </div>
    );
  }

  const linkStatus = status.linkStatus ?? "pending";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col">
        <header className="px-4 py-4 flex items-center justify-between border-b border-foreground/20">
          <Link
            href="/"
            className="font-display font-extrabold text-xl text-foreground"
          >
            GoClaim
          </Link>
          <button
            onClick={handleLogout}
            className="text-foreground/70 text-sm hover:text-foreground"
          >
            {copy.dashboard.signOut}
          </button>
        </header>

        <main className="flex-1 px-4 py-6 space-y-4">
          <div className="space-y-1">
            <p className="font-display font-bold text-lg text-foreground tracking-tight">
              {linkComplete
                ? copy.dashboard.headlineActive
                : copy.dashboard.headlineSetup}
            </p>
            <p className="text-sm text-foreground/70">
              {linkComplete
                ? copy.dashboard.subheadActive(claimSchedule)
                : copy.dashboard.subheadSetup}
            </p>
            {status.rootAddress && (
              <p
                className="text-xs font-mono text-foreground/45 pt-0.5"
                title={status.rootAddress}
              >
                {truncateAddress(status.rootAddress)}
              </p>
            )}
          </div>

          {!linkComplete && (
            <div className="card border-primary/30 bg-primary/5">
              <p className="text-sm text-foreground/80 mb-3">
                {copy.dashboard.finishSetupBanner}
              </p>
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="btn-primary w-full text-sm"
              >
                {copy.dashboard.finishSetupCta}
              </button>
            </div>
          )}

          <SetupChecklist
            linkComplete={linkComplete}
            onFinishSetup={() => setShowOnboarding(true)}
          />

          <AgentStatusCard
            status={
              linkStatus === "active"
                ? "active"
                : linkStatus === "linked_other"
                  ? "linked_other"
                  : status.isActive
                    ? "pending"
                    : "inactive"
            }
          />

          <div className="card">
            <p className="text-xs text-foreground/60">{copy.dashboard.totalClaims}</p>
            <p className="font-display font-extrabold text-3xl text-primary">
              {status.lifetimeClaims ?? 0}
            </p>
            {status.lastClaimedAt && (
              <p className="text-xs text-foreground/60 mt-1">
                {copy.dashboard.lastClaimed}:{" "}
                {new Date(status.lastClaimedAt).toLocaleString()}
              </p>
            )}
          </div>

          {simpleSmartAccount && (
            <details className="card">
              <summary className="text-xs font-display font-semibold text-foreground/60 cursor-pointer">
                {copy.dashboard.botLabel}
              </summary>
              <p className="text-xs text-foreground/60 mt-2 mb-2">
                {copy.dashboard.botHint}
              </p>
              <CopyAddress address={simpleSmartAccount} />
            </details>
          )}

          {status.rootAddress && (
            <CopyAddress
              address={status.rootAddress}
              label={copy.dashboard.walletLabel}
            />
          )}

          {!linkComplete && simpleSmartAccount && (
            <ConnectAgentButton
              smartAccountAddress={simpleSmartAccount as Address}
              rootAddress={status.rootAddress as Address | undefined}
              onConnected={fetchStatus}
              className="btn-primary block text-center w-full"
              showTechnicalDetails
            />
          )}

          <ClaimHistoryTable logs={status.claimLogs ?? []} />
        </main>
      </div>

      {showOnboarding && simpleSmartAccount && (
        <OnboardingModal
          smartAccountAddress={simpleSmartAccount}
          isCounterfactual={status.isCounterfactual}
          rootAddress={status.rootAddress}
          linkComplete={linkComplete}
          onConnected={fetchStatus}
          onClose={() => {
            setShowOnboarding(false);
            router.replace("/dashboard");
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner label={copy.dashboard.loading} />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
