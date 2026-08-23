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
 * Ops grace days that bridge a streak gap without a ClaimLog row.
 * Override / extend with STREAK_BRIDGE_DATES=YYYY-MM-DD,YYYY-MM-DD
 */
const DEFAULT_STREAK_BRIDGE_DATE_KEYS = ["2026-08-23"];

export function getStreakBridgeDateKeys(): Set<string> {
  const keys = new Set(DEFAULT_STREAK_BRIDGE_DATE_KEYS);
  const raw = process.env.STREAK_BRIDGE_DATES?.trim();
  if (raw) {
    for (const part of raw.split(",")) {
      const key = part.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) keys.add(key);
    }
  }
  return keys;
}

/**
 * Bridge day counts only when a real success exists further back
 * (with only other bridge days in between) — avoids inflating streaks
 * for users who never claimed before the grace day.
 */
function bridgeContinuesStreak(
  cursor: string,
  successDays: Set<string>,
  bridgeDays: Set<string>,
  timeZone: string
): boolean {
  if (!bridgeDays.has(cursor)) return false;
  let peek = shiftLocalDateKey(cursor, -1, timeZone);
  while (bridgeDays.has(peek) && !successDays.has(peek)) {
    peek = shiftLocalDateKey(peek, -1, timeZone);
  }
  return successDays.has(peek);
}

/**
 * Consecutive local days with at least one successful GoClaim.
 *
 * Anchor (reference = today in timeZone):
 * - Claim today → count backward from today
 * - No claim today, claim yesterday → count from yesterday (grace before today's run)
 * - No claim yesterday → 0
 *
 * Streak bridge dates (e.g. 2026-08-23 ops miss) count when they sit between
 * real successes so the gap does not reset the streak.
 */
export function computeClaimStreak(
  successTimestamps: Date[],
  timeZone: string,
  now = new Date(),
  bridgeDays = getStreakBridgeDateKeys()
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
  } else if (
    bridgeDays.has(yesterdayKey) &&
    bridgeContinuesStreak(yesterdayKey, successDays, bridgeDays, timeZone)
  ) {
    // Viewing the day after a bridge with no claim yet — still credit from yesterday bridge
    // only if a prior success exists (handled by bridgeContinuesStreak).
    anchor = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  let cursor = anchor;
  while (true) {
    if (successDays.has(cursor)) {
      streak++;
      cursor = shiftLocalDateKey(cursor, -1, timeZone);
      continue;
    }
    if (bridgeContinuesStreak(cursor, successDays, bridgeDays, timeZone)) {
      streak++;
      cursor = shiftLocalDateKey(cursor, -1, timeZone);
      continue;
    }
    break;
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
