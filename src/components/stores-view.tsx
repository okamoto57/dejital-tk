"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { BRAND, TYPE_PROFILE, type StoreType } from "@/lib/theme";
import { compareJa } from "@/lib/format";
import { Card, Field, useInputCls } from "./ui";

export interface StoreRow {
  id: string;
  name: string;
  code: string;
  type: StoreType;
  targetF: number;
  targetL: number;
}

export function StoresView({ stores }: { stores: StoreRow[] }) {
  const router = useRouter();
  const inputCls = useInputCls();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<StoreType>("ramen");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "custom" = the manually drag-sorted order (persisted as Store.sortOrder).
  // "asc"/"desc" clicking the 店舗名 header shows a temporary alphabetical
  // preview for quickly finding a store; dragging is disabled in that mode.
  const [nameSort, setNameSort] = useState<"custom" | "asc" | "desc">("custom");
  const [order, setOrder] = useState<StoreRow[]>(stores);
  const [reordering, setReordering] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setOrder(stores);
  }, [stores]);

  const displayedStores = useMemo(() => {
    if (nameSort === "custom") return order;
    const sorted = [...order].sort((a, b) => compareJa(a.name, b.name));
    return nameSort === "asc" ? sorted : sorted.reverse();
  }, [order, nameSort]);

  function toggleNameSort() {
    setNameSort((prev) => (prev === "custom" ? "asc" : prev === "asc" ? "desc" : "custom"));
  }

  async function persistOrder(next: StoreRow[]) {
    setReordering(true);
    try {
      await fetch("/api/stores/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeIds: next.map((s) => s.id) }),
      });
      router.refresh();
    } finally {
      setReordering(false);
    }
  }

  function handleDrop(targetIndex: number) {
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragOverIndex(null);
    if (fromIndex === null || fromIndex === targetIndex) return;
    const next = [...order];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    persistOrder(next);
  }

  async function createStore() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "作成に失敗しました");
      }
      setName("");
      setCode("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeStore(id: string) {
    if (!confirm("この店舗を削除しますか?関連する実績データも全て削除されます。")) return;
    await fetch("/api/stores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card title="店舗を追加">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="店舗名">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="例: みなと軒 三宮高架下店" />
          </Field>
          <Field label="店舗コード">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="例: 0001" />
          </Field>
          <Field label="業態">
            <select value={type} onChange={(e) => setType(e.target.value as StoreType)} className={inputCls}>
              {(Object.keys(TYPE_PROFILE) as StoreType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_PROFILE[t].label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              onClick={createStore}
              disabled={submitting || !name || !code}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: BRAND.blue }}
            >
              <Plus size={16} /> {submitting ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.alert }}>
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">目標F比率・目標L比率は業態のデフォルト値が自動設定されます(後で個別に調整可能)。</p>
      </Card>

      <Card title={`店舗一覧(${stores.length}店舗)`}>
        <p className="mb-2 text-xs text-slate-500">
          {nameSort === "custom"
            ? "行の左端の ⠿ をドラッグすると、表示順(ヘッダーの店舗切替やSNS全店比較にも反映されます)を自由に並び替えられます。"
            : "五十音順のプレビュー表示中です。ドラッグで並び替えるには「店舗名」をもう一度クリックしてカスタム順に戻してください。"}
          {reordering && <span className="ml-2 font-semibold" style={{ color: BRAND.blue }}>保存中...</span>}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-slate-500" style={{ borderColor: "#E2E8F0" }}>
                <th className="py-2 pr-1 w-6"></th>
                <th className="py-2 pr-2 font-semibold">
                  <button onClick={toggleNameSort} className="flex items-center gap-1 hover:text-slate-800">
                    店舗名
                    {nameSort === "asc" ? <ArrowUp size={12} /> : nameSort === "desc" ? <ArrowDown size={12} /> : null}
                  </button>
                </th>
                <th className="py-2 pr-2 font-semibold">コード</th>
                <th className="py-2 pr-2 font-semibold">業態</th>
                <th className="py-2 pr-2 text-right font-semibold">目標F</th>
                <th className="py-2 pr-2 text-right font-semibold">目標L</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {displayedStores.map((s, index) => (
                <tr
                  key={s.id}
                  draggable={nameSort === "custom"}
                  onDragStart={() => {
                    dragIndexRef.current = index;
                  }}
                  onDragOver={(e) => {
                    if (nameSort !== "custom") return;
                    e.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex((prev) => (prev === index ? null : prev))}
                  onDrop={(e) => {
                    if (nameSort !== "custom") return;
                    e.preventDefault();
                    handleDrop(index);
                  }}
                  onDragEnd={() => {
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                  }}
                  className="border-b"
                  style={{
                    borderColor: "#F1F5F9",
                    backgroundColor: dragOverIndex === index ? "#EFF6FF" : undefined,
                  }}
                >
                  <td className="py-2 pr-1 text-slate-300" style={{ cursor: nameSort === "custom" ? "grab" : "default" }}>
                    {nameSort === "custom" && <GripVertical size={14} />}
                  </td>
                  <td className="py-2 pr-2 font-semibold">{s.name}</td>
                  <td className="py-2 pr-2 text-slate-500">{s.code}</td>
                  <td className="py-2 pr-2">{TYPE_PROFILE[s.type].label}</td>
                  <td className="py-2 pr-2 text-right">{s.targetF}%</td>
                  <td className="py-2 pr-2 text-right">{s.targetL}%</td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeStore(s.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
