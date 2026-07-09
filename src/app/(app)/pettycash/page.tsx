import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores, resolveStoreId } from "@/lib/access";
import { getMonthlyBundle } from "@/lib/store-data";
import { yearMonthNow } from "@/lib/format";
import { PettyCashView, type PettyCashEntryRow } from "@/components/petty-cash-view";

export default async function PettyCashPage({
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

  const entries: PettyCashEntryRow[] = bundle.pettyCashEntries.map((e) => {
    const isoDate = e.date.toISOString().slice(0, 10);
    return {
      id: e.id,
      dateLabel: `${isoDate.slice(5, 7)}/${isoDate.slice(8, 10)}`,
      category: e.category,
      inout: e.inout,
      amount: e.amount,
      payee: e.payee,
      note: e.note,
      isFood: e.isFood,
    };
  });

  return (
    <PettyCashView
      storeId={storeId}
      yearMonth={yearMonth}
      opening={bundle.pettyCashOpening}
      entries={entries}
      actualF={bundle.flMetrics.actualF}
      targetF={bundle.store.targetF}
    />
  );
}
