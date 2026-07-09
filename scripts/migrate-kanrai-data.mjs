import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

const sqlite = new DatabaseSync(
  "C:\\Users\\ko198\\OneDrive\\デスクトップ\\claude\\prisma\\dev.db"
);
const prisma = new PrismaClient();

async function main() {
  const oldStore = sqlite.prepare(`SELECT * FROM "Store" WHERE name = ?`).get("神来高の原店");
  if (!oldStore) throw new Error("Store not found in SQLite");

  const newStore = await prisma.store.findUnique({ where: { name: "神来高の原店" } });
  if (!newStore) throw new Error("Store not found in Postgres");

  console.log(`Migrating from old store ${oldStore.id} to new store ${newStore.id}`);

  const dailyRecords = sqlite.prepare(`SELECT * FROM "DailyRecord" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of dailyRecords) {
    const date = new Date(r.date);
    await prisma.dailyRecord.upsert({
      where: { storeId_date: { storeId: newStore.id, date } },
      update: {
        budgetSales: r.budgetSales,
        laborBudget: r.laborBudget,
        actualSales: r.actualSales,
        foodCost: r.foodCost,
        laborCost: r.laborCost,
        customers: r.customers,
      },
      create: {
        storeId: newStore.id,
        date,
        budgetSales: r.budgetSales,
        laborBudget: r.laborBudget,
        actualSales: r.actualSales,
        foodCost: r.foodCost,
        laborCost: r.laborCost,
        customers: r.customers,
      },
    });
  }
  console.log(`Migrated ${dailyRecords.length} DailyRecord rows`);

  const invRows = sqlite.prepare(`SELECT * FROM "InventorySnapshot" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of invRows) {
    await prisma.inventorySnapshot.upsert({
      where: { storeId_yearMonth: { storeId: newStore.id, yearMonth: r.yearMonth } },
      update: { beginInventory: r.beginInventory, endInventory: r.endInventory },
      create: { storeId: newStore.id, yearMonth: r.yearMonth, beginInventory: r.beginInventory, endInventory: r.endInventory },
    });
  }
  console.log(`Migrated ${invRows.length} InventorySnapshot rows`);

  const pettyRows = sqlite.prepare(`SELECT * FROM "PettyCashEntry" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of pettyRows) {
    await prisma.pettyCashEntry.create({
      data: {
        storeId: newStore.id,
        date: new Date(r.date),
        category: r.category,
        inout: r.inout,
        amount: r.amount,
        payee: r.payee,
        note: r.note,
        isFood: !!r.isFood,
      },
    });
  }
  console.log(`Migrated ${pettyRows.length} PettyCashEntry rows`);

  const pettyOpenRows = sqlite.prepare(`SELECT * FROM "PettyCashOpening" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of pettyOpenRows) {
    await prisma.pettyCashOpening.upsert({
      where: { storeId_yearMonth: { storeId: newStore.id, yearMonth: r.yearMonth } },
      update: { opening: r.opening },
      create: { storeId: newStore.id, yearMonth: r.yearMonth, opening: r.opening },
    });
  }
  console.log(`Migrated ${pettyOpenRows.length} PettyCashOpening rows`);

  const repRows = sqlite.prepare(`SELECT * FROM "ReputationSnapshot" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of repRows) {
    await prisma.reputationSnapshot.upsert({
      where: { storeId_yearMonth_source: { storeId: newStore.id, yearMonth: r.yearMonth, source: r.source } },
      update: { score: r.score, scorePrev: r.scorePrev, reviews: r.reviews, reviewsDelta: r.reviewsDelta, extra: r.extra },
      create: {
        storeId: newStore.id,
        yearMonth: r.yearMonth,
        source: r.source,
        score: r.score,
        scorePrev: r.scorePrev,
        reviews: r.reviews,
        reviewsDelta: r.reviewsDelta,
        extra: r.extra,
      },
    });
  }
  console.log(`Migrated ${repRows.length} ReputationSnapshot rows`);

  const snsRows = sqlite.prepare(`SELECT * FROM "SnsMetric" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of snsRows) {
    await prisma.snsMetric.upsert({
      where: { storeId_yearMonth_platform: { storeId: newStore.id, yearMonth: r.yearMonth, platform: r.platform } },
      update: { metrics: r.metrics },
      create: { storeId: newStore.id, yearMonth: r.yearMonth, platform: r.platform, metrics: r.metrics },
    });
  }
  console.log(`Migrated ${snsRows.length} SnsMetric rows`);

  const gourmetRows = sqlite.prepare(`SELECT * FROM "GourmetMediaRecord" WHERE "storeId" = ?`).all(oldStore.id);
  for (const r of gourmetRows) {
    await prisma.gourmetMediaRecord.upsert({
      where: { storeId_yearMonth_mediaName: { storeId: newStore.id, yearMonth: r.yearMonth, mediaName: r.mediaName } },
      update: { cost: r.cost, revenue: r.revenue, guests: r.guests, score: r.score },
      create: { storeId: newStore.id, yearMonth: r.yearMonth, mediaName: r.mediaName, cost: r.cost, revenue: r.revenue, guests: r.guests, score: r.score },
    });
  }
  console.log(`Migrated ${gourmetRows.length} GourmetMediaRecord rows`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
