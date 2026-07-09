import { prisma } from "./prisma";
import { aggregatePettyCash, computeFlMetrics, isFlAlert, buildRadarData, radarScore, budgetAchievePct, previousYearMonth } from "./metrics";

export function monthRange(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

export async function getMonthlyBundle(storeId: string, yearMonth: string) {
  const { start, end } = monthRange(yearMonth);

  const [store, dailyRecords, inventorySnapshot, pettyCashEntries, pettyCashOpening, googleRep, tabelogRep] =
    await Promise.all([
      prisma.store.findUniqueOrThrow({ where: { id: storeId } }),
      prisma.dailyRecord.findMany({
        where: { storeId, date: { gte: start, lt: end } },
        orderBy: { date: "asc" },
      }),
      prisma.inventorySnapshot.findUnique({ where: { storeId_yearMonth: { storeId, yearMonth } } }),
      prisma.pettyCashEntry.findMany({
        where: { storeId, date: { gte: start, lt: end } },
        orderBy: { date: "asc" },
      }),
      prisma.pettyCashOpening.findUnique({ where: { storeId_yearMonth: { storeId, yearMonth } } }),
      prisma.reputationSnapshot.findUnique({
        where: { storeId_yearMonth_source: { storeId, yearMonth, source: "GOOGLE" } },
      }),
      prisma.reputationSnapshot.findUnique({
        where: { storeId_yearMonth_source: { storeId, yearMonth, source: "TABELOG" } },
      }),
    ]);

  const opening = pettyCashOpening?.opening ?? 0;
  const pettyCashAgg = aggregatePettyCash(
    pettyCashEntries.map((e) => ({
      amount: e.amount,
      inout: e.inout,
      category: e.category,
      isFood: e.isFood,
    })),
    opening
  );

  const budgetSales = dailyRecords.reduce((a, r) => a + r.budgetSales, 0);
  const laborBudget = dailyRecords.reduce((a, r) => a + r.laborBudget, 0);
  const actualSales = dailyRecords.reduce((a, r) => a + (r.actualSales ?? 0), 0);
  const foodCost = dailyRecords.reduce((a, r) => a + (r.foodCost ?? 0), 0);
  const laborCost = dailyRecords.reduce((a, r) => a + (r.laborCost ?? 0), 0);
  const customers = dailyRecords.reduce((a, r) => a + (r.customers ?? 0), 0);
  const recordedDaysCount = dailyRecords.filter((r) => r.actualSales != null).length;

  const flMetrics = computeFlMetrics({
    actualSales,
    budgetSales,
    foodCost,
    laborCost,
    beginInventory: inventorySnapshot?.beginInventory ?? 0,
    endInventory: inventorySnapshot?.endInventory ?? 0,
    pettyCashFoodSum: pettyCashAgg.foodSum,
    targetF: store.targetF,
    targetL: store.targetL,
  });

  const laborBudgetAchieve = budgetAchievePct(laborCost, laborBudget);

  const flAlert = isFlAlert(flMetrics, store.targetF, store.targetL);

  const radarData = buildRadarData({
    budgetAchieve: flMetrics.budgetAchieve,
    actualF: flMetrics.actualF,
    targetF: store.targetF,
    actualL: flMetrics.actualL,
    targetL: store.targetL,
    googleScore: googleRep?.score ?? 0,
  });

  return {
    store,
    dailyRecords,
    inventorySnapshot,
    pettyCashEntries,
    pettyCashOpening: opening,
    pettyCashAgg,
    monthlyTotals: { budgetSales, laborBudget, actualSales, foodCost, laborCost, customers },
    recordedDaysCount,
    laborBudgetAchieve,
    flMetrics,
    flAlert,
    radarData,
    radarScore: radarScore(radarData),
    googleReputation: googleRep,
    tabelogReputation: tabelogRep,
  };
}

/** The previous month's ending inventory, used to auto-fill this month's
 * beginning inventory (a physical count carries straight over). */
export async function getPreviousEndInventory(storeId: string, yearMonth: string): Promise<number | null> {
  const prevMonth = previousYearMonth(yearMonth);
  const prev = await prisma.inventorySnapshot.findUnique({
    where: { storeId_yearMonth: { storeId, yearMonth: prevMonth } },
  });
  return prev?.endInventory ?? null;
}
