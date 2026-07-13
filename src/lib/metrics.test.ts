import { describe, expect, it } from "vitest";
import {
  aggregatePettyCash,
  buildRadarData,
  computeFlMetrics,
  computeFoodCostTotal,
  computeLanding,
  daysInYearMonth,
  isFlAlert,
  previousYearMonth,
  radarScore,
} from "./metrics";

describe("aggregatePettyCash", () => {
  it("sums in/out and food-category amounts, and computes balance", () => {
    const result = aggregatePettyCash(
      [
        { amount: 10000, inout: "IN", category: "売上入金", isFood: false },
        { amount: 5000, inout: "OUT", category: "食材買い出し", isFood: true },
        { amount: 2000, inout: "OUT", category: "消耗品", isFood: false },
      ],
      30000
    );

    expect(result.inSum).toBe(10000);
    expect(result.outSum).toBe(7000);
    expect(result.foodSum).toBe(5000);
    expect(result.balance).toBe(30000 + 10000 - 7000);
    expect(result.byCategory).toEqual({ 食材買い出し: 5000, 消耗品: 2000 });
  });
});

describe("computeFlMetrics", () => {
  it("computes F/L/FL ratios including petty cash food and inventory adjustment", () => {
    const metrics = computeFlMetrics({
      actualSales: 1_000_000,
      budgetSales: 1_100_000,
      foodCost: 250_000,
      laborCost: 260_000,
      beginInventory: 50_000,
      endInventory: 40_000,
      pettyCashFoodSum: 20_000,
      prFee: 0,
      targetF: 30,
      targetL: 25,
    });

    // baseFoodCost (仕入ベース, includes petty cash) = 250000 + 20000 = 270000
    // totalFoodCost (棚卸調整後) = 270000 + 50000 - 40000 = 280000
    expect(metrics.baseFoodCost).toBe(270_000);
    expect(metrics.totalFoodCost).toBe(280_000);
    expect(metrics.actualF).toBeCloseTo(28, 5);
    expect(metrics.baseF).toBeCloseTo(27, 5);
    expect(metrics.actualL).toBeCloseTo(26, 5);
    expect(metrics.fl).toBeCloseTo(54, 5);
    expect(metrics.budgetAchieve).toBeCloseTo((1_000_000 / 1_100_000) * 100, 5);
    // fDelta is now purely the inventory-count adjustment: (50000-40000)/1000000*100 = 1
    expect(metrics.fDelta).toBeCloseTo(1, 5);
  });

  it("returns zeros when sales is zero, without dividing by zero", () => {
    const metrics = computeFlMetrics({
      actualSales: 0,
      budgetSales: 0,
      foodCost: 0,
      laborCost: 0,
      beginInventory: 0,
      endInventory: 0,
      pettyCashFoodSum: 0,
      prFee: 0,
      targetF: 30,
      targetL: 25,
    });

    expect(metrics.actualF).toBe(0);
    expect(metrics.actualL).toBe(0);
    expect(metrics.fl).toBe(0);
    expect(metrics.budgetAchieve).toBe(0);
  });

  it("adds PR-campaign fee to the F/L sales base but not to budgetAchieve", () => {
    const metrics = computeFlMetrics({
      actualSales: 800_000,
      budgetSales: 1_000_000,
      foodCost: 240_000,
      laborCost: 200_000,
      beginInventory: 0,
      endInventory: 0,
      pettyCashFoodSum: 0,
      prFee: 200_000,
      targetF: 30,
      targetL: 25,
    });

    // flSalesBase = 800000 + 200000 = 1000000
    expect(metrics.flSalesBase).toBe(1_000_000);
    expect(metrics.actualF).toBeCloseTo(24, 5); // 240000 / 1000000
    expect(metrics.actualL).toBeCloseTo(20, 5); // 200000 / 1000000
    // budgetAchieve stays based on raw actualSales, unaffected by prFee
    expect(metrics.budgetAchieve).toBeCloseTo(80, 5);
  });
});

