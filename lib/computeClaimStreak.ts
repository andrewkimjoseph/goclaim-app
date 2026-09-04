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
 * Anchor (walk back from today in timeZone):
 * - Success → start counting there
 * - UBI pause day → skip (does not consume the one-day grace)
 * - Streak-bridge day (e.g. 2026-08-23) → start there if a real success exists further back
 * - One non-success, non-pause day → grace (today's cron not run yet)
 * - Second real gap → 0
 *
 * Counting from the anchor backward:
 * - Success → increment
 * - Pause → continue, do not increment
 * - Bridge day → increment when it sits between real successes
 */
export function computeClaimStreak(
  successTimestamps: Date[],
  timeZone: string,
  now = new Date(),
  bridgeDays = getStreakBridgeDateKeys(),
  pauseDays: ReadonlySet<string> = new Set()
): number {
  if (successTimestamps.length === 0) return 0;

  const successDays = new Set(
    successTimestamps.map((ts) => toLocalDateKey(ts, timeZone))
  );

  const todayKey = toLocalDateKey(now, timeZone);

  let cursor = todayKey;
  let graceUsed = false;
  let anchor: string | null = null;

  while (anchor === null) {
    if (successDays.has(cursor)) {
      anchor = cursor;
      break;
    }
    if (pauseDays.has(cursor)) {
      cursor = shiftLocalDateKey(cursor, -1, timeZone);
      continue;
    }
    if (bridgeContinuesStreak(cursor, successDays, bridgeDays, timeZone)) {
      anchor = cursor;
      break;
    }
    if (!graceUsed) {
      graceUsed = true;
      cursor = shiftLocalDateKey(cursor, -1, timeZone);
      continue;
    }
    return 0;
  }

  if (!anchor) return 0;

  let streak = 0;
  cursor = anchor;
  while (true) {
    if (successDays.has(cursor)) {
      streak++;
      cursor = shiftLocalDateKey(cursor, -1, timeZone);
      continue;
    }
    if (pauseDays.has(cursor)) {
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
