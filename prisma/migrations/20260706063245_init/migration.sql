-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetF" REAL NOT NULL,
    "targetL" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "storeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "budgetSales" REAL NOT NULL,
    "actualSales" REAL NOT NULL,
    "foodCost" REAL NOT NULL,
    "laborCost" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventorySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "beginInventory" REAL NOT NULL,
    "endInventory" REAL NOT NULL,
    CONSTRAINT "InventorySnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PettyCashEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "inout" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payee" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "isFood" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PettyCashEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PettyCashOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "opening" REAL NOT NULL,
    CONSTRAINT "PettyCashOpening_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GourmetMediaRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "mediaName" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "revenue" REAL NOT NULL,
    "guests" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    CONSTRAINT "GourmetMediaRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SnsMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    CONSTRAINT "SnsMetric_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReputationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "scorePrev" REAL NOT NULL,
    "reviews" INTEGER NOT NULL,
    "reviewsDelta" INTEGER NOT NULL,
    "extra" TEXT NOT NULL,
    CONSTRAINT "ReputationSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
