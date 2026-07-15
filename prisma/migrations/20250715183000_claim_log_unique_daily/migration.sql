-- ClaimLog: one row per user per UTC calendar day
-- Run `npm run dedupe:daily-claim-logs` BEFORE applying this migration if
-- duplicate (userId, day) rows already exist; otherwise the unique index fails.

ALTER TABLE "ClaimLog" ADD COLUMN "claimedDate" DATE;

UPDATE "ClaimLog"
SET "claimedDate" = (("claimedAt" AT TIME ZONE 'UTC')::date);

ALTER TABLE "ClaimLog" ALTER COLUMN "claimedDate" SET NOT NULL;

CREATE UNIQUE INDEX "ClaimLog_userId_claimedDate_key" ON "ClaimLog"("userId", "claimedDate");

CREATE INDEX "ClaimLog_userId_claimedDate_idx" ON "ClaimLog"("userId", "claimedDate");
