"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { yen } from "@/lib/format";
import type { DailyRow } from "@/lib/types";
import { Card, Field, useInputCls } from "./ui";
import { useAppTheme } from "./theme-provider";

/** Strips thousands-separator commas (half-width "," and full-width "，"),
 * yen signs, and whitespace so values copied from Excel like "1,000,000"
 * or "￥1,000" parse as numbers instead of becoming NaN. */
function cleanNumeric(text: string): string {
  return text.replace(/[,，¥￥\s]/g, "");
}

/** Parses a block copied from Excel/Sheets (tab-separated columns,
 * newline-separated rows) into a 2D array of cell strings, with
 * number formatting (commas, yen signs) stripped from each cell. */
function parsePastedGrid(text: string): string[][] | null {
  if (!text.includes("\t") && !text.includes("\n")) return null; // plain single value: let default paste happen
  const lines = text.replace(/\r/g, "").split("\n").filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ""));
  return lines.map((line) => line.split("\t").map((cell) => cleanNumeric(cell.trim())));
}

export function DailyRecordForm({ storeId, yearMonth }: { storeId: string; yearMonth: string }) {
  const theme = useAppTheme();
  const inputCls = useInputCls();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today.startsWith(yearMonth) ? today : `${yearMonth}-01`);
  const [actualSales, setActualSales] = useState("");
  const [foodCost, setFoodCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [customers, setCustomers] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Only send fields the user actually typed into, so leaving e.g. 売上実績
      // blank while only updating 人件費 doesn't zero out the existing sales value.
      const payload: Record<string, unknown> = { storeId, date };
      if (actualSales !== "") payload.actualSales = Number(cleanNumeric(actualSales));
      if (foodCost !== "") payload.foodCost = Number(cleanNumeric(foodCost));
      if (laborCost !== "") payload.laborCost = Number(cleanNumeric(laborCost));
      if (customers !== "") payload.customers = Number(cleanNumeric(customers));

      const res = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "登録に失敗しました");
      }
      setActualSales("");
      setFoodCost("");
      setLaborCost("");
      setCustomers("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="日別実績を入力">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="日付">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="売上実績(円)">
          <input type="number" value={actualSales} onChange={(e) => setActualSales(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
        <Field label="仕入・食材原価(円)">
          <input type="number" value={foodCost} onChange={(e) => setFoodCost(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
        <Field label="人件費(円)">
          <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
        <Field label="客数(任意)">
          <input type="number" value={customers} onChange={(e) => setCustomers(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.alert }}>
          {error}
        </p>
      )}
      <button
        onClick={submit}
        disabled={submitting}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
        style={{ backgroundColor: BRAND.blue }}
      >
        <Plus size={16} /> {submitting ? "登録中..." : "登録・更新する"}
      </button>
      <p className={`mt-1.5 text-xs ${theme.subText}`}>
        同じ日付で登録すると上書き更新されます。空欄のまま登録した項目は変更されず、既存の値が保持されます。
      </p>
    </Card>
  );
}

const BULK_DAILY_ROW_COUNT = 10;
const BULK_DAILY_COLUMNS = ["actualSales", "foodCost", "laborCost", "customers"] as const;
type BulkDailyField = (typeof BULK_DAILY_COLUMNS)[number];
const BULK_DAILY_DOW = ["日", "月", "火", "水", "木", "金", "土"];

function isoDatePlusDays(startIso: string, offset: number) {
  const [y, m, d] = startIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offset));
  return dt.toISOString().slice(0, 10);
}

