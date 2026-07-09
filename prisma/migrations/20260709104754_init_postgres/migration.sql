-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HQ_ADMIN', 'STORE_MANAGER');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('ramen', 'yakiniku', 'spa', 'sweets', 'dining', 'ck');

-- CreateEnum
CREATE TYPE "InOut" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ReputationSource" AS ENUM ('GOOGLE', 'TABELOG', 'DAZHONG');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "StoreType" NOT NULL,
    "targetF" DOUBLE PRECISION NOT NULL,
    "targetL" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "storeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "budgetSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualSales" DOUBLE PRECISION,
    "foodCost" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "customers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySnapshot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "beginInventory" DOUBLE PRECISION NOT NULL,
    "endInventory" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashEntry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "inout" "InOut" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payee" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "isFood" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PettyCashEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashOpening" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "opening" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PettyCashOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GourmetMediaRecord" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "mediaName" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "guests" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GourmetMediaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnsMetric" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,

    CONSTRAINT "SnsMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationSnapshot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "source" "ReputationSource" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scorePrev" DOUBLE PRECISION NOT NULL,
    "reviews" INTEGER NOT NULL,
    "reviewsDelta" INTEGER NOT NULL,
    "extra" TEXT NOT NULL,

    CONSTRAINT "ReputationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_storeId_date_key" ON "DailyRecord"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySnapshot_storeId_yearMonth_key" ON "InventorySnapshot"("storeId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashOpening_storeId_yearMonth_key" ON "PettyCashOpening"("storeId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "GourmetMediaRecord_storeId_yearMonth_mediaName_key" ON "GourmetMediaRecord"("storeId", "yearMonth", "mediaName");

-- CreateIndex
CREATE UNIQUE INDEX "SnsMetric_storeId_yearMonth_platform_key" ON "SnsMetric"("storeId", "yearMonth", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationSnapshot_storeId_yearMonth_source_key" ON "ReputationSnapshot"("storeId", "yearMonth", "source");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecord" ADD CONSTRAINT "DailyRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashEntry" ADD CONSTRAINT "PettyCashEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashOpening" ADD CONSTRAINT "PettyCashOpening_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GourmetMediaRecord" ADD CONSTRAINT "GourmetMediaRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnsMetric" ADD CONSTRAINT "SnsMetric_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationSnapshot" ADD CONSTRAINT "ReputationSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
