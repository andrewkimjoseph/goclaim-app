/** Local calendar date key (yyyy-MM-dd) in the given IANA timezone. */
export function toLocalDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftLocalDateKey(dateKey: string, days: number, timeZone: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return toLocalDateKey(shifted, timeZone);
}

/**
 * Consecutive local days with at least one successful GoClaim.
 *
 * Anchor (reference = today in timeZone):
 * - Claim today → count backward from today
 * - No claim today, claim yesterday → count from yesterday (grace before today's run)
 * - No claim yesterday → 0
 *
 * Examples (America/New_York):
 * - Success Mon–Wed, viewing Wed → 3
 * - Success Mon–Tue only, viewing Wed before cron → 2
 * - Success Mon only, viewing Wed → 0
 */
export function computeClaimStreak(
  successTimestamps: Date[],
  timeZone: string,
  now = new Date()
): number {
  if (successTimestamps.length === 0) return 0;

  const successDays = new Set(
    successTimestamps.map((ts) => toLocalDateKey(ts, timeZone))
  );

  const todayKey = toLocalDateKey(now, timeZone);
  const yesterdayKey = shiftLocalDateKey(todayKey, -1, timeZone);

  let anchor: string | null = null;
  if (successDays.has(todayKey)) {
    anchor = todayKey;
  } else if (successDays.has(yesterdayKey)) {
    anchor = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  let cursor = anchor;
  while (successDays.has(cursor)) {
    streak++;
    cursor = shiftLocalDateKey(cursor, -1, timeZone);
  }

  return streak;
}

const IANA_TIMEZONE = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/;

export function parseTimezoneParam(raw: string | null): string {
  if (!raw) return "UTC";
  const trimmed = raw.trim();
  if (!IANA_TIMEZONE.test(trimmed)) return "UTC";
  try {
    Intl.DateTimeFormat("en-CA", { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return "UTC";
  }
}
