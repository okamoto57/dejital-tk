"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CalendarDays, TrendingUp, Utensils, Users, AlertTriangle } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { yen, man, pct } from "@/lib/format";
import type { DailyRow } from "@/lib/types";
import { Card, SummaryCard, FlaroBadge, ChartTip } from "./ui";
import { useAppTheme } from "./theme-provider";

export function SalesFlView({
  targetF,
  targetL,
  rows,
  totals,
  recordedDaysCount,
}: {
  targetF: number;
  targetL: number;
  rows: DailyRow[];
  totals: { budgetSales: number; laborBudget: number; actualSales: number; laborCost: number; fRate: number; lRate: number; flRate: number };
  recordedDaysCount: number;
}) {
  const theme = useAppTheme();
  const flTarget = targetF + targetL;

  const chartData = rows
    .filter((r) => r.actualSales != null)
    .map((r) => ({
      day: r.dateLabel,
      売上: r.actualSales,
      F率: +(r.fRate ?? 0).toFixed(1),
      L率: +(r.lRate ?? 0).toFixed(1),
      FL率: +(r.flRate ?? 0).toFixed(1),
    }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard icon={<TrendingUp size={16} />} accent={BRAND.green} label="当月売上 累計" value={yen(totals.actualSales)} sub={`予算 ${man(totals.budgetSales)}`} />
        <SummaryCard icon={<Users size={16} />} accent={BRAND.blue} label="人件費 累計" value={yen(totals.laborCost)} sub={`予算 ${man(totals.laborBudget)}`} />
        <SummaryCard icon={<CalendarDays size={16} />} accent={BRAND.blue} label="記録日数" value={`${recordedDaysCount} / ${rows.length} 日`} />
        <SummaryCard
          icon={<Utensils size={16} />}
          accent={totals.fRate > targetF + 1.5 ? BRAND.alert : BRAND.blue}
          label="F率(累計・小口込)"
          value={pct(totals.fRate)}
          sub={`目標 ${pct(targetF, 0)}`}
          badge={<FlaroBadge k="F" />}
        />
        <SummaryCard
          icon={<Users size={16} />}
          accent={totals.lRate > targetL + 2 ? BRAND.amber : BRAND.blue}
          label="L率(累計)"
          value={pct(totals.lRate)}
          sub={`目標 ${pct(targetL, 0)}`}
          badge={<FlaroBadge k="L" />}
        />
        <SummaryCard
          icon={<AlertTriangle size={16} />}
          accent={totals.flRate > flTarget ? BRAND.alert : BRAND.green}
          label="FL率(累計)"
          value={pct(totals.flRate)}
          sub={totals.flRate > flTarget ? "⚠ 目標超過" : "✓ 適正レンジ"}
        />
      </div>

      <Card title="日別 売上 & FL率 推移">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.chartGrid} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: theme.chartAxis, fontSize: 10 }} interval={1} />
            <YAxis yAxisId="l" tickFormatter={(v) => (v / 10000).toFixed(0) + "万"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={44} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => v + "%"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={38} domain={[0, 80]} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" name="売上" dataKey="売上" fill={theme.dark ? "#334155" : "#CBD5E1"} radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Line yAxisId="r" name="F率" dataKey="F率" stroke={BRAND.blue} strokeWidth={2} dot={false} />
            <Line yAxisId="r" name="L率" dataKey="L率" stroke={BRAND.amber} strokeWidth={2} dot={false} />
            <Line yAxisId="r" name="FL率" dataKey="FL率" stroke={BRAND.alert} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="日別 売上・FL 明細">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                <th className="py-2 pr-2 text-left font-semibold">日付</th>
                <th className="py-2 pr-2 text-right font-semibold">売上予算</th>
                <th className="py-2 pr-2 text-right font-semibold">売上実績</th>
                <th className="py-2 pr-2 text-right font-semibold">F 食材</th>
                <th className="py-2 pr-2 text-right font-semibold">F率</th>
                <th className="py-2 pr-2 text-right font-semibold">L 人件費</th>
                <th className="py-2 pr-2 text-right font-semibold">人件費予算</th>
                <th className="py-2 pr-2 text-right font-semibold">L率</th>
                <th className="py-2 text-right font-semibold">FL率</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hasAnyData = r.actualSales != null || r.foodCost != null || r.laborCost != null;
                const flOver = r.flRate != null && r.flRate > flTarget;
                return (
                  <tr
                    key={r.isoDate}
                    className="border-b"
                    style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9", opacity: hasAnyData ? 1 : 0.55 }}
                  >
                    <td className="py-1.5 pr-2 text-left font-semibold">
                      {r.dateLabel}
                      <span className={`ml-1 ${theme.subText}`}>({r.dowLabel})</span>
                    </td>
                    <td className="py-1.5 pr-2 text-right">{man(r.budgetSales)}</td>
                    <td className="py-1.5 pr-2 text-right font-medium">{r.actualSales != null ? yen(r.actualSales) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right">{r.foodCost != null ? yen(r.foodCost) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold" style={{ color: r.fRate != null && r.fRate > targetF + 2 ? BRAND.alert : undefined }}>
                      {r.fRate != null ? pct(r.fRate) : "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-right">{r.laborCost != null ? yen(r.laborCost) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right">{yen(r.laborBudget)}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold" style={{ color: r.lRate != null && r.lRate > targetL + 3 ? BRAND.amber : undefined }}>
                      {r.lRate != null ? pct(r.lRate) : "—"}
                    </td>
                    <td className="py-1.5 text-right font-bold" style={{ color: flOver ? BRAND.alert : undefined }}>
                      {r.flRate != null ? pct(r.flRate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