export function BulkDailyRecordForm({ storeId, yearMonth }: { storeId: string; yearMonth: string }) {
  const theme = useAppTheme();
  const inputCls = useInputCls();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today.startsWith(yearMonth) ? today : `${yearMonth}-01`);
  const [rows, setRows] = useState<Record<BulkDailyField, string>[]>(() =>
    Array.from({ length: BULK_DAILY_ROW_COUNT }, () => ({ actualSales: "", foodCost: "", laborCost: "", customers: "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dates = Array.from({ length: BULK_DAILY_ROW_COUNT }, (_, i) => isoDatePlusDays(startDate, i));

  function setCell(rowIndex: number, field: BulkDailyField, value: string) {
    setSaved(false);
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  }

  function resetGrid() {
    setRows(Array.from({ length: BULK_DAILY_ROW_COUNT }, () => ({ actualSales: "", foodCost: "", laborCost: "", customers: "" })));
  }

  // Lets a block copied from Excel (tab-separated columns, newline-separated
  // rows) be pasted starting at whichever cell has focus, filling downward
  // and rightward across the grid — same mechanic as pasting into a sheet.
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    const grid = parsePastedGrid(e.clipboardData.getData("text"));
    if (!grid) return;
    e.preventDefault();

    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      grid.forEach((cells, rOffset) => {
        const targetRow = rowIndex + rOffset;
        if (targetRow >= next.length) return;
        cells.forEach((cellText, cOffset) => {
          const targetCol = colIndex + cOffset;
          if (targetCol >= BULK_DAILY_COLUMNS.length) return;
          next[targetRow][BULK_DAILY_COLUMNS[targetCol]] = cellText;
        });
      });
      return next;
    });
  }

  async function saveAll() {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const days = dates
        .map((date, i) => {
          const row = rows[i];
          const day: Record<string, unknown> = { date };
          let hasValue = false;
          for (const field of BULK_DAILY_COLUMNS) {
            if (row[field] !== "") {
              day[field] = Number(cleanNumeric(row[field]));
              hasValue = true;
            }
          }
          return hasValue ? day : null;
        })
        .filter((d): d is Record<string, unknown> => d !== null);

      if (days.length === 0) {
        throw new Error("入力された行がありません");
      }

      const res = await fetch("/api/daily-records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, days }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "保存に失敗しました");
      }
      resetGrid();
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title={`日別実績を${BULK_DAILY_ROW_COUNT}日分まとめて入力`}
      right={
        <button
          onClick={saveAll}
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: BRAND.blue }}
        >
          <Save size={14} /> {submitting ? "保存中..." : "まとめて保存"}
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Field label="開始日">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </Field>
        <p className={`text-xs ${theme.subText}`}>
          Excelなどの表からコピーした数値を、いずれかのセルに貼り付けると自動的に複数マスへ展開されます。空欄の項目は保存されません。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={`border-b text-left ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
              <th className="py-1.5 pr-2 font-semibold">日付</th>
              <th className="py-1.5 pr-2 font-semibold">売上実績(円)</th>
              <th className="py-1.5 pr-2 font-semibold">仕入・食材原価(円)</th>
              <th className="py-1.5 pr-2 font-semibold">人件費(円)</th>
              <th className="py-1.5 pr-2 font-semibold">客数</th>
            </tr>
          </thead>
          <tbody>
            {dates.map((date, rowIndex) => {
              const dow = BULK_DAILY_DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
              return (
                <tr key={date} className="border-b" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                  <td className="py-1 pr-2 whitespace-nowrap font-semibold">
                    {date.slice(5)} <span className={theme.subText}>({dow})</span>
                  </td>
                  {BULK_DAILY_COLUMNS.map((field, colIndex) => (
                    <td key={field} className="py-1 pr-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={rows[rowIndex][field]}
                        onChange={(e) => setCell(rowIndex, field, e.target.value)}
                        onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                        className={inputCls}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.alert }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.green }}>
          保存しました。
        </p>
      )}
    </Card>
  );
}

export function BulkBudgetForm({ storeId, yearMonth, rows }: { storeId: string; yearMonth: string; rows: DailyRow[] }) {
  const theme = useAppTheme();
  const inputCls = useInputCls();
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, { budgetSales: string; laborBudget: string }>>(() => {
    const m: Record<string, { budgetSales: string; laborBudget: string }> = {};
    for (const r of rows) m[r.isoDate] = { budgetSales: String(r.budgetSales || ""), laborBudget: String(r.laborBudget || "") };
    return m;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const BUDGET_COLUMNS = ["budgetSales", "laborBudget"] as const;

  function update(isoDate: string, field: "budgetSales" | "laborBudget", value: string) {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [isoDate]: { ...prev[isoDate], [field]: value } }));
  }

  // Same Excel-paste mechanic as the daily-record grid: paste a block starting
  // at any cell and it fills downward/rightward across the remaining rows.
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    const grid = parsePastedGrid(e.clipboardData.getData("text"));
    if (!grid) return;
    e.preventDefault();
    setSaved(false);

    setDraft((prev) => {
      const next = { ...prev };
      grid.forEach((cells, rOffset) => {
        const targetRow = rows[rowIndex + rOffset];
        if (!targetRow) return;
        const current = { ...next[targetRow.isoDate] };
        cells.forEach((cellText, cOffset) => {
          const targetCol = BUDGET_COLUMNS[colIndex + cOffset];
          if (!targetCol) return;
          current[targetCol] = cellText;
        });
        next[targetRow.isoDate] = current;
      });
      return next;
    });
  }

  async function saveAll() {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const days = rows.map((r) => ({
        date: r.isoDate,
        budgetSales: Number(cleanNumeric(draft[r.isoDate]?.budgetSales ?? "")) || 0,
        laborBudget: Number(cleanNumeric(draft[r.isoDate]?.laborBudget ?? "")) || 0,
      }));
      const res = await fetch("/api/daily-budgets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, days }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "保存に失敗しました");
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title={`予算を一括入力(${yearMonth}・全${rows.length}日)`}
      right={
        <button
          onClick={saveAll}
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: BRAND.blue }}
        >
          <Save size={14} /> {submitting ? "保存中..." : "全日まとめて保存"}
        </button>
      }
    >
      <p className={`mb-3 text-xs ${theme.subText}`}>
        この画面を1回開いた状態で、当月すべての日の売上予算・人件費予算をまとめて入力し、最後に1回「全日まとめて保存」を押してください。Excelなどの表からコピーした数値を、いずれかのセルに貼り付けると自動的に複数マスへ展開されます。
      </p>
      <div className="max-h-80 overflow-y-auto rounded-lg border" style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
            <tr className={`border-b text-left ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
              <th className="py-1.5 pl-2 pr-2 font-semibold">日付</th>
              <th className="py-1.5 pr-2 font-semibold">売上予算(円)</th>
              <th className="py-1.5 pr-2 font-semibold">人件費予算(円)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rowIndex) => (
              <tr key={r.isoDate} className="border-b" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                <td className="py-1 pl-2 pr-2 whitespace-nowrap font-semibold">
                  {r.dateLabel} <span className={theme.subText}>({r.dowLabel})</span>
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    value={draft[r.isoDate]?.budgetSales ?? ""}
                    onChange={(e) => update(r.isoDate, "budgetSales", e.target.value)}
                    onPaste={(e) => handlePaste(e, rowIndex, 0)}
                    className={inputCls}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    value={draft[r.isoDate]?.laborBudget ?? ""}
                    onChange={(e) => update(r.isoDate, "laborBudget", e.target.value)}
                    onPaste={(e) => handlePaste(e, rowIndex, 1)}
                    className={inputCls}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.alert }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.green }}>
          保存しました。
        </p>
      )}
    </Card>
  );
}

