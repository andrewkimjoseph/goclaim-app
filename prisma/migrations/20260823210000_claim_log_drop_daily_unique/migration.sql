-- Allow multiple ClaimLog rows per user per UTC calendar day.
-- On-chain GoodDollar eligibility remains the once-per-period gate.

DROP INDEX IF EXISTS "ClaimLog_userId_claimedDate_key";
