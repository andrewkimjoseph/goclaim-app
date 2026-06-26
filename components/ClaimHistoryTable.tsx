"use client";

import { useEffect, useState } from "react";
import { formatClaimStatus } from "@/lib/formatClaimStatus";
import { copy, formatClaimSchedule } from "@/lib/copy";

type ClaimLog = {
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
};

function statusClass(status: string) {
  if (status === "success") return "status-active";
  if (status === "failed") return "status-failed";
  return "status-pending";
}

export function ClaimHistoryTable({ logs }: ClaimHistoryTableProps) {
  const [claimSchedule, setClaimSchedule] = useState<string>(copy.time.claimScheduleUtc);

  useEffect(() => {
    setClaimSchedule(formatClaimSchedule());
  }, []);

  if (logs.length === 0) {
    return (
      <div className="card text-center text-foreground/60 text-sm">
        {copy.claimHistory.empty(claimSchedule)}
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <h3 className="font-display font-bold text-lg mb-3">
        {copy.claimHistory.title}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-foreground/60 border-b border-foreground/20">
            <th className="pb-2 pr-4">{copy.claimHistory.date}</th>
            <th className="pb-2 pr-4">{copy.claimHistory.status}</th>
            <th className="pb-2 pr-4">{copy.claimHistory.amount}</th>
            <th className="pb-2">{copy.claimHistory.receipt}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const display = formatClaimStatus(log.status, log.errorMsg);
            return (
              <tr
                key={log.id}
                className="border-b border-foreground/10 last:border-0"
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
                <td className="py-2 pr-4 whitespace-nowrap">
                  {log.transfer?.amountGd ? `${log.transfer.amountGd} G$` : "—"}
                </td>
                <td className="py-2">
                  {log.txHash ? (
                    <a
                      href={`https://celoscan.io/tx/${log.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      {copy.claimHistory.viewOnCeloscan}
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
  );
}
