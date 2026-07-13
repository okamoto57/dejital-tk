export interface DailyRow {
  isoDate: string; // "YYYY-MM-DD"
  dateLabel: string; // "MM/DD"
  dowLabel: string; // "月".."日"
  budgetSales: number;
  laborBudget: number;
  actualSales: number | null;
  foodCost: number | null;
  // Raw 仕入れ input split (foodCost above is the derived tax-included
  // total computed from these two), used to pre-fill the entry forms.
  foodCostInfomart: number | null;
  foodCostOther: number | null;
  laborCost: number | null;
  customers: number | null;
  fRate: number | null;
  lRate: number | null;
  flRate: number | null;
  // Snapshot of the underlying DailyRecord's updatedAt at page-load time (or
  // null if no row exists yet). Bulk-edit forms send this back on save so the
  // server can detect if someone else updated the same day in the meantime.
  updatedAt: string | null;
}