describe("computeFoodCostTotal", () => {
  it("grosses up インフォマート(税抜) by 8% and adds その他 as-is", () => {
    // round(10000 * 1.08) + 500 = 10800 + 500 = 11300
    expect(computeFoodCostTotal(10_000, 500)).toBe(11_300);
  });

  it("treats a missing side as zero", () => {
    expect(computeFoodCostTotal(10_000, null)).toBe(10_800);
    expect(computeFoodCostTotal(null, 500)).toBe(500);
  });

  it("returns null only when both sides are unset (no purchase entry at all)", () => {
    expect(computeFoodCostTotal(null, null)).toBeNull();
  });

  it("rounds to the nearest yen", () => {
    // 333 * 1.08 = 359.64 -> rounds to 360
    expect(computeFoodCostTotal(333, 0)).toBe(360);
  });
});

describe("isFlAlert", () => {
  it("flags when actual F exceeds target by more than 1.5pt", () => {
    const metrics = computeFlMetrics({
      actualSales: 1_000_000,
      budgetSales: 1_000_000,
      foodCost: 320_000,
      laborCost: 250_000,
      beginInventory: 0,
      endInventory: 0,
      pettyCashFoodSum: 0,
      prFee: 0,
      targetF: 30,
      targetL: 25,
    });
    expect(isFlAlert(metrics, 30, 25)).toBe(true);
  });

  it("does not flag when within target range", () => {
    const metrics = computeFlMetrics({
      actualSales: 1_000_000,
      budgetSales: 1_000_000,
      foodCost: 300_000,
      laborCost: 250_000,
      beginInventory: 0,
      endInventory: 0,
      pettyCashFoodSum: 0,
      prFee: 0,
      targetF: 30,
      targetL: 25,
    });
    expect(isFlAlert(metrics, 30, 25)).toBe(false);
  });
});

describe("radar data & score", () => {
  it("builds 4-axis radar data clamped to [0, 120] and averages to a score", () => {
    const data = buildRadarData({
      budgetAchieve: 105,
      actualF: 30,
      targetF: 30,
      actualL: 25,
      targetL: 25,
      googleScore: 4.5,
    });

    expect(data).toHaveLength(4);
    expect(data.find((d) => d.axis === "予算達成")?.value).toBe(105);
    expect(data.find((d) => d.axis === "F健全度")?.value).toBe(100);
    expect(data.find((d) => d.axis === "Google評価")?.value).toBeCloseTo(90, 5);

    const score = radarScore(data);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(120);
  });

  it("clamps extreme health ratios instead of exceeding 120", () => {
    const data = buildRadarData({
      budgetAchieve: 50,
      actualF: 5, // far under target -> health ratio would exceed 120 uncapped
      targetF: 30,
      actualL: 25,
      targetL: 25,
      googleScore: 5,
    });
    const fHealth = data.find((d) => d.axis === "F健全度")?.value;
    expect(fHealth).toBe(120);
  });
});

describe("computeLanding", () => {
  it("returns 0 when no days recorded", () => {
    expect(computeLanding(0, 0, "2026-04")).toBe(0);
  });

  it("extrapolates remaining days using the average of recorded days", () => {
    // April has 30 days; 10 recorded at 100,000/day average -> 20 remaining days projected
    const landing = computeLanding(10, 1_000_000, "2026-04");
    expect(landing).toBeCloseTo(1_000_000 + 100_000 * 20, 5);
  });

  it("equals the actual sum when the whole month is recorded", () => {
    const totalDays = daysInYearMonth("2026-02");
    const landing = computeLanding(totalDays, 5_000_000, "2026-02");
    expect(landing).toBeCloseTo(5_000_000, 5);
  });
});

describe("previousYearMonth", () => {
  it("goes back one month within the same year", () => {
    expect(previousYearMonth("2026-07")).toBe("2026-06");
  });

  it("rolls back across a year boundary", () => {
    expect(previousYearMonth("2026-01")).toBe("2025-12");
  });
});
