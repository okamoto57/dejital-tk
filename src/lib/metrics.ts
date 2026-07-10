export function budgetAchievePct(actual: number, budget: number): number {
  return budget > 0 ? (actual / budget) * 100 : 0;
}

export type InOut = "IN" | "OUT";

export interface PettyCashEntryLike {
  amount: number;
  inout: InOut;
  category: string;
  isFood: boolean;
}

export interface PettyCashAggregate {
  inSum: number;
  outSum: number;
  foodSum: number;
  balance: number;
  byCategory: Record<string, number>;
}

export function aggregatePettyCash(
  entries: PettyCashEntryLike[],
  opening: number
): PettyCashAggregate {
  let inSum = 0;
  let outSum = 0;
  let foodSum = 0;
  const byCategory: Record<string, number> = {};

  for (const e of entries) {
    if (e.inout === "IN") {
      inSum += e.amount;
    } else {
      outSum += e.amount;
      if (e.isFood) foodSum += e.amount;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }
  }

  return { inSum, outSum, foodSum, balance: opening + inSum - outSum, byCategory };
}

export interface FlInput {
  actualSales: number;
  budgetSales: number;
  foodCost: number; // manual/POS purchase cost, excluding petty cash
  laborCost: number;
  beginInventory: number;
  endInventory: number;
  pettyCashFoodSum: number;
  prFee: number; // PR案件で受け取った提供費。実売上はないが原価・人件費は発生するため、F/L比率算出時のみ売上に加算する
  targetF: number;
  targetL: number;
}

export interface FlMetrics {
  totalFoodCost: number;
  baseFoodCost: number;
  flSalesBase: number;
  actualF: number;
  baseF: number;
  actualL: number;
  fl: number;
  budgetAchieve: number;
  fDelta: number;
}

export function computeFlMetrics(input: FlInput): FlMetrics {
  const {
    actualSales,
    budgetSales,
    foodCost,
    laborCost,
    beginInventory,
    endInventory,
    pettyCashFoodSum,
    prFee,
    targetF: _targetF,
    targetL: _targetL,
  } = input;

  // "Base" (仕入ベース) cost is purchases plus petty-cash food spend, before
  // the physical inventory-count adjustment; "total" additionally applies
  // that adjustment once the month's inventory is counted.
  const baseFoodCost = foodCost + pettyCashFoodSum;
  const totalFoodCost = baseFoodCost + beginInventory - endInventory;
  // F/L ratios use actual sales plus PR-campaign fees as their denominator
  // (PR-arranged parties consume food/labor without normal ticket revenue),
  // but budgetAchieve below intentionally uses raw actualSales only.
  const flSalesBase = actualSales + prFee;
  const actualF = flSalesBase > 0 ? (totalFoodCost / flSalesBase) * 100 : 0;
  const baseF = flSalesBase > 0 ? (baseFoodCost / flSalesBase) * 100 : 0;
  const actualL = flSalesBase > 0 ? (laborCost / flSalesBase) * 100 : 0;
  const fl = actualF + actualL;
  const budgetAchieve = budgetSales > 0 ? (actualSales / budgetSales) * 100 : 0;
  const fDelta = actualF - baseF;

  return { totalFoodCost, baseFoodCost, flSalesBase, actualF, baseF, actualL, fl, budgetAchieve, fDelta };
}

export function isFlAlert(metrics: FlMetrics, targetF: number, targetL: number): boolean {
  return metrics.actualF > targetF + 1.5 || metrics.actualL > targetL + 2 || metrics.fl > 60;
}

export interface RadarAxis {
  axis: string;
  value: number;
}

function clamp(v: number, max = 120) {
  return Math.max(0, Math.min(max, v));
}

export function buildRadarData(params: {
  budgetAchieve: number;
  actualF: number;
  targetF: number;
  actualL: number;
  targetL: number;
  googleScore: number; // 0-5
}): RadarAxis[] {
  const { budgetAchieve, actualF, targetF, actualL, targetL, googleScore } = params;
  return [
    { axis: "予算達成", value: clamp(budgetAchieve) },
    { axis: "F健全度", value: clamp(actualF > 0 ? (targetF / actualF) * 100 : 100) },
    { axis: "L健全度", value: clamp(actualL > 0 ? (targetL / actualL) * 100 : 100) },
    { axis: "Google評価", value: clamp((googleScore / 5) * 100) },
  ];
}

export function radarScore(radarData: RadarAxis[]): number {
  if (radarData.length === 0) return 0;
  return Math.round(radarData.reduce((a, d) => a + d.value, 0) / radarData.length);
}

export function daysInYearMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function previousYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Straight-line month-end sales forecast: recorded-so-far actual plus the
 * per-day average projected across the remaining, not-yet-recorded days. */
export function computeLanding(recordedDaysCount: number, actualSalesSum: number, yearMonth: string): number {
  if (recordedDaysCount === 0) return 0;
  const totalDays = daysInYearMonth(yearMonth);
  const avgDaily = actualSalesSum / recordedDaysCount;
  const remainingDays = Math.max(0, totalDays - recordedDaysCount);
  return actualSalesSum + avgDaily * remainingDays;
}

export interface GourmetMediaLike {
  mediaName: string;
  cost: number;
  revenue: number;
}

export interface AdviceItem {
  title: string;
  body: string;
}

export function buildMarketingAdvice(params: {
  gourmetMedia: GourmetMediaLike[];
  googleScore: number | null;
  tiktokEngage: number | null;
  lineFriends: number | null;
}): AdviceItem[] {
  const { gourmetMedia, googleScore, tiktokEngage, lineFriends } = params;
  const advice: AdviceItem[] = [];

  const withRoi = gourmetMedia
    .filter((m) => m.cost > 0)
    .map((m) => ({ ...m, roi: m.revenue / m.cost }));
  if (withRoi.length > 0) {
    const best = [...withRoi].sort((a, b) => b.roi - a.roi)[0];
    const worst = [...withRoi].sort((a, b) => a.roi - b.roi)[0];
    if (best.mediaName !== worst.mediaName) {
      advice.push({
        title: "予算再配分の提案",
        body: `費用対効果が最も高い「${best.mediaName}」(ROI ${best.roi.toFixed(1)}倍)へ広告費を寄せ、ROIが伸び悩む「${worst.mediaName}」(${worst.roi.toFixed(1)}倍)の掲載プランを見直すと、全体ROIの改善が見込めます。`,
      });
    }
  }

  if (googleScore != null) {
    advice.push({
      title: "UGC・口コミ強化",
      body:
        googleScore < 4.0
          ? `Googleスコア ${googleScore.toFixed(1)} はエリア平均を下回り気味です。来店直後クーポン等でレビュー投稿を促し、返信率を高めると集客CVの改善に直結します。`
          : `Googleスコア ${googleScore.toFixed(1)} は良好です。好意的な口コミをInstagram/TikTokへ二次利用し、UGCの露出を増やすフェーズです。`,
    });
  }

  if (tiktokEngage != null && lineFriends != null) {
    advice.push({
      title: "SNS動線の最適化",
      body: `TikTok エンゲージメント率 ${tiktokEngage}% を活かし、バズ投稿からLINE公式(友だち ${lineFriends.toLocaleString()}人)への予約導線を設計し、フォロワーの来店転換を高めましょう。`,
    });
  }

  return advice;
}
