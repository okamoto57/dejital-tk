import type { getMonthlyBundle } from "./store-data";
import { daysInYearMonth } from "./metrics";
import type { DailyRow } from "./types";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

type MonthlyBundle = Awaited<ReturnType<typeof getMonthlyBundle>>;

/** Builds one row per calendar day of the month, merging existing DailyRecord
 * data (budget and/or actuals) with placeholder days that have neither yet. */
export function buildDailyRows(bundle: MonthlyBundle, yearMonth: string): DailyRow[] {
  const pettyCashFoodByDay = new Map<string, number>();
  for (const e of bundle.pettyCashEntries) {
    if (e.inout === "OUT" && e.isFood) {
      const key = e.date.toISOString().slice(0, 10);
      pettyCashFoodByDay.set(key, (pettyCashFoodByDay.get(key) ?? 0) + e.amount);
    }
  }

  const recordsByDate = new Map(bundle.dailyRecords.map((r) => [r.date.toISOString().slice(0, 10), r]));
  const totalDays = daysInYearMonth(yearMonth);
  const [y, m] = yearMonth.split("-").map(Number);

  return Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1;
    const dateObj = new Date(Date.UTC(y, m - 1, dayNum));
    const isoDate = dateObj.toISOString().slice(0, 10);
    const r = recordsByDate.get(isoDate);

    const budgetSales = r?.budgetSales ?? 0;
    const laborBudget = r?.laborBudget ?? 0;
    const actualSales = r?.actualSales ?? null;
    const rawFoodCost = r?.foodCost ?? null;
    const laborCost = r?.laborCost ?? null;
    const foodCost = rawFoodCost != null ? rawFoodCost + (pettyCashFoodByDay.get(isoDate) ?? 0) : null;

    const fRate = actualSales != null && actualSales > 0 && foodCost != null ? (foodCost / actualSales) * 100 : null;
    const lRate = actualSales != null && actualSales > 0 && laborCost != null ? (laborCost / actualSales) * 100 : null;
    const flRate = fRate != null && lRate != null ? fRate + lRate : null;

    return {
      isoDate,
      dateLabel: `${String(m).padStart(2, "0")}/${String(dayNum).padStart(2, "0")}`,
      dowLabel: DOW_LABELS[dateObj.getUTCDay()],
      budgetSales,
      laborBudget,
      actualSales,
      foodCost,
      laborCost,
      customers: r?.customers ?? null,
      fRate,
      lRate,
      flRate,
    };
  });
}
