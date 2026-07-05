-- Rename AgentWallet table and smartAccountAddress columns to GoClaim naming
ALTER TABLE "AgentWallet" RENAME TO "GoClaimWallet";
ALTER TABLE "GoClaimWallet" RENAME COLUMN "smartAccountAddress" TO "goClaimAccountAddress";
ALTER TABLE "ConnectAccountLog" RENAME COLUMN "smartAccountAddress" TO "goClaimAccountAddress";
