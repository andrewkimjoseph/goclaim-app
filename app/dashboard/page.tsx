"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import { ClaimHistoryTable } from "@/components/ClaimHistoryTable";
import { DashboardOverviewCard } from "@/components/DashboardOverviewCard";
import { AddressesCard } from "@/components/AddressesCard";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SetupChecklist } from "@/components/SetupChecklist";
import { StreakModal } from "@/components/StreakCard";
import { SignOutConfirmModal } from "@/components/SignOutConfirmModal";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useAgentStatus, UnauthorizedError } from "@/lib/hooks/useAgentStatus";
import { copy, formatClaimSchedule } from "@/lib/copy";

export default function DashboardPage() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const autoOnboardingShown = useRef(false);
  const [claimSchedule] = useState(() => formatClaimSchedule());

  const { data: status, isLoading, error, refetch } = useAgentStatus(2);

  const fetchStatus = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (error instanceof UnauthorizedError) {
      router.push("/");
    }
  }, [error, router]);

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

  async function confirmSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/");
    } finally {
      setSigningOut(false);
    }
  }

  const linkStatus = status?.linkStatus ?? "pending";
  const showError = Boolean(error) && !(error instanceof UnauthorizedError);

  return (
    <div className="app-shell pb-6">
      <header className="header-bar" style={{ viewTransitionName: "site-header" }}>
        <Link href="/">
          <BrandLogo size="nav" />
        </Link>
        <Link
          href="/faqs"
          transitionTypes={["nav-forward"]}
          className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
        >
          {copy.faqs.headerButton}
        </Link>
      </header>

      <main className="flex-1 py-6 space-y-4">
        {isLoading && !status ? (
          <DashboardSkeleton />
        ) : showError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-red-200 text-center">
              {error?.message ?? "Something went wrong"}
            </p>
            <button onClick={() => fetchStatus()} className="btn-hero-primary">
              {copy.dashboard.retry}
            </button>
          </div>
        ) : !status?.hasAgent ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
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
        ) : (
          <>
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

            {linkComplete && (
              <>
                <DashboardOverviewCard
                  lifetimeClaims={status.lifetimeClaims ?? 0}
                  lifetimeGdClaimed={status.lifetimeGdClaimed ?? "0"}
                  rootGdBalance={status.rootGdBalance ?? null}
                  lastClaimedAt={status.lastClaimedAt}
                  streak={status.claimStreak ?? 0}
                  onStreakOpen={() => setShowStreakModal(true)}
                />

                <AddressesCard
                  rootAddress={status.rootAddress}
                  smartAccountAddress={simpleSmartAccount}
                />
              </>
            )}

            {linkComplete && (
              <ClaimHistoryTable
                logs={status.claimLogs ?? []}
                limit={1}
                viewAllHref="/history"
              />
            )}
          </>
        )}
      </main>

      <footer>
        <button
          onClick={() => setShowSignOutModal(true)}
          className="btn-hero-tertiary"
        >
          {copy.dashboard.signOut}
        </button>
      </footer>

      {showOnboardingModal && simpleSmartAccount && (
        <OnboardingModal
          smartAccountAddress={simpleSmartAccount}
          rootAddress={status?.rootAddress}
          linkComplete={linkComplete}
          onConnected={fetchStatus}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {linkComplete && (
        <StreakModal
          streak={status?.claimStreak ?? 0}
          open={showStreakModal}
          onClose={() => setShowStreakModal(false)}
        />
      )}

      <SignOutConfirmModal
        open={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={confirmSignOut}
        confirming={signingOut}
      />
    </div>
  );
}
