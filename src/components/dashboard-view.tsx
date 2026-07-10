"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { AlertTriangle, TrendingUp, Utensils, Users } from "lucide-react";
import { BRAND, FLARO_COLORS } from "@/lib/theme";
import { yen, man, pct } from "@/lib/format";
import { Card, SummaryCard, FlaroBadge, MiniKpi, Stars, Delta } from "./ui";
import { useAppTheme } from "./theme-provider";
import type { RadarAxis } from "@/lib/metrics";

export interface DashboardViewProps {
  storeName: string;
  typeLabel: string;
  targetF: number;
  targetL: number;
  monthlyTotals: {
    budgetSales: number;
    laborBudget: number;
    actualSales: number;
    foodCost: number;
    laborCost: number;
    customers: number;
  };
  landing: number;
  laborBudgetAchieve: number;
  flMetrics: {
    totalFoodCost: number;
    baseFoodCost: number;
    actualF: number;
    baseF: number;
    actualL: number;
    fl: number;
    budgetAchieve: number;
    fDelta: number;
  };
  flAlert: boolean;
  radarData: RadarAxis[];
  radarScore: number;
  pettyCashFoodSum: number;
  inventory: { beginInventory: number; endInventory: number } | null;
  googleScore: number | null;
  googleReviews: number | null;
  googleDelta: number | null;
  tabelogScore: number | null;
  tabelogReviews: number | null;
  tabelogDelta: number | null;
}