export interface GourmetRow {
  mediaName: string;
  cost: number;
  revenue: number;
  guests: number;
  score: number;
}

export function GourmetMediaForm({ storeId, yearMonth, rows }: { storeId: string; yearMonth: string; rows: GourmetRow[] }) {
  const theme = useAppTheme();
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, GourmetRow>>(() => {
    const m: Record<string, GourmetRow> = {};
    for (const r of rows) m[r.mediaName] = r;
    return m;
  });
  const [savingMedia, setSavingMedia] = useState<string | null>(null);

  async function save(mediaName: string) {
    const row = draft[mediaName];
    setSavingMedia(mediaName);
    try {
      await fetch("/api/gourmet-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, yearMonth, ...row }),
      });
      router.refresh();
    } finally {
      setSavingMedia(null);
    }
  }

  return (
    <Card title="グルメ媒体を入力">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={`border-b text-left ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
              <th className="py-1.5 pr-2 font-semibold">媒体</th>
              <th className="py-1.5 pr-2 text-right font-semibold">広告費</th>
              <th className="py-1.5 pr-2 text-right font-semibold">売上貢献</th>
              <th className="py-1.5 pr-2 text-right font-semibold">送客</th>
              <th className="py-1.5 pr-2 text-right font-semibold">スコア</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = draft[r.mediaName];
              return (
                <tr key={r.mediaName} className="border-b" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                  <td className="py-1.5 pr-2 font-semibold">{r.mediaName}</td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      value={d.cost}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.mediaName]: { ...prev[r.mediaName], cost: Number(e.target.value) } }))}
                      className="w-24 rounded border border-slate-200 px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      value={d.revenue}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.mediaName]: { ...prev[r.mediaName], revenue: Number(e.target.value) } }))}
                      className="w-24 rounded border border-slate-200 px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      value={d.guests}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.mediaName]: { ...prev[r.mediaName], guests: Number(e.target.value) } }))}
                      className="w-16 rounded border border-slate-200 px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={d.score}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.mediaName]: { ...prev[r.mediaName], score: Number(e.target.value) } }))}
                      className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => save(r.mediaName)} disabled={savingMedia === r.mediaName} className="text-slate-400 hover:text-blue-600">
                      <Save size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export interface ReputationInitial {
  score: number;
  reviews: number;
  meoRank?: number | null;
  meoTotal?: number | null;
}

export interface PreviousScoreRef {
  score: number;
  reviews: number;
}

export function ReputationForm({
  storeId,
  yearMonth,
  source,
  label,
  color,
  initial,
  previous,
}: {
  storeId: string;
  yearMonth: string;
  source: "GOOGLE" | "TABELOG" | "DAZHONG";
  label: string;
  color: string;
  initial: ReputationInitial | null;
  previous: PreviousScoreRef | null;
}) {
  const theme = useAppTheme();
  const inputCls = useInputCls();
  const router = useRouter();
  const [score, setScore] = useState(String(initial?.score ?? ""));
  const [reviews, setReviews] = useState(String(initial?.reviews ?? ""));
  const [meoRank, setMeoRank] = useState(String(initial?.meoRank ?? ""));
  const [meoTotal, setMeoTotal] = useState(String(initial?.meoTotal ?? ""));
  const [saving, setSaving] = useState(false);
  const isGoogle = source === "GOOGLE";

  const reviewsDelta = reviews !== "" ? Number(reviews) - (previous?.reviews ?? Number(reviews)) : null;
  const scoreDelta = score !== "" ? Number(score) - (previous?.score ?? Number(score)) : null;

  async function save() {
    setSaving(true);
    try {
      const scoreNum = Number(score) || 0;
      const reviewsNum = Number(reviews) || 0;
      await fetch("/api/reputation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          yearMonth,
          source,
          score: scoreNum,
          scorePrev: previous?.score ?? scoreNum,
          reviews: reviewsNum,
          reviewsDelta: reviewsNum - (previous?.reviews ?? reviewsNum),
          extra: isGoogle ? { meoRank: Number(meoRank) || null, meoTotal: Number(meoTotal) || null } : undefined,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={label}>
      <p className={`mb-2 text-xs ${theme.subText}`}>
        {previous
          ? `前月実績: ★${previous.score.toFixed(2)} ・ 口コミ ${previous.reviews.toLocaleString()}件(この値を基準に新規口コミ数を自動計算します)`
          : "前月データがまだありません。今月の値を基準に今後の新規口コミ数を計算します。"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="現在スコア">
          <input value={score} onChange={(e) => setScore(e.target.value)} type="number" step="0.01" className={inputCls} />
        </Field>
        <Field label="現在の口コミ数">
          <input value={reviews} onChange={(e) => setReviews(e.target.value)} type="number" className={inputCls} />
        </Field>
        {isGoogle && (
          <>
            <Field label="MEO順位">
              <input value={meoRank} onChange={(e) => setMeoRank(e.target.value)} type="number" className={inputCls} />
            </Field>
            <Field label="MEO対象店舗数(同一カテゴリ)">
              <input value={meoTotal} onChange={(e) => setMeoTotal(e.target.value)} type="number" className={inputCls} />
            </Field>
          </>
        )}
      </div>
      {(reviewsDelta != null || scoreDelta != null) && (
        <p className="mt-2 text-xs font-semibold" style={{ color }}>
          自動計算: スコア増減 {scoreDelta != null ? (scoreDelta >= 0 ? `+${scoreDelta.toFixed(2)}` : scoreDelta.toFixed(2)) : "—"} ・ 新規口コミ数{" "}
          {reviewsDelta != null ? (reviewsDelta >= 0 ? `+${reviewsDelta}` : reviewsDelta) : "—"}件
        </p>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: color }}
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </Card>
  );
}

export function SnsEntryForm({
  storeId,
  yearMonth,
  platform,
  icon: Icon,
  color,
  name,
  initial,
  countField,
  otherFields,
  previousCount,
}: {
  storeId: string;
  yearMonth: string;
  platform: "instagram" | "tiktok" | "line";
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  name: string;
  initial: Record<string, number>;
  countField: { key: string; label: string };
  otherFields: { key: string; label: string }[];
  previousCount: number | null;
}) {
  const theme = useAppTheme();
  const inputCls = useInputCls();
  const router = useRouter();
  const allFields = [countField, ...otherFields];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of allFields) v[f.key] = String(initial[f.key] ?? "");
    return v;
  });
  const [saving, setSaving] = useState(false);

  const currentCount = values[countField.key];
  const growth = currentCount !== "" ? Number(currentCount) - (previousCount ?? Number(currentCount)) : null;

  async function save() {
    setSaving(true);
    try {
      const metrics: Record<string, number> = {};
      for (const f of allFields) metrics[f.key] = Number(values[f.key]) || 0;
      const countNum = Number(values[countField.key]) || 0;
      metrics.growth = countNum - (previousCount ?? countNum);
      await fetch("/api/sns-metrics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, yearMonth, platform, metrics }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}>
          <Icon size={16} />
        </span>
        <span className="text-sm font-bold">{name}</span>
      </div>
      <p className={`mb-2 text-xs ${theme.subText}`}>
        {previousCount != null
          ? `前月実績: ${previousCount.toLocaleString()}(この値を基準に増加数を自動計算します)`
          : "前月データがまだありません。今月の値を基準に今後の増加数を計算します。"}
      </p>
      <div className="space-y-2">
        {allFields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              type="number"
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className={inputCls}
            />
          </Field>
        ))}
      </div>
      {growth != null && (
        <p className="mt-2 text-xs font-semibold" style={{ color }}>
          自動計算: 今月の増加数 {growth >= 0 ? `+${growth.toLocaleString()}` : growth.toLocaleString()}
        </p>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 w-full rounded-xl py-2 text-xs font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: color }}
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </Card>
  );
}

export function InventoryForm({
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
  const theme = useAppTheme();
  const inputCls = useInputCls();
  const router = useRouter();
  const [begin, setBegin] = useState(String(initialBegin ?? previousEnd ?? ""));
  const [end, setEnd] = useState(String(initialEnd ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const beginNum = Number(begin) || 0;
  const endNum = Number(end) || 0;
  const totalFoodCost = purchaseFoodCost + pettyCashFoodSum + beginNum - endNum;
  const baseF = actualSales > 0 ? (purchaseFoodCost / actualSales) * 100 : 0;
  const afterF = actualSales > 0 ? (totalFoodCost / actualSales) * 100 : 0;

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, yearMonth, beginInventory: beginNum, endInventory: endNum }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "保存に失敗しました");
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={`棚卸入力(${yearMonth})`}>
      <p className={`mb-3 text-xs ${theme.subText}`}>
        {previousEnd != null
          ? `期首棚卸は前月の期末棚卸(${yen(previousEnd)})を初期値として自動反映しています。実際の数値と異なる場合は修正してください。`
          : "前月の棚卸データがまだないため、期首棚卸は手入力してください。"}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="期首棚卸(円)">
          <input type="number" value={begin} onChange={(e) => setBegin(e.target.value)} className={inputCls} />
        </Field>
        <Field label="期末棚卸(円)">
          <input type="number" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} placeholder="実地棚卸の金額" />
        </Field>
      </div>

      <div
        className="mt-3 grid grid-cols-1 gap-3 rounded-xl p-3 sm:grid-cols-2"
        style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F0F7FF" }}
      >
        <div>
          <div className={`text-xs ${theme.subText}`}>原価(仕入ベース)</div>
          <div className="text-lg font-black" style={{ color: BRAND.blue }}>
            {yen(purchaseFoodCost)}
            <span className="ml-1 text-xs font-semibold">({baseF.toFixed(1)}% ・ 目標{targetF.toFixed(0)}%)</span>
          </div>
        </div>
        <div>
          <div className={`text-xs ${theme.subText}`}>原価(棚卸後・実際の原価)</div>
          <div className="text-lg font-black" style={{ color: afterF > targetF + 1.5 ? BRAND.alert : BRAND.green }}>
            {yen(totalFoodCost)}
            <span className="ml-1 text-xs font-semibold">({afterF.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.alert }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.green }}>
          保存しました。
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
        style={{ backgroundColor: BRAND.blue }}
      >
        <Plus size={16} /> {saving ? "保存中..." : "保存する"}
      </button>
      <p className={`mt-2 text-xs ${theme.subText}`}>
        ※ 将来的には棚卸商品を個別入力して合計を自動集計できるように拡張予定です。現在は棚卸金額の合計を入力してください。
      </p>
    </Card>
  );
}
