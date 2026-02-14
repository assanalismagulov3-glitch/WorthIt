-- CreateTable
CREATE TABLE "CalcItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalcItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalcItem_userId_kind_idx" ON "CalcItem"("userId", "kind");
