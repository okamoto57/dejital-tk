"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { yen, man, pct } from "@/lib/format";
import { Card } from "./ui";
import { useAppTheme } from "./theme-provider";

export interface HqStoreRow {
  storeId: string;
  name: string;
  typeLabel: string;
  actualSales: number;
  budgetSales: number;
  budgetAchieve: number;
  actualF: number;
  actualL: number;
  fl: number;
  flTarget: number;
  flAlert: boolean;
}

const SORT_COLUMNS = {
  actualSales: "売上実績",
  budgetAchieve: "予算達成率",
  actualF: "F率",
  actualL: "L率",
  fl: "FL率",
} as const;
type SortKey = keyof typeof SORT_COLUMNS;

export function HqCompareView({ rows, yearMonth }: { rows: HqStoreRow[]; yearMonth: string }) {
  const theme = useAppTheme();
  const [sortKey, setSortKey] = useState<SortKey>("fl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => a[sortKey] - b[sortKey]);
    return sortDir === "desc" ? s.reverse() : s;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ column, className }: { column: SortKey; className: string }) {
    const active = column === sortKey;
    return (
      <th className={className}>
        <button onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 hover:text-slate-800">
          {SORT_COLUMNS[column]}
          {active ? sortDir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : null}
        </button>
      </th>
    );
  }

  const totalSales = rows.reduce((a, r) => a + r.actualSales, 0);
  const totalBudget = rows.reduce((a, r) => a + r.budgetSales, 0);
  const alertCount = rows.filter((r) => r.flAlert).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="全店舗 売上合計">
          <div className="text-2xl font-black" style={{ color: BRAND.blue }}>
            {yen(totalSales)}
          </div>
          <div className={`mt-1 text-xs ${theme.subText}`}>予算 {man(totalBudget)}({yearMonth})</div>
        </Card>
        <Card title="予算達成率(全店合算)">
          <div className="text-2xl font-black" style={{ color: BRAND.blue }}>
            {totalBudget > 0 ? pct((totalSales / totalBudget) * 100) : "—"}
          </div>
        </Card>
        <Card title="FLアラート店舗数">
          <div className="flex items-center gap-2 text-2xl font-black" style={{ color: alertCount > 0 ? BRAND.alert : BRAND.green }}>
            {alertCount > 0 && <AlertTriangle size={20} />}
            {alertCount} / {rows.length} 店舗
          </div>
        </Card>
      </div>

      <Card title={`全店舗 FL比率比較(${SORT_COLUMNS[sortKey]}が${sortDir === "desc" ? "高い" : "低い"}順)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={`border-b text-left ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                <th className="py-2 pr-2 font-semibold">店舗名</th>
                <th className="py-2 pr-2 font-semibold">業態</th>
                <SortHeader column="actualSales" className="py-2 pr-2 text-right font-semibold" />
                <SortHeader column="budgetAchieve" className="py-2 pr-2 text-right font-semibold" />
                <SortHeader column="actualF" className="py-2 pr-2 text-right font-semibold" />
                <SortHeader column="actualL" className="py-2 pr-2 text-right font-semibold" />
                <SortHeader column="fl" className="py-2 pr-2 text-right font-semibold" />
                <th className="py-2 text-right font-semibold">判定</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.storeId} className="border-b" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                  <td className="py-2 pr-2 font-semibold">
                    <Link href={`/dashboard?store=${r.storeId}`} className="hover:underline" style={{ color: BRAND.blue }}>
                      {r.name}
                    </Link>
                  </td>
                  <td className={`py-2 pr-2 ${theme.subText}`}>{r.typeLabel}</td>
                  <td className="py-2 pr-2 text-right">{yen(r.actualSales)}</td>
                  <td className="py-2 pr-2 text-right">{pct(r.budgetAchieve)}</td>
                  <td className="py-2 pr-2 text-right">{pct(r.actualF)}</td>
                  <td className="py-2 pr-2 text-right">{pct(r.actualL)}</td>
                  <td className="py-2 pr-2 text-right font-bold" style={{ color: r.flAlert ? BRAND.alert : undefined }}>
                    {pct(r.fl)}
                  </td>
                  <td className="py-2 text-right">
                    {r.flAlert ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: BRAND.alert }}>
                        要対処
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: BRAND.green }}>
                        良好
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className={`py-6 text-center ${theme.subText}`}>
                    店舗データがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