export function DashboardView(props: DashboardViewProps) {
  const theme = useAppTheme();
  const {
    storeName,
    typeLabel,
    targetF,
    targetL,
    monthlyTotals,
    landing,
    laborBudgetAchieve,
    flMetrics,
    flAlert,
    radarData,
    radarScore,
    pettyCashFoodSum,
    inventory,
    googleScore,
    googleReviews,
    googleDelta,
    tabelogScore,
    tabelogReviews,
    tabelogDelta,
  } = props;

  const avgSpend = monthlyTotals.customers > 0 ? monthlyTotals.actualSales / monthlyTotals.customers : 0;

  const flaroBreakdown = [
    { key: "F" as const, label: "食材原価", ratio: flMetrics.actualF, target: targetF },
    { key: "L" as const, label: "人件費", ratio: flMetrics.actualL, target: targetL },
  ];
  const opProfit = 100 - flMetrics.actualF - flMetrics.actualL;

  return (
    <div className="space-y-4">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">{storeName}</h1>
        <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: BRAND.blueDark }}>
          {typeLabel}
        </span>
      </div>

      {flAlert && (
        <div
          className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{
            backgroundColor: theme.dark ? "rgba(225,29,111,0.12)" : "#FDF2F8",
            borderColor: "rgba(225,29,111,0.35)",
            color: BRAND.alert,
          }}
        >
          <AlertTriangle size={18} />
          FL比率が目標を超過しています(実際FL {pct(flMetrics.fl)} / 目標 {pct(targetF + targetL)})。原価・人件費の異常値を早期に確認してください。
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          icon={<TrendingUp size={16} />}
          accent={BRAND.green}
          label="当月売上(税抜)"
          value={yen(monthlyTotals.actualSales)}
          sub={`予算 ${man(monthlyTotals.budgetSales)} / 着地予測 ${man(landing)}`}
        />
        <SummaryCard
          icon={<Users size={16} />}
          accent={flMetrics.actualL > targetL + 2 ? BRAND.amber : BRAND.blue}
          label="L比率(人件費)"
          value={pct(flMetrics.actualL)}
          sub={
            <span>
              {yen(monthlyTotals.laborCost)} ・ 目標 {pct(targetL, 0)}
              {monthlyTotals.laborBudget > 0 && (
                <>
                  {" "}
                  ・ 予算 {yen(monthlyTotals.laborBudget)}(達成率 <b>{pct(laborBudgetAchieve)}</b>)
                </>
              )}
            </span>
          }
          badge={<FlaroBadge k="L" />}
        />
        <SummaryCard
          icon={<AlertTriangle size={16} />}
          accent={flAlert ? BRAND.alert : BRAND.green}
          label="FL判定(棚卸後の原価で判定)"
          value={pct(flMetrics.fl)}
          sub={flAlert ? "⚠ 目標超過 — 要対処" : "✓ 適正レンジ内"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={<Utensils size={16} />}
          accent={BRAND.blue}
          label="原価(仕入ベース)"
          value={pct(flMetrics.baseF)}
          sub={
            <span>
              {yen(flMetrics.baseFoodCost)} ・ 目標 {pct(targetF, 0)}(仕入+小口食材費、棚卸調整前)
            </span>
          }
          badge={<FlaroBadge k="F" />}
        />
        <SummaryCard
          icon={<Utensils size={16} />}
          accent={flMetrics.actualF > targetF + 1.5 ? BRAND.alert : BRAND.green}
          label="原価(棚卸入力後・実際の原価)"
          value={pct(flMetrics.actualF)}
          sub={
            <span>
              {yen(flMetrics.totalFoodCost)} ・ 棚卸調整 <b style={{ color: BRAND.alert }}>{flMetrics.fDelta >= 0 ? "+" : ""}{pct(flMetrics.fDelta, 2)}</b>
            </span>
          }
          badge={<FlaroBadge k="F" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="店舗レーダーチャート">
          <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={theme.chartGrid} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: theme.chartAxis, fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 120]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={BRAND.green} fill={BRAND.green} fillOpacity={0.35} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black" style={{ color: BRAND.green }}>
                  {radarScore}
                </div>
                <div className={`text-xs ${theme.subText}`}>総合スコア</div>
              </div>
            </div>
          </div>
        </Card>

        <Card
          className="lg:col-span-3"
          title="FL コスト構成(実績比率)"
          right={
            <span className={`text-xs ${theme.subText}`}>
              着地予測 <b style={{ color: BRAND.blue }}>{man(landing)}</b>(達成率 {pct(flMetrics.budgetAchieve)})
            </span>
          }
        >
          <div className="space-y-2.5">
            {flaroBreakdown.map((row) => {
              const over = row.ratio > row.target + 1;
              const width = Math.min(100, (row.ratio / 55) * 100);
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <FlaroBadge k={row.key} />
                  <div className="w-20 text-xs font-semibold">{row.label}</div>
                  <div
                    className="relative h-5 flex-1 overflow-hidden rounded-md"
                    style={{ backgroundColor: theme.dark ? "#1E293B" : "#F1F5F9" }}
                  >
                    <div
                      className="h-full rounded-md"
                      style={{ width: `${width}%`, backgroundColor: over ? BRAND.alert : FLARO_COLORS[row.key] }}
                    />
                  </div>
                  <div
                    className="w-14 text-right text-xs font-bold"
                    style={{ color: over ? BRAND.alert : theme.dark ? "#E2E8F0" : "#334155" }}
                  >
                    {pct(row.ratio)}
                  </div>
                  <div className={`w-16 text-right text-xs ${theme.subText}`}>目標{pct(row.target, 0)}</div>
                </div>
              );
            })}
            <div
              className="mt-1 flex items-center justify-between border-t pt-2.5"
              style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}
            >
              <span className="text-xs font-semibold">営業利益率(推定・FL控除後)</span>
              <span className="text-lg font-black" style={{ color: opProfit > 0 ? BRAND.green : BRAND.red }}>
                {pct(opProfit)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <MiniKpi label="客数" value={monthlyTotals.customers ? monthlyTotals.customers.toLocaleString() + " 人" : "—"} />
        <MiniKpi label="客単価" value={avgSpend ? yen(avgSpend) : "—"} />
        <MiniKpi label="仕入高(手入力)" value={yen(monthlyTotals.foodCost)} />
        <MiniKpi label="小口(食材)合算" value={yen(pettyCashFoodSum)} />
        <MiniKpi
          label="棚卸調整(期首−期末)"
          value={inventory ? yen(inventory.beginInventory - inventory.endInventory) : "未入力"}
        />
        <MiniKpi label="人件費(合計)" value={yen(monthlyTotals.laborCost)} />
      </div>

      <Card title="外部レビュースコア">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="flex items-center gap-3 rounded-xl p-3.5"
            style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: "#4285F4", fontWeight: 700 }}
            >
              G
            </span>
            <div>
              <div className={`text-xs ${theme.subText}`}>Google スコア</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black" style={{ color: BRAND.blue }}>
                  {googleScore != null ? googleScore.toFixed(1) : "—"}
                </span>
                {googleScore != null && <Stars score={googleScore} />}
              </div>
            </div>
            <div className="ml-auto text-right">
              {googleDelta != null && <Delta value={googleDelta} digits={1} />}
              <div className={`text-xs ${theme.subText}`}>口コミ {googleReviews != null ? googleReviews.toLocaleString() : "—"} 件</div>
            </div>
          </div>

          <div
            className="flex items-center gap-3 rounded-xl p-3.5"
            style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: "#FF2800", fontWeight: 700, fontSize: 11 }}
            >
              食
            </span>
            <div>
              <div className={`text-xs ${theme.subText}`}>食べログ スコア</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black" style={{ color: "#FF2800" }}>
                  {tabelogScore != null ? tabelogScore.toFixed(2) : "—"}
                </span>
                {tabelogScore != null && <Stars score={tabelogScore} />}
              </div>
            </div>
            <div className="ml-auto text-right">
              {tabelogDelta != null && <Delta value={tabelogDelta} digits={2} />}
              <div className={`text-xs ${theme.subText}`}>口コミ {tabelogReviews != null ? tabelogReviews.toLocaleString() : "—"} 件</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
