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

/** scorePrev/reviewsDelta are written to the DB at save time from whatever
 * "previous month" reference the entry form saw *then*. If months are
 * entered out of order, or a prior month's figure is corrected afterward,
 * that stored delta goes stale. Recompute it live from the actual previous
 * month's snapshot instead of trusting the frozen stored fields. */
function withLiveDelta(rep: ReputationSnapshot | null, prev: ReputationSnapshot | null): ReputationSnapshot | null {
  if (!rep) return null;
  if (!prev) return { ...rep, scorePrev: rep.score, reviewsDelta: 0 };
  return { ...rep, scorePrev: prev.score, reviewsDelta: rep.reviews - prev.reviews };
}

type SnsMetricLike = { platform: string; metrics: string };

function parseSnsMetrics(records: SnsMetricLike[]) {
  return new Map(records.map((r) => [r.platform, JSON.parse(r.metrics) as Record<string, number>]));
}

/** Same staleness problem as reviews: recompute each platform's growth from
 * the actual previous month's follower/friend count rather than the value
 * frozen into the JSON blob when that month was saved. */
function liveSnsData(current: Map<string, Record<string, number>>, prev: Map<string, Record<string, number>>): SnsData {
  const growth = (platform: string, countKey: string) => {
    const currentVal = current.get(platform)?.[countKey] ?? 0;
    const prevVal = prev.get(platform)?.[countKey];
    return prevVal != null ? currentVal - prevVal : 0;
  };

  return {
    instagram: {
      followers: current.get("instagram")?.followers ?? 0,
      reach: current.get("instagram")?.reach ?? 0,
      engage: current.get("instagram")?.engage ?? 0,
      growth: growth("instagram", "followers"),
    },
    tiktok: {
      followers: current.get("tiktok")?.followers ?? 0,
      views: current.get("tiktok")?.views ?? 0,
      engage: current.get("tiktok")?.engage ?? 0,
      growth: growth("tiktok", "followers"),
    },
    line: {
      friends: current.get("line")?.friends ?? 0,
      reserve: current.get("line")?.reserve ?? 0,
      coupon: current.get("line")?.coupon ?? 0,
      growth: growth("line", "friends"),
    },
  };
}

interface RawMarketingInputs {
  gourmetRecords: { mediaName: string; cost: number; revenue: number; guests: number; score: number }[];
  snsRecords: SnsMetricLike[];
  snsRecordsPrev: SnsMetricLike[];
  googleRep: ReputationSnapshot | null;
  tabelogRep: ReputationSnapshot | null;
  dazhongRep: ReputationSnapshot | null;
  googleRepPrev: ReputationSnapshot | null;
  tabelogRepPrev: ReputationSnapshot | null;
  dazhongRepPrev: ReputationSnapshot | null;
}

/** Pure aggregation shared by the single-store and batched fetchers below. */
function buildMarketingData(raw: RawMarketingInputs) {
  const gourmetByName = new Map(raw.gourmetRecords.map((r) => [r.mediaName, r]));
  const gourmet: GourmetRow[] = GOURMET_MEDIA_NAMES.map((name) => {
    const r = gourmetByName.get(name);
    return { mediaName: name, cost: r?.cost ?? 0, revenue: r?.revenue ?? 0, guests: r?.guests ?? 0, score: r?.score ?? 0 };
  });

  const sns = liveSnsData(parseSnsMetrics(raw.snsRecords), parseSnsMetrics(raw.snsRecordsPrev));

  return {
    gourmet,
    sns,
    googleRep: withLiveDelta(raw.googleRep, raw.googleRepPrev),
    tabelogRep: withLiveDelta(raw.tabelogRep, raw.tabelogRepPrev),
    dazhongRep: withLiveDelta(raw.dazhongRep, raw.dazhongRepPrev),
  };
}

export async function getMarketingData(storeId: string, yearMonth: string) {
  const prevMonth = previousYearMonth(yearMonth);
  const [gourmetRecords, snsRecords, snsRecordsPrev, googleRep, tabelogRep, dazhongRep, googleRepPrev, tabelogRepPrev, dazhongRepPrev] =
    await Promise.all([
      prisma.gourmetMediaRecord.findMany({ where: { storeId, yearMonth } }),
      prisma.snsMetric.findMany({ where: { storeId, yearMonth } }),
      prisma.snsMetric.findMany({ where: { storeId, yearMonth: prevMonth } }),
      prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "GOOGLE" } } }),
      prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "TABELOG" } } }),
      prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "DAZHONG" } } }),
      prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth: prevMonth, source: "GOOGLE" } } }),
      prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth: prevMonth, source: "TABELOG" } } }),
      prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth: prevMonth, source: "DAZHONG" } } }),
    ]);

  return buildMarketingData({
    gourmetRecords,
    snsRecords,
    snsRecordsPrev,
    googleRep,
    tabelogRep,
    dazhongRep,
    googleRepPrev,
    tabelogRepPrev,
    dazhongRepPrev,
  });
}

/** Same result as calling getMarketingData() once per store, but fetches each
 * table with a single `storeId IN (...)` query instead of one round-trip per
 * store — used by the SNS全店比較 page (24 stores x many queries otherwise). */
export async function getMarketingDataForStores(storeIds: string[], yearMonth: string) {
  const prevMonth = previousYearMonth(yearMonth);
  const [gourmetAll, snsAll, snsAllPrev, googleAll, tabelogAll, dazhongAll, googleAllPrev, tabelogAllPrev, dazhongAllPrev] =
    await Promise.all([
      prisma.gourmetMediaRecord.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
      prisma.snsMetric.findMany({ where: { storeId: { in: storeIds }, yearMonth } }),
      prisma.snsMetric.findMany({ where: { storeId: { in: storeIds }, yearMonth: prevMonth } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "GOOGLE" } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "TABELOG" } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth, source: "DAZHONG" } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth: prevMonth, source: "GOOGLE" } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth: prevMonth, source: "TABELOG" } }),
      prisma.reputationSnapshot.findMany({ where: { storeId: { in: storeIds }, yearMonth: prevMonth, source: "DAZHONG" } }),
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
  const snsPrevByStore = groupByStore(snsAllPrev);
  const googleByStore = new Map(googleAll.map((r) => [r.storeId, r]));
  const tabelogByStore = new Map(tabelogAll.map((r) => [r.storeId, r]));
  const dazhongByStore = new Map(dazhongAll.map((r) => [r.storeId, r]));
  const googlePrevByStore = new Map(googleAllPrev.map((r) => [r.storeId, r]));
  const tabelogPrevByStore = new Map(tabelogAllPrev.map((r) => [r.storeId, r]));
  const dazhongPrevByStore = new Map(dazhongAllPrev.map((r) => [r.storeId, r]));

  const result = new Map<string, ReturnType<typeof buildMarketingData>>();
  for (const storeId of storeIds) {
    result.set(
      storeId,
      buildMarketingData({
        gourmetRecords: gourmetByStore.get(storeId) ?? [],
        snsRecords: snsByStore.get(storeId) ?? [],
        snsRecordsPrev: snsPrevByStore.get(storeId) ?? [],
        googleRep: googleByStore.get(storeId) ?? null,
        tabelogRep: tabelogByStore.get(storeId) ?? null,
        dazhongRep: dazhongByStore.get(storeId) ?? null,
        googleRepPrev: googlePrevByStore.get(storeId) ?? null,
        tabelogRepPrev: tabelogPrevByStore.get(storeId) ?? null,
        dazhongRepPrev: dazhongPrevByStore.get(storeId) ?? null,
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
