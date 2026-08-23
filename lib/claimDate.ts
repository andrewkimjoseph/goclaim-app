/**
 * UTC calendar date at midnight for ClaimLog.claimedDate (UTC day bucket).
 * Multiple ClaimLog rows per user per day are allowed; on-chain eligibility
 * remains the once-per-period claim gate.
 */
export function utcClaimedDate(from: Date = new Date()): Date {
  return new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  );
}

export function utcClaimedDateKey(from: Date = new Date()): string {
  return utcClaimedDate(from).toISOString().slice(0, 10);
}
