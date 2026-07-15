/**
 * UTC calendar date at midnight for ClaimLog uniqueness (one row per user per day).
 */
export function utcClaimedDate(from: Date = new Date()): Date {
  return new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  );
}

export function utcClaimedDateKey(from: Date = new Date()): string {
  return utcClaimedDate(from).toISOString().slice(0, 10);
}
