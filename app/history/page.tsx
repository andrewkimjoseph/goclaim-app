"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ClaimHistoryTable } from "@/components/ClaimHistoryTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useGoClaimStatus, UnauthorizedError } from "@/lib/hooks/useGoClaimStatus";
import { useSession } from "@/lib/hooks/useSession";
import { copy } from "@/lib/copy";

export default function HistoryPage() {
  const router = useRouter();
  const { authenticated, checked, refresh } = useSession();
  const { data: status, isLoading, error, refetch } = useGoClaimStatus(100, {
    enabled: checked && authenticated,
  });

  useEffect(() => {
    if (checked && !authenticated) {
      void refresh();
    }
  }, [checked, authenticated, refresh]);

  useEffect(() => {
    if (error instanceof UnauthorizedError) {
      router.push("/");
    }
  }, [error, router]);

  const showError = Boolean(error) && !(error instanceof UnauthorizedError);
  const isInitialLoad = isLoading && !status;

  if (!checked || !authenticated || isInitialLoad) {
    return (
      <div className="app-shell items-center justify-center">
        <LoadingSpinner
          label={
            !checked || !authenticated
              ? copy.auth.checkingSession
              : copy.dashboard.loading
          }
        />
      </div>
    );
  }

  return (
    <div className="app-shell app-shell-pinned">
      <header className="header-bar" style={{ viewTransitionName: "site-header" }}>
        <Link href="/dashboard" transitionTypes={["nav-back"]}>
          <BrandLogo size="nav" />
        </Link>
        <Link
          href="/dashboard"
          transitionTypes={["nav-back"]}
          className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
        >
          {copy.goClaimHistory.backToDashboard}
        </Link>
      </header>

      <main className="app-shell-scroll py-6 space-y-4">
        <div className="space-y-1">
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
            {copy.goClaimHistory.title}
          </h1>
          {status?.hasGoClaimAccount && !isLoading && (
            <p className="text-sm text-white/80 inline-flex items-center gap-1 flex-wrap">
              <span className="inline-flex items-center gap-1">
                {status.lifetimeClaims ?? 0}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/flame.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0"
                  aria-hidden
                />
                {copy.goClaimHistory.goClaimsLabel}
              </span>
              {copy.goClaimHistory.pageSummaryGdSent(status.lifetimeGdClaimed ?? "0")}
            </p>
          )}
        </div>

        {showError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-red-200 text-center">
              {error?.message ?? "Something went wrong"}
            </p>
            <button onClick={() => refetch()} className="btn-hero-primary">
              {copy.dashboard.retry}
            </button>
          </div>
        ) : !status?.hasGoClaimAccount ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-white/80 text-center">{copy.dashboard.noGoClaimAccount}</p>
            <Link
              href="/dashboard"
              transitionTypes={["nav-back"]}
              className="btn-hero-primary"
            >
              {copy.goClaimHistory.backToDashboard}
            </Link>
          </div>
        ) : (
          <ClaimHistoryTable
            logs={status.claimLogs ?? []}
            totalCount={status.lifetimeClaims}
            daysWindow={7}
          />
        )}
      </main>
    </div>
  );
}
