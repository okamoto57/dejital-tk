import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { yearMonthNow } from "@/lib/format";
import { getMarketingDataForStores, parseGoogleMeo } from "@/lib/marketing-data";
import { DAZHONG_STORES } from "@/lib/theme";
import { SocialCompareView, type SocialRow } from "@/components/social-compare-view";

export default async function SocialComparePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HQ_ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const yearMonth = params.month ?? yearMonthNow();

  const stores = await prisma.store.findMany({ orderBy: { sortOrder: "asc" } });
  const dataByStore = await getMarketingDataForStores(stores.map((s) => s.id), yearMonth);

  const rows: SocialRow[] = stores.map((store) => {
    const { sns, googleRep, tabelogRep, dazhongRep } = dataByStore.get(store.id)!;
    const meo = parseGoogleMeo(googleRep?.extra);
    const tracksDazhong = DAZHONG_STORES.includes(store.name);

    return {
      storeId: store.id,
      name: store.name,
      tracksDazhong,
      google: googleRep
        ? {
            score: googleRep.score,
            scorePrev: googleRep.scorePrev,
            reviews: googleRep.reviews,
            reviewsDelta: googleRep.reviewsDelta,
            meoRank: meo.meoRank,
            meoTotal: meo.meoTotal,
          }
        : null,
      tabelog: tabelogRep
        ? { score: tabelogRep.score, scorePrev: tabelogRep.scorePrev, reviews: tabelogRep.reviews, reviewsDelta: tabelogRep.reviewsDelta }
        : null,
      dazhong: dazhongRep
        ? { score: dazhongRep.score, scorePrev: dazhongRep.scorePrev, reviews: dazhongRep.reviews, reviewsDelta: dazhongRep.reviewsDelta }
        : null,
      instagramFollowers: sns.instagram.followers,
      instagramGrowth: sns.instagram.growth,
      lineFriends: sns.line.friends,
      lineGrowth: sns.line.growth,
    };
  });

  return <SocialCompareView rows={rows} yearMonth={yearMonth} />;
}
