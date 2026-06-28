"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import { ClaimHistoryTable } from "@/components/ClaimHistoryTable";
import { CopyAddress } from "@/components/CopyAddress";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SetupChecklist } from "@/components/SetupChecklist";
import { StreakBadge, StreakModal } from "@/components/StreakCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { copy, formatClaimSchedule } from "@/lib/copy";

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
  lifetimeGdClaimed?: string;
  claimStreak?: number;
  rootGdBalance?: string | null;
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

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOnboardingShown = useRef(false);
  const [claimSchedule] = useState(() => formatClaimSchedule());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(
        `/api/agent/status?timezone=${encodeURIComponent(tz)}`,
        { credentials: "include" }
      );
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
    if (!simpleSmartAccount || linkComplete) return;

    if (!autoOnboardingShown.current) {
      autoOnboardingShown.current = true;
      setShowOnboarding(true);
    }
  }, [simpleSmartAccount, linkComplete]);

  const showOnboardingModal = showOnboarding && !linkComplete;

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
        <div className="flex items-center gap-2 shrink-0">
          {linkComplete && (
            <StreakBadge
              streak={status.claimStreak ?? 0}
              onOpen={() => setShowStreakModal(true)}
            />
          )}
          <button
            onClick={handleLogout}
            className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
          >
            {copy.dashboard.signOut}
          </button>
        </div>
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
        </div>

        {!showOnboardingModal && (
          <SetupChecklist
            linkComplete={linkComplete}
            onFinishSetup={() => setShowOnboarding(true)}
          />
        )}

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
          <p className="text-xs font-display font-semibold text-shell">{copy.dashboard.totalGoClaims}</p>
          <p className="font-display font-extrabold text-3xl text-primary mt-2">
            {status.lifetimeClaims ?? 0}
          </p>
          {status.lastClaimedAt && (
            <p className="text-xs text-foreground/60 mt-1">
              {copy.dashboard.lastGoClaimed}:{" "}
              {new Date(status.lastClaimedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-display font-semibold text-shell">
            {copy.dashboard.totalGGoClaimed}
          </p>
          <p
            className="font-display font-extrabold text-3xl text-primary mt-2 truncate"
            title={status.lifetimeGdClaimed ?? "0"}
          >
            {status.lifetimeGdClaimed ?? "0"}
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-display font-semibold text-shell">
            {copy.dashboard.rootGdBalance}
          </p>
          <p
            className="font-display font-extrabold text-3xl text-primary mt-2 truncate"
            title={status.rootGdBalance ?? undefined}
          >
            {status.rootGdBalance ?? "—"}
          </p>
        </div>

        {simpleSmartAccount && (
          <details className="card group [&::-webkit-details-marker]:hidden">
            <summary className="text-xs font-display font-semibold text-shell cursor-pointer list-none flex items-center justify-between gap-3">
              <span className="min-w-0">{copy.dashboard.smartAccountLabel}</span>
              <span
                aria-hidden
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black rounded-brutal bg-white font-display font-bold text-lg leading-none text-foreground shadow-[2px_2px_0_0_#000000] group-open:bg-primary group-open:text-white transition-colors"
              >
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:block -mt-0.5">−</span>
              </span>
            </summary>
            <p className="text-xs text-foreground/60 mt-3 pt-3 border-t-2 border-black mb-2">
              {copy.dashboard.smartAccountHint}
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

        <ClaimHistoryTable
          logs={status.claimLogs ?? []}
          limit={3}
          viewAllHref="/history"
        />
      </main>

      {showOnboardingModal && simpleSmartAccount && (
        <OnboardingModal
          smartAccountAddress={simpleSmartAccount}
          rootAddress={status.rootAddress}
          linkComplete={linkComplete}
          onConnected={fetchStatus}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {linkComplete && (
        <StreakModal
          streak={status.claimStreak ?? 0}
          open={showStreakModal}
          onClose={() => setShowStreakModal(false)}
        />
      )}
    </div>
  );
}
