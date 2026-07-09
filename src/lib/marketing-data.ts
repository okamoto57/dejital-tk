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

export async function getMarketingData(storeId: string, yearMonth: string) {
  const [gourmetRecords, snsRecords, googleRep, tabelogRep, dazhongRep] = await Promise.all([
    prisma.gourmetMediaRecord.findMany({ where: { storeId, yearMonth } }),
    prisma.snsMetric.findMany({ where: { storeId, yearMonth } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "GOOGLE" } } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "TABELOG" } } }),
    prisma.reputationSnapshot.findUnique({ where: { storeId_yearMonth_source: { storeId, yearMonth, source: "DAZHONG" } } }),
  ]);

  const gourmetByName = new Map(gourmetRecords.map((r) => [r.mediaName, r]));
  const gourmet: GourmetRow[] = GOURMET_MEDIA_NAMES.map((name) => {
    const r = gourmetByName.get(name);
    return { mediaName: name, cost: r?.cost ?? 0, revenue: r?.revenue ?? 0, guests: r?.guests ?? 0, score: r?.score ?? 0 };
  });

  const snsByPlatform = new Map(snsRecords.map((r) => [r.platform, JSON.parse(r.metrics) as Record<string, number>]));
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

  return { gourmet, sns, googleRep, tabelogRep, dazhongRep };
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
