"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Coins, Wallet, Utensils, TrendingUp, Plus, Trash2, Pencil } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { PC_CATEGORIES, isFoodCategory } from "@/lib/theme";
import { yen, pct } from "@/lib/format";
import { Card, SummaryCard, FlaroBadge, Field, useInputCls } from "./ui";
import { useAppTheme } from "./theme-provider";

export interface PettyCashEntryRow {
  id: string;
  dateLabel: string;
  category: string;
  inout: "IN" | "OUT";
  amount: number;
  payee: string;
  note: string;
  isFood: boolean;
}

const PIE_COLORS = [BRAND.alert, "#F472B6", BRAND.blue, "#60A5FA", BRAND.amber, "#34D399", "#A78BFA"];

export function PettyCashView({
  storeId,
  yearMonth,
  opening,
  entries,
  actualF,
  targetF,
}: {
  storeId: string;
  yearMonth: string;
  opening: number;
  entries: PettyCashEntryRow[];
  actualF: number;
  targetF: number;
}) {
  const theme = useAppTheme();
  const router = useRouter();

  const inSum = entries.filter((e) => e.inout === "IN").reduce((a, e) => a + e.amount, 0);
  const outSum = entries.filter((e) => e.inout === "OUT").reduce((a, e) => a + e.amount, 0);
  const foodSum = entries.filter((e) => e.inout === "OUT" && e.isFood).reduce((a, e) => a + e.amount, 0);
  const balance = opening + inSum - outSum;

  const byCategory: Record<string, number> = {};
  for (const e of entries) {
    if (e.inout === "OUT") byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const catChart = Object.entries(byCategory).map(([name, value]) => ({ name, value, food: isFoodCategory(name) }));

  async function updateOpening() {
    const v = prompt("期首残高を入力(円)", String(opening));
    if (v === null || Number.isNaN(Number(v))) return;
    await fetch("/api/petty-cash/opening", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, yearMonth, opening: Number(v) }),
    });
    router.refresh();
  }

  async function removeEntry(id: string) {
    await fetch("/api/petty-cash", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Coins size={16} />}
          accent={BRAND.blue}
          label="期首残高"
          value={yen(opening)}
          sub={
            <button onClick={updateOpening} className="inline-flex items-center gap-1 font-semibold" style={{ color: BRAND.blue }}>
              <Pencil size={11} /> 期首残高編集
            </button>
          }
        />
        <SummaryCard
          icon={<Wallet size={16} />}
          accent={balance < 0 ? BRAND.red : BRAND.green}
          label="期末残高(現在)"
          value={yen(balance)}
          sub={`入金 ${yen(inSum)} / 出金 ${yen(outSum)}`}
        />
        <SummaryCard
          icon={<Utensils size={16} />}
          accent={BRAND.alert}
          label="小口 食材費 合算(F反映)"
          value={yen(foodSum)}
          badge={<FlaroBadge k="F" />}
        />
        <SummaryCard icon={<TrendingUp size={16} />} accent={BRAND.blue} label="連動後 実際F比率" value={pct(actualF)} sub={`目標 ${pct(targetF, 0)}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PettyCashForm storeId={storeId} />

        <Card className="lg:col-span-2" title="当月 科目別支出">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catChart} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={2}>
                  {catChart.map((e, i) => (
                    <Cell key={i} fill={e.food ? BRAND.alert : PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => yen(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {catChart
                .sort((a, b) => b.value - a.value)
                .map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.food ? BRAND.alert : PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                    <span className="flex-1 font-medium">
                      {c.name}
                      {c.food && (
                        <span className="ml-1 text-xs" style={{ color: BRAND.alert }}>
                          (F連動)
                        </span>
                      )}
                    </span>
                    <span className="font-bold">{yen(c.value)}</span>
                  </div>
                ))}
              {catChart.length === 0 && <p className={`text-xs ${theme.subText}`}>まだ出納データがありません。</p>}
            </div>
          </div>
        </Card>
      </div>

      <Card title="小口現金 出納帳">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-left text-xs ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                <th className="py-2 pr-2 font-semibold">日付</th>
                <th className="py-2 pr-2 font-semibold">科目</th>
                <th className="py-2 pr-2 font-semibold">支払先</th>
                <th className="py-2 pr-2 text-right font-semibold">入金</th>
                <th className="py-2 pr-2 text-right font-semibold">出金</th>
                <th className="py-2 pr-2 font-semibold">摘要</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b text-xs" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                  <td className="py-2 pr-2 whitespace-nowrap">{e.dateLabel}</td>
                  <td className="py-2 pr-2">
                    <span className="whitespace-nowrap">{e.category}</span>
                    {e.isFood && <FlaroBadge k="F" />}
                  </td>
                  <td className={`py-2 pr-2 ${theme.subText}`}>{e.payee}</td>
                  <td className="py-2 pr-2 text-right" style={{ color: e.inout === "IN" ? BRAND.green : undefined }}>
                    {e.inout === "IN" ? yen(e.amount) : "—"}
                  </td>
                  <td className="py-2 pr-2 text-right" style={{ color: e.inout === "OUT" ? BRAND.alert : undefined }}>
                    {e.inout === "OUT" ? yen(e.amount) : "—"}
                  </td>
                  <td className={`py-2 pr-2 ${theme.subText}`}>{e.note}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeEntry(e.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className={`py-6 text-center ${theme.subText}`}>
                    まだ出納データがありません。
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

function PettyCashForm({ storeId }: { storeId: string }) {
  const inputCls = useInputCls();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState(PC_CATEGORIES[0]);
  const [inout, setInout] = useState<"OUT" | "IN">("OUT");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const food = isFoodCategory(category);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/petty-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, date, category, inout, amount: Number(amount), payee, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "登録に失敗しました");
      }
      setAmount("");
      setPayee("");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="出納登録">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="日付">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="科目">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {PC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {food && (
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "#FDF2F8", color: BRAND.alert }}
          >
            <Utensils size={12} /> この科目は食材原価(F比率)に自動合算されます
          </div>
        )}

        <Field label="区分・金額">
          <div className="flex gap-2">
            <div className="flex rounded-lg border p-0.5" style={{ borderColor: "#E2E8F0" }}>
              {(["OUT", "IN"] as const).map((io) => (
                <button
                  key={io}
                  onClick={() => setInout(io)}
                  className="rounded-md px-3 py-1.5 text-xs font-bold transition"
                  style={inout === io ? { backgroundColor: io === "OUT" ? BRAND.alert : BRAND.green, color: "#fff" } : { color: "#64748B" }}
                >
                  {io === "OUT" ? "出金" : "入金"}
                </button>
              ))}
            </div>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={`${inputCls} text-right`} />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="支払先">
            <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="スーパー 等" className={inputCls} />
          </Field>
          <Field label="摘要">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="内容メモ" className={inputCls} />
          </Field>
        </div>

        {error && (
          <p className="text-xs font-semibold" style={{ color: BRAND.alert }}>
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: BRAND.blue }}
        >
          <Plus size={16} /> {submitting ? "登録中..." : "登録する"}
        </button>
      </div>
    </Card>
  );
}
