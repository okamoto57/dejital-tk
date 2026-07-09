import type { ReputationSnapshot } from "@prisma/client";
import { prisma } from "./prisma";
import { previousYearMonth } from "./metrics";
import type { GourmetRow, SnsData } from "@/components/marketing-view";

export const GOURMET_MEDIA_NAMES = ["ホットペッパー", "食べログ", "Retty", "ぐるなび", "大衆点評"];

export interface GoogleMeo {
  meoRank: number | null;
  meoTotal: number | null;
}

export function parseGoogleMeo(extra: string | undefined | null): GoogleMeo {
  if (!extra) return { meoRank: null, meoTotal: null };
  try {
    const parsed = JSON.parse(extra) as { meoRank?: number | null; meoTotal?: number | null };
    return { meoRank: parsed.meoRank ?? null, meoTotal: parsed.meoTotal ?? null };
  } catch {
    return { meoRank: null, meoTotal: null };
  }
}

interface RawMarketingInputs {
  gourmetRecords: { mediaName: string; cost: number; revenue: number; guests: number; score: number }[];
  snsRecords: { platform: string; metrics: string }[];
  googleRep: ReputationSnapshot | null;
  tabelogRep: ReputationSnapshot | null;
  dazhongRep: ReputationSnapshot | null;
}

/** Pure aggregation shared by the single-store and batched fetchers below. */
function buildMarketingData(raw: RawMarketingInputs) {
  const gourmetByName = new Map(raw.gourmetRecords.map((r) => [r.mediaName, r]));
  const gourmet: GourmetRow[] = GOURMET_MEDIA_NAMES.map((name) => {
    const r = gourmetByName.get(name);
    return { mediaName: name, cost: r?.cost ?? 0, revenue: r?.revenue ?? 0, guests: r?.guests ?? 0, score: r?.score ?? 0 };
  });

  const snsByPlatform = new Map(raw.snsRecords.map((r) => [r.platform, JSON.parse(r.metrics) as Record<string, number>]));
  const sns: SnsData = {
    instagram: {
      followers: snsByPlatform.get("instagram")?.followers ?? 0,
      reach: snsByPlatform.get("instagram")?.reach ?? 0,
      engage: snsByPlatform.get("instagram")?.engage ?? 0,
      growth: snsByPlatform.get("instagram")?.growth ?? 0,
    },
    tiktok: {
      followers: snsByPlatform.get("tiktok")?.followers ?? 0,
      views: snsByPlatform.get("tiktok")?.views ?? 0,
      engage: snsByPlatform.get("tiktok")?.engage ?? 0,
      growth: snsByPlatform.get("tiktok")?.growth ?? 0,
    },
    line: {
      friends: snsByPlatform.get("line")?.friends ?? 0,
      reserve: snsByPlatform.get("line")?.reserve ?? 0,
      coupon: snsByPlatform.get("line")?.coupon ?? 0,
      growth: snsByPlatform.get("line")?.growth ?? 0,
    },
  };

  return { gourmet, sns, googleRep: raw.googleRep, tabelogRep: raw.tabelogRep, dazhongRep: raw.dazhongRep };
}

export async function getMarketingData(storeId: string, yearMonth: string) {
  const [gourmetRecords, snsRecords, googleRep, tabelogRep, dazhongRep] = await Promise.all([
    prisma.gourmetMediaRecord.findMany({ where: { storeId, yearMonth } }),
    prisma.snsMetric.findMany({ where: { storeId, yearMonth } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "GOOGLE" } } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "TABELOG" } } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "DAZHONG" } } }),
  ]);

  return buildMarketingData({ gourmetRecords, snsRecords, googleRep, tabelogRep, dazhongRep });
}

/** Same result as calling getMarketingData() once per store, but fetches each
 * table with a single `storeId IN (...)` query instead of one round-trip per
 * store — used by the SNS全店比較 page (24 stores x 5 queries otherwise). */
export async function getMarketingDataForStores(storeIds: string[], yearMonth: string) {
  const [gourmetAll, snsAll, googleAll, tabelogAll, dazhongAll] = await Promise.all([
    prisma.gourmetMediaRecord.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
    prisma.snsMetric.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
    prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "GOOGLE" } }),
    prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "TABELOG" } }),
    prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "DAZHONG" } }),
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

  const gourmetByStore = groupByStore(gourmetAll);
  const snsByStore = groupByStore(snsAll);
  const googleByStore = new Map(googleAll.map((r) => [r.storeId, r]));
  const tabelogByStore = new Map(tabelogAll.map((r) => [r.storeId, r]));
  const dazhongByStore = new Map(dazhongAll.map((r) => [r.storeId, r]));

  const result = new Map<string, ReturnType<typeof buildMarketingData>>();
  for (const storeId of storeIds) {
    result.set(
      storeId,
      buildMarketingData({
        gourmetRecords: gourmetByStore.get(storeId) ?? [],
        snsRecords: snsByStore.get(storeId) ?? [],
        googleRep: googleByStore.get(storeId) ?? null,
        tabelogRep: tabelogByStore.get(storeId) ?? null,
        dazhongRep: dazhongByStore.get(storeId) ?? null,
      })
    );
  }
  return result;
}

export interface PreviousScoreRef {
  score: number;
  reviews: number;
}

export interface PreviousMarketingReference {
  google: PreviousScoreRef | null;
  tabelog: PreviousScoreRef | null;
  dazhong: PreviousScoreRef | null;
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  lineFriends: number | null;
}

/** Actual data recorded for the month before `yearMonth`, used so the entry
 * form can auto-derive "new this month" from real history instead of a
 * manually-typed delta that can drift out of sync. */
export async function getPreviousMarketingReference(storeId: string, yearMonth: string): Promise<PreviousMarketingReference> {
  const prevMonth = previousYearMonth(yearMonth);

  const [googlePrev, tabelogPrev, dazhongPrev, snsPrev] = await Promise.all([
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth: prevMonth, source: "GOOGLE" } } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth: prevMonth, source: "TABELOG" } } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth: prevMonth, source: "DAZHONG" } } }),
    prisma.snsMetric.findMany({ where: { storeId, yearMonth: prevMonth } }),
  ]);

  const snsPrevByPlatform = new Map(snsPrev.map((r) => [r.platform, JSON.parse(r.metrics) as Record<string, number>]));

  return {
    google: googlePrev ? { score: googlePrev.score, reviews: googlePrev.reviews } : null,
    tabelog: tabelogPrev ? { score: tabelogPrev.score, reviews: tabelogPrev.reviews } : null,
    dazhong: dazhongPrev ? { score: dazhongPrev.score, reviews: dazhongPrev.reviews } : null,
    instagramFollowers: snsPrevByPlatform.get("instagram")?.followers ?? null,
    tiktokFollowers: snsPrevByPlatform.get("tiktok")?.followers ?? null,
    lineFriends: snsPrevByPlatform.get("line")?.friends ?? null,
  };
}
