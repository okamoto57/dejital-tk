import type { DailyRecord, InventorySnapshot, PettyCashEntry, PrCampaignRecord, ReputationSnapshot, Store } from "@prisma/client";
import { prisma } from "./prisma";
import { aggregatePettyCash, computeFlMetrics, isFlAlert, buildRadarData, radarScore, budgetAchievePct, previousYearMonth } from "./metrics";

export function monthRange(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

interface RawBundleInputs {
  dailyRecords: DailyRecord[];
  inventorySnapshot: InventorySnapshot | null;
  pettyCashEntries: PettyCashEntry[];
  pettyCashOpening: number;
  googleRep: ReputationSnapshot | null;
  tabelogRep: ReputationSnapshot | null;
  prCampaign: PrCampaignRecord | null;
}

/** Pure aggregation shared by the single-store and batched fetchers below:
 * turns already-fetched rows for one store into the computed FL/radar bundle. */
function buildBundle(store: Store, raw: RawBundleInputs) {
  const { dailyRecords, inventorySnapshot, pettyCashEntries, pettyCashOpening, googleRep, tabelogRep, prCampaign } = raw;

  const pettyCashAgg = aggregatePettyCash(
    pettyCashEntries.map((e) => ({
      amount: e.amount,
      inout: e.inout,
      category: e.category,
      isFood: e.isFood,
    })),
    pettyCashOpening
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
    prFee: prCampaign?.fee ?? 0,
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
    pettyCashOpening,
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
    prCampaign: { groups: prCampaign?.groups ?? 0, fee: prCampaign?.fee ?? 0 },
  };
}

export async function getMonthlyBundle(storeId: string, yearMonth: string) {
  const { start, end } = monthRange(yearMonth);

  const [store, dailyRecords, inventorySnapshot, pettyCashEntries, pettyCashOpening, googleRep, tabelogRep, prCampaign] =
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
      prisma.prCampaignRecord.findUnique({ where: { storeId_yearMonth: { storeId, yearMonth } } }),
    ]);

  return buildBundle(store, {
    dailyRecords,
    inventorySnapshot,
    pettyCashEntries,
    pettyCashOpening: pettyCashOpening?.opening ?? 0,
    googleRep,
    tabelogRep,
    prCampaign,
  });
}

/** Same result as calling getMonthlyBundle() once per store, but fetches each
 * table with a single `storeId IN (...)` query instead of one round-trip per
 * store — used by the all-store comparison pages (hq, social) where doing it
 * per-store means 7 queries x 24 stores fired at once. */
export async function getMonthlyBundlesForStores(stores: Store[], yearMonth: string) {
  const { start, end } = monthRange(yearMonth);
  const storeIds = stores.map((s) => s.id);

  const [dailyRecordsAll, inventorySnapshotsAll, pettyCashEntriesAll, pettyCashOpeningsAll, googleRepsAll, tabelogRepsAll, prCampaignsAll] =
    await Promise.all([
      prisma.dailyRecord.findMany({
        where: { storeId: { in: storeIds }, date: { gte: start, lt: end } },
        orderBy: { date: "asc" },
      }),
      prisma.inventorySnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
      prisma.pettyCashEntry.findMany({
        where: { storeId: { in: storeIds }, date: { gte: start, lt: end } },
        orderBy: { date: "asc" },
      }),
      prisma.pettyCashOpening.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "GOOGLE" } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "TABELOG" } }),
      prisma.prCampaignRecord.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
    ]);

  const groupByStore = <T extends { storeId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const bucket = map.get(row.storeId);
      if (bucket) bucket.push(row);
      else map.set(row.storeId, [row]);
    }
    return map;
  };

  const dailyByStore = groupByStore(dailyRecordsAll);
  const pettyCashByStore = groupByStore(pettyCashEntriesAll);
  const inventoryByStore = new Map(inventorySnapshotsAll.map((r) => [r.storeId, r]));
  const openingByStore = new Map(pettyCashOpeningsAll.map((r) => [r.storeId, r]));
  const googleByStore = new Map(googleRepsAll.map((r) => [r.storeId, r]));
  const tabelogByStore = new Map(tabelogRepsAll.map((r) => [r.storeId, r]));
  const prCampaignByStore = new Map(prCampaignsAll.map((r) => [r.storeId, r]));

  const result = new Map<string, ReturnType<typeof buildBundle>>();
  for (const store of stores) {
    result.set(
      store.id,
      buildBundle(store, {
        dailyRecords: dailyByStore.get(store.id) ?? [],
        inventorySnapshot: inventoryByStore.get(store.id) ?? null,
        pettyCashEntries: pettyCashByStore.get(store.id) ?? [],
        pettyCashOpening: openingByStore.get(store.id)?.opening ?? 0,
        googleRep: googleByStore.get(store.id) ?? null,
        tabelogRep: tabelogByStore.get(store.id) ?? null,
        prCampaign: prCampaignByStore.get(store.id) ?? null,
      })
    );
  }
  return result;
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
