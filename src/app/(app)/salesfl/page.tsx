import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores, resolveStoreId } from "@/lib/access";
import { getMonthlyBundle } from "@/lib/store-data";
import { yearMonthNow } from "@/lib/format";
import { buildDailyRows } from "@/lib/daily-rows";
import { SalesFlView } from "@/components/sales-fl-view";

export default async function SalesFlPage({
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
  const rows = buildDailyRows(bundle, yearMonth);

  return (
    <SalesFlView
      targetF={bundle.store.targetF}
      targetL={bundle.store.targetL}
      rows={rows}
      recordedDaysCount={bundle.recordedDaysCount}
      totals={{
        budgetSales: bundle.monthlyTotals.budgetSales,
        laborBudget: bundle.monthlyTotals.laborBudget,
        actualSales: bundle.monthlyTotals.actualSales,
        laborCost: bundle.monthlyTotals.laborCost,
        fRate: bundle.flMetrics.actualF,
        lRate: bundle.flMetrics.actualL,
        flRate: bundle.flMetrics.fl,
      }}
    />
  );
}
