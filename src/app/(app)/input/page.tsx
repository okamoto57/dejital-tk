import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores, resolveStoreId } from "@/lib/access";
import { getMonthlyBundle } from "@/lib/store-data";
import { yearMonthNow } from "@/lib/format";
import { buildDailyRows } from "@/lib/daily-rows";
import { getMarketingData, getPreviousMarketingReference, parseGoogleMeo } from "@/lib/marketing-data";
import { DAZHONG_STORES } from "@/lib/theme";
import { DataEntryView } from "@/components/data-entry-view";

export default async function InputPage({
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
  const bundle = await getMonthlyBundle(storeId, yearMonth);
  const dailyRows = buildDailyRows(bundle, yearMonth);
  const { gourmet, sns, googleRep, tabelogRep, dazhongRep, tripadvisorRep } = await getMarketingData(storeId, yearMonth);
  const previous = await getPreviousMarketingReference(storeId, yearMonth);
  const meo = parseGoogleMeo(googleRep?.extra);

  return (
    <DataEntryView
      key={`${storeId}-${yearMonth}`}
      storeId={storeId}
      yearMonth={yearMonth}
      dailyRows={dailyRows}
      gourmet={gourmet}
      prCampaign={bundle.prCampaign}
      google={googleRep ? { ...googleRep, ...meo } : null}
      tabelog={tabelogRep}
      dazhong={bundle.store.name && DAZHONG_STORES.includes(bundle.store.name) ? dazhongRep : undefined}
      tripadvisor={tripadvisorRep}
      sns={sns}
      previous={previous}
    />
  );
}
