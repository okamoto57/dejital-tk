"use client";

import { InventoryForm } from "./entry-forms";

export function InventoryView({
  storeId,
  yearMonth,
  initialBegin,
  initialEnd,
  previousEnd,
  purchaseFoodCost,
  pettyCashFoodSum,
  actualSales,
  targetF,
}: {
  storeId: string;
  yearMonth: string;
  initialBegin: number | null;
  initialEnd: number | null;
  previousEnd: number | null;
  purchaseFoodCost: number;
  pettyCashFoodSum: number;
  actualSales: number;
  targetF: number;
}) {
  return (
    <div className="space-y-4">
      <InventoryForm
        storeId={storeId}
        yearMonth={yearMonth}
        initialBegin={initialBegin}
        initialEnd={initialEnd}
        previousEnd={previousEnd}
        purchaseFoodCost={purchaseFoodCost}
        pettyCashFoodSum={pettyCashFoodSum}
        actualSales={actualSales}
        targetF={targetF}
      />
    </div>
  );
}
