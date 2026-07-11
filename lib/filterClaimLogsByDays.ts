import type { ClaimLog } from "@/components/ClaimHistoryTable";

export type NumberedClaimRow = {
  log: ClaimLog;
  claimNumber: number;
};

export function isWithinLastCalendarDays(
  claimedAt: string,
  days: number,
  now = new Date()
): boolean {
  if (days <= 0) return false;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const claimTime = new Date(claimedAt).getTime();
  return claimTime >= start.getTime() && claimTime <= end.getTime();
}

export function filterClaimLogsWithNumbers(
  logs: ClaimLog[],
  totalCount: number,
  days: number,
  now = new Date()
): NumberedClaimRow[] {
  return logs
    .map((log, index) => ({
      log,
      claimNumber: totalCount - index,
    }))
    .filter(({ log }) => isWithinLastCalendarDays(log.claimedAt, days, now));
}
