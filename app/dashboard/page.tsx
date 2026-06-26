"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import { ClaimHistoryTable } from "@/components/ClaimHistoryTable";
import { CopyAddress } from "@/components/CopyAddress";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ConnectAgentButton } from "@/components/ConnectAgentButton";
import { SetupChecklist } from "@/components/SetupChecklist";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { type Address } from "viem";
import { copy, formatClaimSchedule } from "@/lib/copy";
import { truncateAddress } from "@/lib/formatAddress";

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
      <div className="app-shell items-center justify-center">
        <LoadingSpinner label={copy.dashboard.loading} />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="app-shell items-center justify-center gap-4">
        <p className="text-red-200 text-center">{error ?? "Something went wrong"}</p>
        <Link href="/" className="btn-hero-primary">
          {copy.dashboard.backToHome}
        </Link>
      </div>
    );
  }

  if (!status.hasAgent) {
    return (
      <div className="app-shell items-center justify-center gap-4">
        <p className="text-white/80 text-center">{copy.dashboard.noAgent}</p>
        <button
          onClick={async () => {
            await fetch("/api/agent/create", {
              method: "POST",
              credentials: "include",
            });
            fetchStatus();
          }}
          className="btn-hero-primary"
        >
          {copy.dashboard.setupGoClaim}
        </button>
      </div>
    );
  }

  const linkStatus = status.linkStatus ?? "pending";

  return (
    <div className="app-shell pb-6">
      <header className="header-bar">
        <Link href="/">
          <BrandLogo size="nav" />
        </Link>
        <button
          onClick={handleLogout}
          className="text-white/80 text-sm font-display font-semibold hover:text-white"
        >
          {copy.dashboard.signOut}
        </button>
      </header>

      <main className="flex-1 py-6 space-y-4">
        <div className="space-y-1">
          <p className="font-display font-bold text-lg text-white tracking-tight">
            {linkComplete
              ? copy.dashboard.headlineActive
              : copy.dashboard.headlineSetup}
          </p>
          <p className="text-sm text-white/80">
            {linkComplete
              ? copy.dashboard.subheadActive(claimSchedule)
              : copy.dashboard.subheadSetup}
          </p>
          {status.rootAddress && (
            <p
              className="text-xs font-mono text-white/90 pt-0.5"
              title={status.rootAddress}
            >
              {truncateAddress(status.rootAddress)}
            </p>
          )}
        </div>

        {!linkComplete && (
          <div className="card">
            <p className="text-sm text-foreground/80 mb-3">
              {copy.dashboard.finishSetupBanner}
            </p>
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="btn-primary text-sm"
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
            <CopyAddress address={simpleSmartAccount} nested />
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
            className="btn-primary"
            showTechnicalDetails
          />
        )}

        <ClaimHistoryTable logs={status.claimLogs ?? []} />
      </main>

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
        <div className="app-shell items-center justify-center">
          <LoadingSpinner label={copy.dashboard.loading} />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
