"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ClaimHistoryTable,
  type ClaimLog,
} from "@/components/ClaimHistoryTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { copy } from "@/lib/copy";

type HistoryStatus = {
  hasAgent: boolean;
  claimLogs?: ClaimLog[];
};

export default function HistoryPage() {
  const router = useRouter();
  const [status, setStatus] = useState<HistoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/status?claimLogsLimit=100", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load history");
      }
      const data = (await res.json()) as HistoryStatus;
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading history");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
        <Link href="/dashboard" className="btn-hero-primary">
          {copy.goClaimHistory.backToDashboard}
        </Link>
      </div>
    );
  }

  if (!status.hasAgent) {
    return (
      <div className="app-shell items-center justify-center gap-4">
        <p className="text-white/80 text-center">{copy.dashboard.noAgent}</p>
        <Link href="/dashboard" className="btn-hero-primary">
          {copy.goClaimHistory.backToDashboard}
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell pb-6">
      <header className="header-bar">
        <Link href="/dashboard">
          <BrandLogo size="nav" />
        </Link>
        <Link
          href="/dashboard"
          className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
        >
          {copy.goClaimHistory.backToDashboard}
        </Link>
      </header>

      <main className="flex-1 py-6 space-y-4">
        <div className="space-y-1">
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
            {copy.goClaimHistory.title}
          </h1>
          <p className="text-sm text-white/80">{copy.goClaimHistory.pageSubtitle}</p>
        </div>

        <ClaimHistoryTable logs={status.claimLogs ?? []} />
      </main>
    </div>
  );
}
