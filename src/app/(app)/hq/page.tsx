import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyBundle } from "@/lib/store-data";
import { yearMonthNow } from "@/lib/format";
import { TYPE_PROFILE } from "@/lib/theme";
import { HqCompareView, type HqStoreRow } from "@/components/hq-compare-view";

export default async function HqPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HQ_ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const yearMonth = params.month ?? yearMonthNow();

  const stores = await prisma.store.findMany({ orderBy: { sortOrder: "asc" } });
  const bundles = await Promise.all(stores.map((s) => getMonthlyBundle(s.id, yearMonth)));

  const rows: HqStoreRow[] = bundles.map((b) => ({
    storeId: b.store.id,
    name: b.store.name,
    typeLabel: TYPE_PROFILE[b.store.type].label,
    actualSales: b.monthlyTotals.actualSales,
    budgetSales: b.monthlyTotals.budgetSales,
    budgetAchieve: b.flMetrics.budgetAchieve,
    actualF: b.flMetrics.actualF,
    actualL: b.flMetrics.actualL,
    fl: b.flMetrics.fl,
    flTarget: b.store.targetF + b.store.targetL,
    flAlert: b.flAlert,
  }));

  return <HqCompareView rows={rows} yearMonth={yearMonth} />;
}
