"use client";

import Link from "next/link";
import { useState } from "react";
import { formatClaimStatus } from "@/lib/formatClaimStatus";
import { copy, formatClaimSchedule } from "@/lib/copy";

export type ClaimLog = {
  id: string;
  status: string;
  txHash: string | null;
  errorMsg: string | null;
  claimedAt: string;
  transfer?: {
    amountGd: string;
  } | null;
};

type ClaimHistoryTableProps = {
  logs: ClaimLog[];
  limit?: number;
  viewAllHref?: string;
};

function statusClass(status: string) {
  if (status === "success") return "status-active";
  if (status === "failed") return "status-failed";
  return "status-pending";
}

export function ClaimHistoryTable({
  logs,
  limit,
  viewAllHref,
}: ClaimHistoryTableProps) {
  const [claimSchedule] = useState(() => formatClaimSchedule());
  const visibleLogs = limit !== undefined ? logs.slice(0, limit) : logs;
  const showViewAll = viewAllHref !== undefined && logs.length > 1;

  if (logs.length === 0) {
    return (
      <div className="card">
        <h3 className="font-display font-bold text-lg mb-2">
          {copy.goClaimHistory.title}
        </h3>
        <p className="text-center text-foreground/60 text-sm">
          {copy.goClaimHistory.empty(claimSchedule)}
        </p>
      </div>
    );
  }

  const scrollClass =
    limit === undefined
      ? "overflow-x-auto overflow-y-auto max-h-[min(12rem,35vh)] min-h-0"
      : "overflow-x-auto";

  return (
    <div className="card flex flex-col">
      <h3 className="font-display font-bold text-lg mb-3 shrink-0">
        {copy.goClaimHistory.title}
      </h3>
      <div className={scrollClass}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-foreground/60 border-b-2 border-black">
              <th className="pb-2 pr-4">{copy.goClaimHistory.date}</th>
              <th className="pb-2 pr-4">{copy.goClaimHistory.status}</th>
              <th className="pb-2 pr-4">{copy.goClaimHistory.amount}</th>
              <th className="pb-2">{copy.goClaimHistory.receipt}</th>
            </tr>
          </thead>
          <tbody>
            {visibleLogs.map((log) => {
              const display = formatClaimStatus(log.status, log.errorMsg);
              return (
                <tr
                  key={log.id}
                  className="border-b border-black/10 last:border-0"
                >
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(log.claimedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={statusClass(log.status)} title={display.detail}>
                      {display.label}
                    </span>
                  </td>
                  <td className="py-2 pr-4 max-w-[7rem] truncate">
                    {log.transfer?.amountGd ?? "—"}
                  </td>
                  <td className="py-2">
                    {log.txHash ? (
                      <a
                        href={`https://celoscan.io/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        {copy.goClaimHistory.viewOnCeloscan}
                      </a>
                    ) : (
                      <span className="text-foreground/40 text-xs">
                        {display.detail ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showViewAll && (
        <Link
          href={viewAllHref}
          transitionTypes={["nav-forward"]}
          className="btn-secondary text-sm mt-4 text-center py-2"
        >
          {copy.goClaimHistory.viewAllHistory}
        </Link>
      )}
    </div>
  );
}
