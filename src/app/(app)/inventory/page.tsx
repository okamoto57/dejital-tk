import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores, resolveStoreId } from "@/lib/access";
import { getMonthlyBundle, getPreviousEndInventory } from "@/lib/store-data";
import { yearMonthNow } from "@/lib/format";
import { InventoryView } from "@/components/inventory-view";

export default async function InventoryPage({
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
  const previousEnd = await getPreviousEndInventory(storeId, yearMonth);

  return (
    <InventoryView
      key={`${storeId}-${yearMonth}`}
      storeId={storeId}
      yearMonth={yearMonth}
      initialBegin={bundle.inventorySnapshot?.beginInventory ?? null}
      initialEnd={bundle.inventorySnapshot?.endInventory ?? null}
      previousEnd={previousEnd}
      purchaseFoodCost={bundle.monthlyTotals.foodCost}
      pettyCashFoodSum={bundle.pettyCashAgg.foodSum}
      actualSales={bundle.monthlyTotals.actualSales}
      targetF={bundle.store.targetF}
    />
  );
}
