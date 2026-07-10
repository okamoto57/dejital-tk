import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores, resolveStoreId } from "@/lib/access";
import { yearMonthNow } from "@/lib/format";
import { buildMarketingAdvice } from "@/lib/metrics";
import { getMarketingData, parseGoogleMeo } from "@/lib/marketing-data";
import { DAZHONG_STORES } from "@/lib/theme";
import { MarketingView } from "@/components/marketing-view";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const stores = await getAccessibleStores(session);
  const storeId = resolveStoreId(session, params.store, stores.map((s) => s.id));
  if (!storeId) {
    return <div className="text-sm text-slate-500">店舗が登録されていません。管理者にお問い合わせください。</div>;
  }

  const yearMonth = params.month ?? yearMonthNow();
  const { gourmet, sns, googleRep, tabelogRep, dazhongRep } = await getMarketingData(storeId, yearMonth);
  const meo = parseGoogleMeo(googleRep?.extra);
  const storeName = stores.find((s) => s.id === storeId)?.name;
  const tracksDazhong = storeName != null && DAZHONG_STORES.includes(storeName);

  const advice = buildMarketingAdvice({
    gourmetMedia: gourmet,
    googleScore: googleRep?.score ?? null,
    tiktokEngage: sns.tiktok.engage || null,
    lineFriends: sns.line.friends || null,
  });

  return (
    <MarketingView
      key={`${storeId}-${yearMonth}`}
      gourmet={gourmet}
      sns={sns}
      google={googleRep ? { ...googleRep, ...meo } : null}
      tabelog={tabelogRep}
      dazhong={tracksDazhong ? dazhongRep : undefined}
      advice={advice}
    />
  );
}
