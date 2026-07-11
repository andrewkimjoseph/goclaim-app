"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { formatClaimStatus } from "@/lib/formatClaimStatus";
import { copy } from "@/lib/copy";
import {
  filterClaimLogsWithNumbers,
  type NumberedClaimRow,
} from "@/lib/filterClaimLogsByDays";

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
  /** Full claim count for reverse numbering in previews (e.g. lifetimeClaims). */
  totalCount?: number;
  /** When set, only show claims within this many local calendar days. */
  daysWindow?: number;
};

function statusClass(status: string) {
  if (status === "success") return "status-active";
  if (status === "failed") return "status-failed";
  return "status-pending";
}

function formatClaimDate(claimedAt: string) {
  return new Date(claimedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ClaimHistoryCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-3.5 pr-4 align-middle ${className}`}>{children}</td>
  );
}

function ClaimHistoryPreviewTable({ rows }: { rows: NumberedClaimRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-white">
        <tr className="text-left text-foreground/60 border-b-2 border-black">
          <th className="pb-3 pr-4">{copy.goClaimHistory.number}</th>
          <th className="pb-3 pr-4">{copy.goClaimHistory.date}</th>
          <th className="pb-3 pr-4">{copy.goClaimHistory.status}</th>
          <th className="pb-3 pr-4">{copy.goClaimHistory.amount}</th>
          <th className="pb-3">{copy.goClaimHistory.receipt}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ log, claimNumber }) => {
          const display = formatClaimStatus(log.status, log.errorMsg);
          return (
            <tr
              key={log.id}
              className="border-b border-black/10 last:border-0"
            >
              <ClaimHistoryCell className="text-primary tabular-nums font-medium">
                {claimNumber}
              </ClaimHistoryCell>
              <ClaimHistoryCell className="whitespace-nowrap">
                {formatClaimDate(log.claimedAt)}
              </ClaimHistoryCell>
              <ClaimHistoryCell>
                <span className={statusClass(log.status)} title={display.detail}>
                  {display.label}
                </span>
              </ClaimHistoryCell>
              <ClaimHistoryCell className="max-w-[7rem] truncate">
                {log.transfer?.amountGd ?? "—"}
              </ClaimHistoryCell>
              <ClaimHistoryCell className="pr-0">
                {log.txHash ? (
                  <a
                    href={`https://celoscan.io/tx/${log.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {copy.goClaimHistory.view}
                  </a>
                ) : (
                  <span className="text-foreground/40">
                    {display.detail ?? "—"}
                  </span>
                )}
              </ClaimHistoryCell>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function buildNumberedRows(
  logs: ClaimLog[],
  numberingTotal: number,
  limit?: number,
  daysWindow?: number
): NumberedClaimRow[] {
  if (daysWindow != null) {
    return filterClaimLogsWithNumbers(logs, numberingTotal, daysWindow);
  }

  const visibleLogs = limit !== undefined ? logs.slice(0, limit) : logs;
  return visibleLogs.map((log, index) => ({
    log,
    claimNumber: numberingTotal - index,
  }));
}

export function ClaimHistoryTable({
  logs,
  limit,
  viewAllHref,
  totalCount,
  daysWindow,
}: ClaimHistoryTableProps) {
  const isPreview = limit !== undefined || viewAllHref !== undefined;
  const numberingTotal = totalCount ?? logs.length;
  const rows = buildNumberedRows(logs, numberingTotal, limit, daysWindow);
  const showViewAll = viewAllHref !== undefined && logs.length > 1;
  const showTitle = isPreview;
  const needsScrollCap = isPreview && rows.length > 1;
  const scrollClass = needsScrollCap
    ? "overflow-x-auto overflow-y-auto max-h-[min(12rem,35vh)] min-h-0"
    : "overflow-x-auto";

  if (rows.length === 0) {
    return (
      <div className="card">
        {showTitle && (
          <h3 className="font-display font-bold text-lg mb-2">
            {copy.goClaimHistory.title}
          </h3>
        )}
        <p className="text-left text-foreground/60 text-sm">
          {copy.goClaimHistory.empty}
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        isPreview
          ? "card flex flex-col"
          : "card overflow-x-auto !pb-0"
      }
    >
      {showTitle && (
        <h3 className="font-display font-bold text-lg mb-3 shrink-0">
          {copy.goClaimHistory.title}
        </h3>
      )}
      {isPreview ? (
        <div className={scrollClass}>
          <ClaimHistoryPreviewTable rows={rows} />
        </div>
      ) : (
        <ClaimHistoryPreviewTable rows={rows} />
      )}
      {showViewAll && (
        <Link
          href={viewAllHref}
          transitionTypes={["nav-forward"]}
          className="btn-secondary text-sm mt-1 text-center py-2"
        >
          {copy.goClaimHistory.viewAllHistory}
        </Link>
      )}
    </div>
  );
}
