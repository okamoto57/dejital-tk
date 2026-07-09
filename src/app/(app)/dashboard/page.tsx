import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores, resolveStoreId } from "@/lib/access";
import { getMonthlyBundle } from "@/lib/store-data";
import { computeLanding } from "@/lib/metrics";
import { yearMonthNow } from "@/lib/format";
import { TYPE_PROFILE } from "@/lib/theme";
import { DashboardView } from "@/components/dashboard-view";

export default async function DashboardPage({
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
  const landing = computeLanding(bundle.recordedDaysCount, bundle.monthlyTotals.actualSales, yearMonth);

  return (
    <DashboardView
      storeName={bundle.store.name}
      typeLabel={TYPE_PROFILE[bundle.store.type].label}
      targetF={bundle.store.targetF}
      targetL={bundle.store.targetL}
      monthlyTotals={bundle.monthlyTotals}
      landing={landing}
      flMetrics={bundle.flMetrics}
      flAlert={bundle.flAlert}
      radarData={bundle.radarData}
      radarScore={bundle.radarScore}
      pettyCashFoodSum={bundle.pettyCashAgg.foodSum}
      inventory={bundle.inventorySnapshot}
      laborBudgetAchieve={bundle.laborBudgetAchieve}
      googleScore={bundle.googleReputation?.score ?? null}
      googleReviews={bundle.googleReputation?.reviews ?? null}
      googleDelta={bundle.googleReputation ? bundle.googleReputation.score - bundle.googleReputation.scorePrev : null}
      tabelogScore={bundle.tabelogReputation?.score ?? null}
      tabelogReviews={bundle.tabelogReputation?.reviews ?? null}
      tabelogDelta={
        bundle.tabelogReputation ? bundle.tabelogReputation.score - bundle.tabelogReputation.scorePrev : null
      }
    />
  );
}
