-- CreateTable
CREATE TABLE "GoClaimAccountCreatedLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goClaimAccountAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoClaimAccountCreatedLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoClaimAccountConnectedLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goClaimAccountAddress" TEXT NOT NULL,
    "rootAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoClaimAccountConnectedLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoClaimUbiClaimedLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimLogId" TEXT NOT NULL,
    "goClaimAccountAddress" TEXT NOT NULL,
    "rootAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoClaimUbiClaimedLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoClaimTokenTransferredLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimLogId" TEXT NOT NULL,
    "goClaimAccountAddress" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoClaimTokenTransferredLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoClaimAccountCreatedLog_userId_key" ON "GoClaimAccountCreatedLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoClaimAccountConnectedLog_userId_key" ON "GoClaimAccountConnectedLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoClaimUbiClaimedLog_claimLogId_key" ON "GoClaimUbiClaimedLog"("claimLogId");

-- CreateIndex
CREATE UNIQUE INDEX "GoClaimTokenTransferredLog_claimLogId_key" ON "GoClaimTokenTransferredLog"("claimLogId");

-- AddForeignKey
ALTER TABLE "GoClaimAccountCreatedLog" ADD CONSTRAINT "GoClaimAccountCreatedLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoClaimAccountConnectedLog" ADD CONSTRAINT "GoClaimAccountConnectedLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoClaimUbiClaimedLog" ADD CONSTRAINT "GoClaimUbiClaimedLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoClaimUbiClaimedLog" ADD CONSTRAINT "GoClaimUbiClaimedLog_claimLogId_fkey" FOREIGN KEY ("claimLogId") REFERENCES "ClaimLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoClaimTokenTransferredLog" ADD CONSTRAINT "GoClaimTokenTransferredLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoClaimTokenTransferredLog" ADD CONSTRAINT "GoClaimTokenTransferredLog_claimLogId_fkey" FOREIGN KEY ("claimLogId") REFERENCES "ClaimLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
