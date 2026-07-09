export interface DailyRow {
  isoDate: string; // "YYYY-MM-DD"
  dateLabel: string; // "MM/DD"
  dowLabel: string; // "月".."日"
  budgetSales: number;
  laborBudget: number;
  actualSales: number | null;
  foodCost: number | null;
  laborCost: number | null;
  customers: number | null;
  fRate: number | null;
  lRate: number | null;
  flRate: number | null;
}
