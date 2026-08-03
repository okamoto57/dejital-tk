"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Coins, Wallet, Utensils, TrendingUp, Plus, Trash2, Pencil, Camera, Download } from "lucide-react";
import { createWorker, PSM } from "tesseract.js";
import { BRAND } from "@/lib/theme";
import { PC_CATEGORIES, isFoodCategory } from "@/lib/theme";
import { yen, pct } from "@/lib/format";
import { parseReceiptText } from "@/lib/receipt-ocr";
import { segmentRegions, type Rect } from "@/lib/receipt-segment";
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
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">エクセル出力</p>
            <p className="mt-1 text-xs text-slate-500">小口現金の当月データをExcel形式でダウンロードできます。</p>
            <a
              href={`/api/petty-cash/export?storeId=${storeId}&yearMonth=${yearMonth}`}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Download size={16} /> Excelでダウンロード
            </a>
          </div>
          <PettyCashForm storeId={storeId} />
        </div>

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState(PC_CATEGORIES[0]);
  const [inout, setInout] = useState<"OUT" | "IN">("OUT");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ date?: string; amount?: string }>({});
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; parsedDate: string; amount: number; payee: string; note: string; category: string }>>([]);
  const [parsedCandidates, setParsedCandidates] = useState<Array<{ id: string; date: string; amount: number | null; payee: string; note: string; category: string }>>([]);
  const [appliedCandidateId, setAppliedCandidateId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<Record<string, { date: string; amount: string; payee: string; note: string; category: string }>>({});
  const [editErrors, setEditErrors] = useState<Record<string, { date?: string; amount?: string }>>({});
  const food = isFoodCategory(category);

  useEffect(() => {
    async function loadHistory() {
      const res = await fetch(`/api/petty-cash/receipt-history?storeId=${storeId}`);
      if (!res.ok) return;
      const body = await res.json();
      setHistory(body.histories ?? []);
    }

    void loadHistory();
  }, [storeId]);

  /** Loads an image file and returns it as an HTMLImageElement. */
  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /** Upscales small photos and converts to high-contrast grayscale, which
   * measurably improves Tesseract's accuracy on thermal-printed receipts
   * (faint text, shadows, low DPI phone photos). */
  async function preprocessForOcr(file: File): Promise<File> {
    const img = await loadImage(file);
    const MIN_DIM = 1600;
    const scale = Math.max(1, MIN_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(img.src);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const gray = new Float32Array(d.length / 4);
    const hist = new Array(256).fill(0);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      gray[p] = g;
      hist[Math.max(0, Math.min(255, Math.round(g)))]++;
    }
    // Percentile-based stretch, not literal min/max: a receipt crop's
    // bounding box often includes a sliver of background at the corners
    // (the receipt is rarely perfectly axis-aligned in the photo), and a
    // handful of very dark/bright outlier pixels there would otherwise
    // throw off a naive min/max stretch for the whole crop.
    const total = gray.length;
    const lowCut = total * 0.02;
    const highCut = total * 0.98;
    let running = 0;
    let low = 0;
    let high = 255;
    for (let v = 0; v < 256; v++) {
      running += hist[v];
      if (running >= lowCut) {
        low = v;
        break;
      }
    }
    running = 0;
    for (let v = 255; v >= 0; v--) {
      running += hist[v];
      if (running >= total - highCut) {
        high = v;
        break;
      }
    }
    const range = Math.max(1, high - low);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      // stretch contrast to the full range, then a mild gamma to push
      // midtones toward black/white so thin receipt text stays legible
      const stretched = Math.max(0, Math.min(255, ((gray[p] - low) / range) * 255));
      const v = 255 * Math.pow(stretched / 255, 1.1);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return file;
    return new File([blob], "receipt-processed.png", { type: "image/png" });
  }

  /** Detects how many separate receipts are in one photo by looking for
   * background gaps between them (e.g. several receipts laid on a table),
   * and returns a crop rect per receipt in full-resolution coordinates.
   * Falls back to a single rect covering the whole photo when nothing
   * separable is found (an ordinary single-receipt photo). */
  async function detectReceiptRegions(file: File): Promise<{ rects: Rect[]; sourceCanvas: HTMLCanvasElement }> {
    const img = await loadImage(file);
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = img.naturalWidth;
    fullCanvas.height = img.naturalHeight;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) throw new Error("canvas 2d context unavailable");
    fullCtx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);

    // Segmentation only needs to find boundaries, not read text, so it runs
    // at a much smaller working resolution for speed.
    const SEG_MAX_DIM = 700;
    const segScale = Math.min(1, SEG_MAX_DIM / Math.max(fullCanvas.width, fullCanvas.height));
    const segW = Math.max(1, Math.round(fullCanvas.width * segScale));
    const segH = Math.max(1, Math.round(fullCanvas.height * segScale));
    const segCanvas = document.createElement("canvas");
    segCanvas.width = segW;
    segCanvas.height = segH;
    const segCtx = segCanvas.getContext("2d");
    if (!segCtx) throw new Error("canvas 2d context unavailable");
    segCtx.drawImage(fullCanvas, 0, 0, segW, segH);

    const imgData = segCtx.getImageData(0, 0, segW, segH);
    const grid = new Float32Array(segW * segH);
    const d = imgData.data;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      grid[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }

    const minContent = Math.max(20, Math.round(Math.min(segW, segH) * 0.08));
    const rawRects = segmentRegions(segW, segH, grid, { minContent });

    // Map back to full resolution with a small padding margin so crops
    // don't clip the receipt edge.
    const scaleBack = 1 / segScale;
    const PAD_FRACTION = 0.02;
    const rects = rawRects.map((r) => {
      const w = r.w * scaleBack;
      const h = r.h * scaleBack;
      const padX = w * PAD_FRACTION;
      const padY = h * PAD_FRACTION;
      const x = Math.max(0, r.x * scaleBack - padX);
      const y = Math.max(0, r.y * scaleBack - padY);
      return {
        x,
        y,
        w: Math.min(fullCanvas.width - x, w + padX * 2),
        h: Math.min(fullCanvas.height - y, h + padY * 2),
      };
    });

    return { rects, sourceCanvas: fullCanvas };
  }

  function cropCanvasToFile(source: HTMLCanvasElement, rect: Rect): Promise<File> {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.w));
    canvas.height = Math.max(1, Math.round(rect.h));
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(new Error("canvas 2d context unavailable"));
    ctx.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("crop failed"));
        resolve(new File([blob], "receipt-crop.png", { type: "image/png" }));
      }, "image/png");
    });
  }

  async function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrStatus("読み取り中...");
    setOcrError(null);

    const worker = await createWorker("jpn");
    try {
      // PSM 6 = "assume a single uniform block of text", which suits a
      // tightly cropped receipt far better than the default (PSM 3, tuned
      // for a full structured page with columns/margins) and measurably
      // reduces garbled output on skewed phone photos.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    } catch (e) {
      console.warn("tesseract setParameters failed", e);
    }

    try {
      // NOTE: do not restrict tessedit_char_whitelist here — a digits-only
      // whitelist silently prevents the OCR engine from ever recognizing
      // Japanese store names or item names (only date/amount could be read).
      let targets: File[];
      try {
        const { rects, sourceCanvas } = await detectReceiptRegions(file);
        const MAX_RECEIPTS_PER_PHOTO = 10;
        targets =
          rects.length > 1
            ? await Promise.all(rects.slice(0, MAX_RECEIPTS_PER_PHOTO).map((r) => cropCanvasToFile(sourceCanvas, r)))
            : [file];
      } catch (e) {
        console.warn("領収書の検出に失敗しました。1枚のレシートとして読み取ります。", e);
        targets = [file];
      }

      const candidates: Array<{ id: string; date: string; amount: number | null; payee: string; note: string; category: string }> = [];
      for (let i = 0; i < targets.length; i++) {
        try {
          const processed = await preprocessForOcr(targets[i]).catch(() => targets[i]);
          const { data } = await worker.recognize(processed);
          const parsed = parseReceiptText(data.text || "");
          candidates.push({ id: `c-${Date.now()}-${i}`, ...parsed });
        } catch (innerError) {
          console.warn("1件のレシート読み取りに失敗したため、スキップしました", innerError);
        }
      }

      if (candidates.length === 0) throw new Error("読み取りに失敗しました");

      setParsedCandidates(candidates);
      if (candidates.length === 1) {
        void applyCandidateToForm(candidates[0]);
        setOcrStatus(`読み取り完了: ${candidates[0].payee || "レシート"}`);
      } else {
        setAppliedCandidateId(null);
        setOcrStatus(`複数のレシートを検出しました: ${candidates.length} 件。内容を確認して登録してください。`);
      }
    } catch (e) {
      console.error("handleReceiptUpload failed", e);
      setOcrError("レシートの読み取りに失敗しました。別の画像でお試しください。");
      setOcrStatus("");
    } finally {
      try {
        await worker.terminate();
      } catch (e) {
        console.warn("worker terminate failed", e);
      }
      event.target.value = "";
    }
  }

  function normalizeAmountStr(s: string | number | null | undefined) {
    if (s === null || s === undefined) return "";
    let str = String(s).trim();
    // convert full-width digits to ASCII
      str = str.replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 48));
    // remove common thousands separators and spaces
    str = str.replace(/[\s,，]/g, "");
    // keep digits and dot only
    str = str.replace(/[^0-9.\-]/g, "");
    return str;
  }

  async function applyCandidateToForm(cand: { id?: string; date: string; amount: number | null; payee: string; note: string; category: string }) {
    if (cand.date) setDate(cand.date);
    if (cand.amount !== null) setAmount(String(cand.amount));
    if (cand.payee) setPayee(cand.payee);
    if (cand.note) setNote(cand.note);
    if (cand.category) setCategory(cand.category);
    setInout('OUT');
    if (cand.id) setAppliedCandidateId(cand.id);
    else setAppliedCandidateId(null);
  }

  async function registerCandidate(cand: { id?: string; date: string; amount: number | null; payee: string; note: string; category: string }) {
    if (cand.amount == null) {
      setError('金額が検出されていないため登録できません');
      return;
    }
    const num = Number(cand.amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError('金額が正の数でないため登録できません');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, date: cand.date, category: cand.category, inout: 'OUT', amount: num, payee: cand.payee, note: cand.note }),
      });
      if (!res.ok) throw new Error('登録に失敗しました');
      router.refresh();
      setParsedCandidates((prev) => prev.filter((p) => p.id !== cand.id));
      if (cand.id && appliedCandidateId === cand.id) setAppliedCandidateId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function bulkRegisterAll() {
    if (parsedCandidates.length === 0) return;
    setSubmitting(true);
    try {
      const entries = parsedCandidates.map((c) => ({ date: c.date, category: c.category, inout: 'OUT', amount: c.amount ?? null, payee: c.payee, note: c.note }));
      for (const c of entries) {
        const n = Number(c.amount);
        if (!Number.isFinite(n) || n <= 0) {
          throw new Error('候補のうち金額が不正なものがあります。全て正の数である必要があります');
        }
        c.amount = n;
      }
      const res = await fetch('/api/petty-cash/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, entries }),
      });
      if (!res.ok) throw new Error('一括登録に失敗しました');
      router.refresh();
      setParsedCandidates([]);
      setAppliedCandidateId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '一括登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    let hasFieldError = false;
    if (!date) {
      setFieldErrors((f) => ({ ...f, date: '日付を入力してください' }));
      hasFieldError = true;
    }
    try {
      // normalize amount: handle full-width digits, commas and spaces
      let norm = String(amount ?? "").trim();
      norm = norm.replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 48));
      norm = norm.replace(/[\s,，]/g, "");
      norm = norm.replace(/[^0-9.\-]/g, "");
      const num = Number(norm);
      if (!Number.isFinite(num) || num <= 0) {
        setFieldErrors((f) => ({ ...f, amount: '金額は正の数で入力してください' }));
        hasFieldError = true;
      }
      if (hasFieldError) { setSubmitting(false); return; }

      const res = await fetch("/api/petty-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, date, category, inout, amount: num, payee, note }),
      });
      if (!res.ok) {
        let bodyText = "";
        try {
          const json = await res.json();
          bodyText = json.error ?? JSON.stringify(json);
        } catch {
          bodyText = await res.text().catch(() => "");
        }
        const statusPart = res.status ? ` (status ${res.status})` : "";
        throw new Error(bodyText ? `登録に失敗しました: ${bodyText}${statusPart}` : `登録に失敗しました${statusPart}`);
      }
      setAmount("");
      setPayee("");
      setNote("");
      // if this submit was from an applied candidate, remove that candidate from list
      if (appliedCandidateId) {
        setParsedCandidates((prev) => prev.filter((p) => p.id !== appliedCandidateId));
        setAppliedCandidateId(null);
      }
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
        <div className="rounded-xl border border-dashed p-3" style={{ borderColor: "#E2E8F0" }}>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptUpload} className="hidden" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">レシート写真で自動入力</p>
              <p className="text-xs" style={{ color: "#64748B" }}>
                写真を読み取って、日付・お店・項目・購入品・金額を自動で反映します。複数のレシートが写っている場合は、間に隙間を空けて並べて撮影すると、まとめて検出して候補一覧に分けて表示します。
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND.blue }}
            >
              <Camera size={14} /> 写真を読み取る
            </button>
          </div>
          {(ocrStatus || ocrError) && (
            <p className={`mt-2 text-xs font-medium ${ocrError ? "text-rose-600" : ""}`} style={ocrError ? undefined : { color: BRAND.green }}>
              {ocrError ?? ocrStatus}
            </p>
          )}
          {parsedCandidates.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">検出された領収書候補</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setParsedCandidates([]); setAppliedCandidateId(null); }} className="text-xs text-slate-500">クリア</button>
                  <button onClick={bulkRegisterAll} disabled={submitting} className="inline-flex items-center gap-2 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                    一括登録
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {parsedCandidates.map((c) => (
                  <li key={c.id} className={`flex items-center justify-between gap-3 rounded-lg border px-2 py-2 ${appliedCandidateId === c.id ? 'bg-slate-50' : ''}`}>
                    {editingId === c.id ? (
                      <>
                        <div className="flex-1 space-y-1">
                          <input className="w-full rounded border px-2 py-1 text-sm" value={editMap[c.id]?.payee ?? c.payee} onChange={(e) => setEditMap((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category }), payee: e.target.value } }))} />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <input type="date" className="w-full rounded border px-2 py-1 text-sm" value={editMap[c.id]?.date ?? c.date} onChange={(e) => { setEditMap((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category }), date: e.target.value } })); setEditErrors((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? {}), date: undefined } })); }} />
                              {editErrors[c.id]?.date && <p className="text-rose-600 text-xs mt-1">{editErrors[c.id].date}</p>}
                            </div>
                            <div className="flex-1">
                              <input className="w-full rounded border px-2 py-1 text-sm text-right" value={editMap[c.id]?.amount ?? (c.amount != null ? String(c.amount) : '')} onChange={(e) => { setEditMap((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category }), amount: e.target.value } })); setEditErrors((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? {}), amount: undefined } })); }} placeholder="金額" />
                              {editErrors[c.id]?.amount && <p className="text-rose-600 text-xs mt-1 text-right">{editErrors[c.id].amount}</p>}
                            </div>
                          </div>
                          <input className="w-full rounded border px-2 py-1 text-sm" value={editMap[c.id]?.note ?? c.note} onChange={(e) => setEditMap((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category }), note: e.target.value } }))} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={async () => {
                            const entry = editMap[c.id] ?? { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category };
                            const errs: { date?: string; amount?: string } = {};
                            if (!entry.date) errs.date = '日付を入力してください';
                            const norm = normalizeAmountStr(entry.amount);
                            const num = Number(norm);
                            if (!Number.isFinite(num) || num <= 0) errs.amount = '金額は正の数で入力してください';
                            if (errs.date || errs.amount) { setEditErrors((s) => ({ ...s, [c.id]: errs })); return; }
                            // update candidate in list
                            setParsedCandidates((prev) => prev.map((p) => p.id === c.id ? ({ ...p, date: entry.date, amount: num, payee: entry.payee, note: entry.note, category: entry.category }) : p));
                            setEditingId(null);
                            setEditErrors((s) => ({ ...s, [c.id]: {} }));
                          }} className="text-xs bg-green-600 text-white rounded px-2 py-1">保存</button>
                          <button onClick={() => { setEditingId(null); }} className="text-xs text-slate-600 rounded px-2 py-1">キャンセル</button>
                          <button onClick={() => { const entry = editMap[c.id] ?? { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category }; applyCandidateToForm({ id: c.id, date: entry.date, amount: Number(normalizeAmountStr(entry.amount)), payee: entry.payee, note: entry.note, category: entry.category }); }} className="text-xs text-slate-600">フォームへ反映</button>
                          <button onClick={() => registerCandidate({ id: c.id, date: (editMap[c.id]?.date ?? c.date), amount: Number(normalizeAmountStr(editMap[c.id]?.amount ?? (c.amount != null ? String(c.amount) : ''))), payee: editMap[c.id]?.payee ?? c.payee, note: editMap[c.id]?.note ?? c.note, category: editMap[c.id]?.category ?? c.category })} disabled={submitting} className="text-xs text-white rounded bg-amber-500 px-2 py-1">登録</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="font-semibold">{c.payee || 'レシート候補'}</p>
                          <p className="text-xs text-slate-500">{c.date} ・ {c.note || c.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold">{c.amount != null ? yen(c.amount) : '金額不明'}</p>
                          </div>
                          <button onClick={() => { setEditingId(c.id); setEditMap((m) => ({ ...m, [c.id]: { date: c.date, amount: c.amount != null ? String(c.amount) : '', payee: c.payee, note: c.note, category: c.category } })); }} className="text-xs text-slate-600">編集</button>
                          <button onClick={() => applyCandidateToForm(c)} className="text-xs text-slate-600">フォームへ反映</button>
                          <button onClick={() => registerCandidate(c)} disabled={submitting} className="text-xs text-white rounded bg-amber-500 px-2 py-1">登録</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
              {parsedCandidates.length > 1 && (
                <div className="mt-2 text-xs text-amber-700">
                  <p>画像から複数の領収書候補が検出されています。手入力から登録すると複数登録に対応できません。</p>
                  <div className="mt-1 flex items-center gap-2">
                    <button onClick={() => { setParsedCandidates([]); setAppliedCandidateId(null); }} className="text-xs underline">候補を無視して手入力で続ける</button>
                    <span className="text-slate-500">または候補一覧から 個別登録 または 一括登録 を行ってください。</span>
                  </div>
                </div>
              )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="日付">
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setFieldErrors((f) => ({ ...f, date: undefined })); }} className={inputCls} />
            {fieldErrors.date && <p className="text-rose-600 text-xs mt-1">{fieldErrors.date}</p>}
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
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setFieldErrors((f) => ({ ...f, amount: undefined })); }} placeholder="0" className={`${inputCls} text-right`} />
            {fieldErrors.amount && <p className="text-rose-600 text-xs mt-1 text-right">{fieldErrors.amount}</p>}
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
          disabled={submitting || (parsedCandidates.length > 0 && !appliedCandidateId)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: BRAND.blue }}
        >
          <Plus size={16} /> {submitting ? "登録中..." : "登録する"}
        </button>

        {history.length > 0 && (
          <div className="rounded-xl border p-3" style={{ borderColor: "#E2E8F0" }}>
            <p className="mb-2 text-sm font-semibold">レシート履歴</p>
            <ul className="space-y-2 text-xs">
              {history.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-2">
                  <div>
                    <p className="font-semibold">{item.payee}</p>
                    <p style={{ color: "#64748B" }}>{item.note || item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{yen(item.amount)}</p>
                    <p style={{ color: "#64748B" }}>{item.parsedDate.slice(5, 10).replace('-', '/')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
