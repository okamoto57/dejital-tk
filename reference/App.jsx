import React, { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, PieChart, Pie, Cell, LineChart,
} from "recharts";
import {
  Search, Store, Sun, Moon, LayoutDashboard, Wallet, Megaphone,
  AlertTriangle, TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  Utensils, Users, Coins, Sparkles, ArrowUpRight, ArrowDownRight,
  Instagram, Video, MessageCircle, FileDown, CheckCircle2, ChevronRight, CalendarDays,
} from "lucide-react";

/* ============================================================
   デジタル・阪神TK プロトタイプ  —  飲食店経営管理BIシステム
   ============================================================ */

const BRAND = {
  blue: "#0A6DC2",
  blueDark: "#08528F",
  green: "#21A24C",
  alert: "#E11D6F",
  amber: "#F59E0B",
  red: "#EF4444",
};

const FLARO_COLORS = {
  S: "#21A24C",
  F: "#1D4ED8",
  L: "#2563EB",
  A: "#3B82F6",
  R: "#60A5FA",
  O: "#0EA5E9",
};

const STORES = [
  "みなと軒 三宮高架下店",
  "麺道 しゅはり 六甲道店",
  "麺道 しゅはり 三宮センタープラザ店",
  "みなと軒 垂水駅前店",
  "みなと軒セントラルキッチン店",
  "九州ラー麺 加虎 住吉本店",
  "和牛之国",
  "麺道 しゅはり 伊丹店",
  "麺道 しゅはり 石橋店",
  "天然ラジウム療養泉 華の湯",
  "京の虎牛",
  "長浜ラーメン まる長",
  "博多長浜ラーメン一番 松原南店",
  "神来高の原店",
  "べらしお",
  "ナカモズマシマシ",
  "虎のゆうや",
  "和牛王国",
  "ひびの亭",
  "キョロちゃん 森ノ宮店",
  "キョロちゃん 池田店",
  "ダイニング蒼",
  "すずらんの湯",
  "蒼SWEET",
];

/* ---------- 業態の推定 ---------- */
function storeType(name) {
  if (/セントラルキッチン/.test(name)) return "ck";
  if (/湯|療養泉/.test(name)) return "spa";
  if (/SWEET|スイーツ/.test(name)) return "sweets";
  if (/みなと軒/.test(name)) return "ramen";
  if (/虎のゆうや|ひびの亭|キョロちゃん/.test(name)) return "yakiniku";
  if (/和牛|牛|焼肉/.test(name)) return "yakiniku";
  if (/麺|ラーメン|ラー麺|マシマシ|べらしお|神来/.test(name)) return "ramen";
  return "dining";
}

const TYPE_PROFILE = {
  ramen:    { label: "ラーメン",   targetF: 30, targetL: 25, sales: [8_200_000, 13_800_000], spend: [980, 1380] },
  yakiniku: { label: "焼肉・和牛", targetF: 38, targetL: 22, sales: [12_500_000, 21_000_000], spend: [4200, 6800] },
  spa:      { label: "温浴施設",   targetF: 14, targetL: 30, sales: [6_400_000, 11_200_000], spend: [1600, 2600] },
  sweets:   { label: "スイーツ",   targetF: 28, targetL: 24, sales: [4_200_000, 7_400_000], spend: [780, 1480] },
  dining:   { label: "ダイニング", targetF: 30, targetL: 26, sales: [7_000_000, 12_400_000], spend: [2600, 4600] },
  ck:       { label: "セントラルキッチン", targetF: 46, targetL: 31, sales: [5_800_000, 9_200_000], spend: [0, 0] },
};

/* ---------- 決定論的乱数 ---------- */
function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000000007;
  return h;
}
const rr = (rng, a, b) => a + rng() * (b - a);
const ri = (rng, a, b) => Math.round(rr(rng, a, b));

const DAYS_IN_MONTH = 30;
const TODAY = 24;

/* ---------- 店舗の基礎データ生成 ---------- */
function buildStore(idx) {
  const name = STORES[idx];
  const type = storeType(name);
  const p = TYPE_PROFILE[type];
  const rng = makeRng(hashName(name) + idx * 7919 + 101);

  const sales = Math.round(rr(rng, p.sales[0], p.sales[1]) / 10000) * 10000;
  const budgetSales = Math.round((sales * rr(rng, 0.94, 1.09)) / 10000) * 10000;

  const beginInv = Math.round(sales * rr(rng, 0.05, 0.09));
  const endInv = Math.round(beginInv * rr(rng, 0.82, 1.14));
  const invAdjust = beginInv - endInv;

  const baseFoodRatio = p.targetF + rr(rng, 0.6, 4.2);
  const baseFoodCost = Math.round(sales * baseFoodRatio / 100);
  const infomartPurchase = baseFoodCost - invAdjust;

  const laborRatio = p.targetL + rr(rng, -1.5, 3.4);
  const laborCost = Math.round(sales * laborRatio / 100);
  const laborStaff = Math.round(laborCost * rr(rng, 0.42, 0.55));
  const laborTimee = Math.round(laborCost * rr(rng, 0.06, 0.16));
  const laborPA = laborCost - laborStaff - laborTimee;

  const avgSpend = type === "ck" ? 0 : ri(rng, p.spend[0], p.spend[1]);
  const customers = type === "ck" ? 0 : Math.round(sales / Math.max(avgSpend, 1));

  const googleScore = +rr(rng, 3.4, 4.6).toFixed(1);
  const shiftMatch = +rr(rng, 88, 99).toFixed(1);
  const employees = ri(rng, 6, 22);

  const adRatio = rr(rng, 3.0, 5.4);
  const rentRatio = rr(rng, 8.0, 12.0);
  const otherRatio = rr(rng, 7.5, 11.0);

  // 日別データ（累計＋着地予測）
  const dailyBudget = budgetSales / DAYS_IN_MONTH;
  const dowArr = ["月", "火", "水", "木", "金", "土", "日"];
  const daily = [];
  let actualCum = 0, budgetCum = 0;
  const drng = makeRng(hashName(name) + 555);
  let recentSum = 0, recentN = 0;
  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    const dow = dowArr[(d - 1) % 7];
    const weekend = dow === "土" || dow === "日";
    const weekendBoost = weekend ? 1.22 : 1.0;
    const bud = Math.round(dailyBudget * weekendBoost);
    budgetCum += bud;
    let actual = null, aCum = null, foodBase = null, labor = null;
    if (d <= TODAY) {
      actual = Math.round(dailyBudget * weekendBoost * rr(drng, 0.82, 1.16));
      actualCum += actual;
      aCum = actualCum;
      const fr = Math.max(8, Math.min(60, baseFoodRatio + rr(drng, -4, 5)));
      foodBase = Math.round(actual * fr / 100);
      const lr = Math.max(8, Math.min(55, laborRatio * (weekend ? rr(drng, 0.62, 0.82) : rr(drng, 0.9, 1.28))));
      labor = Math.round(actual * lr / 100);
      if (d > TODAY - 7) { recentSum += actual; recentN++; }
    }
    daily.push({ day: String(d).padStart(2, "0"), dnum: d, dow, weekend, budget: bud, daily: actual, budgetCum: Math.round(budgetCum), actualCum: aCum, forecastCum: null, foodBase, labor });
  }
  const avgRecent = recentN ? recentSum / recentN : dailyBudget;
  let fc = actualCum;
  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    if (d === TODAY) daily[d - 1].forecastCum = Math.round(actualCum);
    if (d > TODAY) {
      const weekendBoost = (d % 7 === 6 || d % 7 === 0) ? 1.22 : 1.0;
      fc += avgRecent * weekendBoost;
      daily[d - 1].forecastCum = Math.round(fc);
    }
  }
  const landing = Math.round(fc);

  // グルメ媒体
  const mediaNames = ["ホットペッパー", "食べログ", "Retty", "ぐるなび", "大衆点評"];
  const mrng = makeRng(hashName(name) + 313);
  const gourmet = mediaNames.map((m) => {
    const cost = ri(mrng, 30000, 160000);
    const roi = +rr(mrng, 1.4, 6.8).toFixed(1);
    const revenue = Math.round(cost * roi);
    const guests = ri(mrng, 40, 460);
    const score = +rr(mrng, 3.1, 4.4).toFixed(1);
    return { media: m, cost, revenue, roi, guests, score };
  });

  // SNS
  const srng = makeRng(hashName(name) + 777);
  const sns = {
    instagram: { followers: ri(srng, 3800, 62000), reach: ri(srng, 6000, 34000), engage: +rr(srng, 2.4, 7.8).toFixed(1), growth: ri(srng, 120, 2100) },
    tiktok: { followers: ri(srng, 1200, 48000), views: ri(srng, 12000, 380000), engage: +rr(srng, 3.2, 12.5).toFixed(1), growth: ri(srng, 80, 3400) },
    line: { friends: ri(srng, 2400, 24000), reserve: ri(srng, 120, 720), coupon: ri(srng, 200, 2400), growth: ri(srng, 60, 900) },
  };
  const ugc = Array.from({ length: 6 }).map((_, i) => ({
    month: `${i + 1}月`,
    instagram: ri(srng, 20, 180) + i * ri(srng, 2, 12),
    tiktok: ri(srng, 10, 140) + i * ri(srng, 3, 16),
    line: ri(srng, 8, 90) + i * ri(srng, 1, 8),
  }));

  // Google ビジネスプロフィール / MEO
  const grng = makeRng(hashName(name) + 909);
  const gReviews = ri(grng, 60, 820);
  const gReviewGrowth = ri(grng, 2, 26);
  const gScorePrev = +Math.max(2.8, googleScore - rr(grng, -0.12, 0.22)).toFixed(1);
  const meoTotal = ri(grng, 90, 160);
  const meoRank = ri(grng, 3, Math.round(meoTotal * 0.55));
  const gbp = {
    score: googleScore,
    scorePrev: gScorePrev,
    scoreDelta: +(googleScore - gScorePrev).toFixed(1),
    reviews: gReviews,
    reviewsDelta: gReviewGrowth,
    monthlyNew: ri(grng, 3, 42),
    meoRank, meoTotal,
    meoAvgScore: +rr(grng, 3.3, 3.8).toFixed(1),
    complete: ri(grng, 62, 96),
    impressions: ri(grng, 8000, 132000),
  };
  const tScorePrev = +rr(grng, 3.0, 3.85).toFixed(2);
  const tabelog = {
    score: +Math.min(4.0, tScorePrev + rr(grng, -0.04, 0.08)).toFixed(2),
    scorePrev: tScorePrev,
    reviews: ri(grng, 20, 420),
    reviewsDelta: ri(grng, 1, 18),
  };
  tabelog.scoreDelta = +(tabelog.score - tabelog.scorePrev).toFixed(2);

  return {
    idx, name, type, typeLabel: p.label, targetF: p.targetF, targetL: p.targetL,
    sales, budgetSales, beginInv, endInv, infomartPurchase, baseFoodCost,
    laborCost, laborStaff, laborTimee, laborPA, laborRatio,
    avgSpend, customers, googleScore, shiftMatch, employees,
    adRatio, rentRatio, otherRatio,
    daily, landing, gourmet, sns, ugc, gbp, tabelog,
  };
}

/* ---------- 小口現金の初期データ ---------- */
const PC_CATEGORIES = ["食材買い出し", "食材(生鮮)", "消耗品", "雑費", "交通費", "備品", "その他"];
const isFoodCategory = (c) => c.includes("食材");

function initialPettyCash(idx) {
  const rng = makeRng(hashName(STORES[idx]) + 42);
  const opening = ri(rng, 30000, 90000);
  const seeds = [
    { cat: "食材買い出し", amt: ri(rng, 8000, 42000), payee: "スーパー", note: "野菜・青果 追加仕入" },
    { cat: "消耗品", amt: ri(rng, 800, 4200), payee: "コンビニ", note: "洗剤・ペーパー" },
    { cat: "交通費", amt: ri(rng, 500, 2600), payee: "ー", note: "銀行往復" },
    { cat: "食材(生鮮)", amt: ri(rng, 4000, 26000), payee: "市場", note: "鮮魚・精肉" },
  ];
  const entries = seeds.map((s, i) => ({
    id: `seed-${idx}-${i}`,
    day: ri(rng, 1, TODAY),
    category: s.cat,
    inout: "out",
    amount: s.amt,
    payee: s.payee,
    note: s.note,
    food: isFoodCategory(s.cat),
  })).sort((a, b) => a.day - b.day);
  return { opening, entries };
}

/* ---------- フォーマッタ ---------- */
const yen = (n) => "¥" + Math.round(n).toLocaleString("ja-JP");
const sen = (n) => (n / 1000).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + " 千円";
const man = (n) => (n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + " 万円";
const pct = (n, d = 1) => n.toFixed(d) + "%";

/* ============================================================
   メインコンポーネント
   ============================================================ */
export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [storeIdx, setStoreIdx] = useState(0);
  const [pcMap, setPcMap] = useState(() => {
    const m = {};
    STORES.forEach((_, i) => { m[i] = initialPettyCash(i); });
    return m;
  });

  const stores = useMemo(() => STORES.map((_, i) => buildStore(i)), []);
  const s = stores[storeIdx];
  const pc = pcMap[storeIdx];

  /* 小口現金の集計 */
  const pcAgg = useMemo(() => {
    let inSum = 0, outSum = 0, foodSum = 0;
    const byCat = {};
    pc.entries.forEach((e) => {
      if (e.inout === "in") inSum += e.amount;
      else {
        outSum += e.amount;
        if (e.food) foodSum += e.amount;
        byCat[e.category] = (byCat[e.category] || 0) + e.amount;
      }
    });
    return { inSum, outSum, foodSum, balance: pc.opening + inSum - outSum, byCat };
  }, [pc]);

  /* 原価・比率（小口食材費を自動合算） */
  const metrics = useMemo(() => {
    const totalFoodCost = s.infomartPurchase + pcAgg.foodSum + s.beginInv - s.endInv;
    const actualF = (totalFoodCost / s.sales) * 100;
    const baseF = (s.baseFoodCost / s.sales) * 100;
    const actualL = (s.laborCost / s.sales) * 100;
    const fl = actualF + actualL;
    const budgetAchieve = (s.landing / s.budgetSales) * 100;
    const fDelta = actualF - baseF; // 小口による上昇分
    return { totalFoodCost, actualF, baseF, actualL, fl, budgetAchieve, fDelta };
  }, [s, pcAgg]);

  const flAlert = metrics.actualF > s.targetF + 1.5 || metrics.actualL > s.targetL + 2 || metrics.fl > 60;

  /* 小口現金の操作 */
  const setPc = useCallback((updater) => {
    setPcMap((prev) => ({ ...prev, [storeIdx]: updater(prev[storeIdx]) }));
  }, [storeIdx]);

  const addEntry = useCallback((entry) => {
    setPc((cur) => ({ ...cur, entries: [...cur.entries, { ...entry, id: `e-${Date.now()}-${Math.random()}` }] }));
  }, [setPc]);

  const quickFoodBuy = useCallback((amount = 5000) => {
    addEntry({ day: TODAY, category: "食材買い出し", inout: "out", amount, payee: "スーパー", note: "急な買い出し", food: true });
  }, [addEntry]);

  const removeEntry = useCallback((id) => {
    setPc((cur) => ({ ...cur, entries: cur.entries.filter((e) => e.id !== id) }));
  }, [setPc]);

  const setOpening = useCallback((v) => {
    setPc((cur) => ({ ...cur, opening: v }));
  }, [setPc]);

  /* テーマ */
  const bg = dark ? "#0B1220" : "#EEF2F7";
  const card = dark ? "bg-slate-900" : "bg-white";
  const cardBorder = dark ? "border-slate-800" : "border-slate-200";
  const text = dark ? "text-slate-100" : "text-slate-800";
  const subText = dark ? "text-slate-400" : "text-slate-500";
  const chartGrid = dark ? "#1E293B" : "#EEF2F7";
  const chartAxis = dark ? "#64748B" : "#94A3B8";

  const theme = { dark, card, cardBorder, text, subText, chartGrid, chartAxis };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: bg }}>
      <div className={`mx-auto max-w-screen-xl px-4 pb-16 pt-4 ${text}`} style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Yu Gothic',system-ui,sans-serif" }}>

        {/* ===== ヘッダー ===== */}
        <header className={`${card} ${cardBorder} mb-4 rounded-2xl border px-5 py-3.5 shadow-sm`}>
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${cardBorder} ${dark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                <Store size={16} style={{ color: BRAND.blue }} />
                <select
                  value={storeIdx}
                  onChange={(e) => setStoreIdx(Number(e.target.value))}
                  className={`max-w-xs cursor-pointer bg-transparent text-sm font-semibold outline-none ${text}`}
                >
                  {STORES.map((n, i) => (
                    <option key={i} value={i} className="text-slate-800">{i + 1}. {n}</option>
                  ))}
                </select>
              </div>
              <span className={`hidden text-xs sm:inline ${subText}`}>2025 / 12 月次</span>
              <button
                onClick={() => setDark((d) => !d)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${cardBorder} ${dark ? "bg-slate-800 text-amber-300" : "bg-slate-50 text-slate-600"}`}
                title="テーマ切替"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>

          {/* タブ */}
          <nav className="mt-3.5 flex flex-wrap gap-1.5">
            {[
              { id: "dashboard", label: "経営・デジタル・阪神TKダッシュボード", icon: LayoutDashboard },
              { id: "salesfl", label: "日別 売上・FL", icon: CalendarDays },
              { id: "pettycash", label: "小口現金 出納帳", icon: Wallet },
              { id: "marketing", label: "グルメ・SNS集計分析", icon: Megaphone },
            ].map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition"
                  style={active
                    ? { backgroundColor: BRAND.blue, color: "#fff" }
                    : { backgroundColor: dark ? "#1E293B" : "#F1F5F9", color: dark ? "#94A3B8" : "#475569" }}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* ===== 店舗名バナー ===== */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">{s.name}</h1>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: BRAND.blueDark }}>{s.typeLabel}</span>
          <span className={`text-xs ${subText}`}>店舗コード {String(s.idx + 1).padStart(4, "0")}</span>
        </div>

        {tab === "dashboard" && (
          <Dashboard s={s} metrics={metrics} pcAgg={pcAgg} flAlert={flAlert} theme={theme} onQuickBuy={() => { quickFoodBuy(); setTab("pettycash"); }} />
        )}
        {tab === "salesfl" && (
          <SalesFL s={s} pc={pc} metrics={metrics} theme={theme} />
        )}
        {tab === "pettycash" && (
          <PettyCash s={s} pc={pc} pcAgg={pcAgg} metrics={metrics} theme={theme}
            addEntry={addEntry} removeEntry={removeEntry} quickFoodBuy={quickFoodBuy} setOpening={setOpening} />
        )}
        {tab === "marketing" && (
          <Marketing s={s} theme={theme} />
        )}

        <footer className={`mt-8 text-center text-xs ${subText}`}>
          デジタル・阪神TK プロトタイプ（デモ）— スマレジ / インフォマート / 棚卸連携イメージ・数値はサンプルです
        </footer>
      </div>
    </div>
  );
}

/* ============================================================
   ロゴ
   ============================================================ */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
        <circle cx="42" cy="42" r="30" stroke={BRAND.blue} strokeWidth="11" fill="none" />
        <path d="M64 64 L86 86" stroke={BRAND.blue} strokeWidth="11" strokeLinecap="round" />
        <path d="M55 40 a13 13 0 1 1 -13 -13" stroke={BRAND.blue} strokeWidth="7" fill="none" strokeLinecap="round" transform="rotate(20 42 42)" opacity="0" />
      </svg>
      <span className="text-xl font-black tracking-tight" style={{ color: BRAND.blue }}>デジタル・阪神TK</span>
    </div>
  );
}

/* ============================================================
   共通カード
   ============================================================ */
function Card({ theme, className = "", children, title, right }) {
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-2xl border p-4 shadow-sm ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-bold">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function FlaroBadge({ k }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: FLARO_COLORS[k] }}>{k}</span>
  );
}

function Stars({ score, empty = "#CBD5E1" }) {
  return (
    <span className="whitespace-nowrap" style={{ letterSpacing: "1px" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ color: i < Math.round(score) ? "#F5A623" : empty }}>★</span>
      ))}
    </span>
  );
}

function Delta({ value, suffix = "", digits = 0 }) {
  const up = value >= 0;
  const v = Math.abs(value).toFixed(digits);
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: up ? BRAND.green : BRAND.red }}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{up ? "+" : "−"}{v}{suffix}
    </span>
  );
}

/* ============================================================
   ダッシュボード
   ============================================================ */
function Dashboard({ s, metrics, pcAgg, flAlert, theme, onQuickBuy }) {
  const radarData = useMemo(() => {
    const clamp = (v, mx = 120) => Math.max(0, Math.min(mx, v));
    return [
      { axis: "予算達成", value: clamp(metrics.budgetAchieve) },
      { axis: "売上/人", value: clamp((s.sales / Math.max(s.employees, 1) / 900000) * 100) },
      { axis: "F健全度", value: clamp((s.targetF / metrics.actualF) * 100) },
      { axis: "L健全度", value: clamp((s.targetL / metrics.actualL) * 100) },
      { axis: "シフト整合", value: s.shiftMatch },
      { axis: "Google評価", value: (s.googleScore / 5) * 100 },
    ];
  }, [s, metrics]);

  const radarScore = Math.round(radarData.reduce((a, d) => a + d.value, 0) / radarData.length);

  const flaroBreakdown = [
    { key: "F", label: "食材原価", ratio: metrics.actualF, target: s.targetF },
    { key: "L", label: "人件費", ratio: metrics.actualL, target: s.targetL },
    { key: "A", label: "広告宣伝費", ratio: s.adRatio, target: 5 },
    { key: "R", label: "家賃", ratio: s.rentRatio, target: 10 },
    { key: "O", label: "その他", ratio: s.otherRatio, target: 10 },
  ];
  const opProfit = 100 - metrics.actualF - metrics.actualL - s.adRatio - s.rentRatio - s.otherRatio;

  return (
    <div className="space-y-4">
      {/* アラート */}
      {flAlert && (
        <div className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: theme.dark ? "rgba(225,29,111,0.12)" : "#FDF2F8", borderColor: "rgba(225,29,111,0.35)", color: BRAND.alert }}>
          <AlertTriangle size={18} />
          FL比率が目標を超過しています（実際FL {pct(metrics.fl)} / 目標 {pct(s.targetF + s.targetL)}）。原価・人件費の異常値を早期に確認してください。
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard theme={theme} icon={<TrendingUp size={16} />} accent={BRAND.green} label="当月売上（税抜）"
          value={yen(s.sales)} sub={`予算 ${man(s.budgetSales)} / 着地予測 ${man(s.landing)}`} />

        <SummaryCard theme={theme} icon={<Utensils size={16} />} accent={metrics.actualF > s.targetF + 1.5 ? BRAND.alert : BRAND.blue}
          label="実際F比率（小口食材費 合算後）"
          value={pct(metrics.actualF)}
          sub={<span>目標 {pct(s.targetF, 0)} ・ 小口分 <b style={{ color: BRAND.alert }}>+{pct(metrics.fDelta, 2)}</b></span>}
          badge={<FlaroBadge k="F" />} />

        <SummaryCard theme={theme} icon={<Users size={16} />} accent={metrics.actualL > s.targetL + 2 ? BRAND.amber : BRAND.blue}
          label="L比率（人件費）"
          value={pct(metrics.actualL)}
          sub={`目標 ${pct(s.targetL, 0)} ・ 社員/PA/ﾀｲﾐｰ 連動`}
          badge={<FlaroBadge k="L" />} />

        <SummaryCard theme={theme} icon={<AlertTriangle size={16} />} accent={flAlert ? BRAND.alert : BRAND.green}
          label="FL判定"
          value={pct(metrics.fl)}
          sub={flAlert ? "⚠ 目標超過 — 要対処" : "✓ 適正レンジ内"} />
      </div>

      {/* レーダー & 予実 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card theme={theme} className="lg:col-span-2" title="店舗レーダーチャート">
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
                <div className="text-4xl font-black" style={{ color: BRAND.green }}>{radarScore}</div>
                <div className={`text-xs ${theme.subText}`}>総合スコア</div>
              </div>
            </div>
          </div>
        </Card>

        <Card theme={theme} className="lg:col-span-3" title="売上予実 ＆ 月末着地予測"
          right={<span className={`text-xs ${theme.subText}`}>着地予測 <b style={{ color: BRAND.blue }}>{man(s.landing)}</b>（達成率 {pct(metrics.budgetAchieve)}）</span>}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={s.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.chartGrid} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: theme.chartAxis, fontSize: 10 }} interval={2} />
              <YAxis tickFormatter={(v) => (v / 10000).toFixed(0) + "万"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={44} />
              <Tooltip content={<ChartTip theme={theme} money />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar name="日次売上" dataKey="daily" fill={theme.dark ? "#334155" : "#CBD5E1"} radius={[3, 3, 0, 0]} maxBarSize={12} />
              <Line name="予算累計" dataKey="budgetCum" stroke={theme.chartAxis} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              <Line name="実績累計" dataKey="actualCum" stroke={BRAND.green} strokeWidth={2.5} dot={false} />
              <Line name="着地予測" dataKey="forecastCum" stroke={BRAND.blue} strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* FLARO内訳 & 小口シミュ導線 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card theme={theme} className="lg:col-span-2" title="FL コスト構成（実績比率）">
          <div className="space-y-2.5">
            {flaroBreakdown.map((row) => {
              const over = row.ratio > row.target + 1;
              const width = Math.min(100, (row.ratio / 55) * 100);
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <FlaroBadge k={row.key} />
                  <div className="w-20 text-xs font-semibold">{row.label}</div>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-md" style={{ backgroundColor: theme.dark ? "#1E293B" : "#F1F5F9" }}>
                    <div className="h-full rounded-md" style={{ width: `${width}%`, backgroundColor: over ? BRAND.alert : FLARO_COLORS[row.key] }} />
                  </div>
                  <div className="w-14 text-right text-xs font-bold" style={{ color: over ? BRAND.alert : theme.dark ? "#E2E8F0" : "#334155" }}>{pct(row.ratio)}</div>
                  <div className={`w-16 text-right text-xs ${theme.subText}`}>目標{pct(row.target, 0)}</div>
                </div>
              );
            })}
            <div className="mt-1 flex items-center justify-between border-t pt-2.5" style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
              <span className="text-xs font-semibold">営業利益率（推定）</span>
              <span className="text-lg font-black" style={{ color: opProfit > 0 ? BRAND.green : BRAND.red }}>{pct(opProfit)}</span>
            </div>
          </div>
        </Card>

        <Card theme={theme} title="原価連動シミュレーション">
          <p className={`mb-3 text-xs leading-relaxed ${theme.subText}`}>
            小口現金で「食材の急な買い出し」を登録すると、当月仕入高に自動合算され、実際F比率が即座に上昇します。
          </p>
          <div className="mb-3 rounded-xl p-3" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F0F7FF" }}>
            <div className={`text-xs ${theme.subText}`}>総食材原価＝仕入高＋小口(食材)＋月初棚卸−月末棚卸</div>
            <div className="mt-1.5 flex items-end justify-between">
              <div>
                <div className={`text-xs ${theme.subText}`}>現在の小口(食材)合算</div>
                <div className="text-xl font-black" style={{ color: BRAND.alert }}>{yen(pcAgg.foodSum)}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs ${theme.subText}`}>実際F比率</div>
                <div className="text-xl font-black" style={{ color: BRAND.blue }}>{pct(metrics.actualF)}</div>
              </div>
            </div>
          </div>
          <button onClick={onQuickBuy}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95"
            style={{ backgroundColor: BRAND.alert }}>
            <Plus size={16} /> 食材の急な買い出しを登録（¥5,000）
          </button>
          <div className={`mt-2 flex items-center justify-center gap-1 text-xs ${theme.subText}`}>
            出納帳タブへ移動して詳細登録 <ChevronRight size={12} />
          </div>
        </Card>
      </div>

      {/* 補助KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <MiniKpi theme={theme} label="客数" value={s.customers ? s.customers.toLocaleString() + " 人" : "—"} />
        <MiniKpi theme={theme} label="客単価" value={s.avgSpend ? yen(s.avgSpend) : "—"} />
        <MiniKpi theme={theme} label="インフォマート仕入高" value={yen(s.infomartPurchase)} />
        <MiniKpi theme={theme} label="棚卸調整（月初−月末）" value={yen(s.beginInv - s.endInv)} />
        <MiniKpi theme={theme} label="シフト整合率" value={pct(s.shiftMatch)} />
        <MiniKpi theme={theme} label="Googleスコア" value={s.googleScore.toFixed(1) + " ★"} />
      </div>

      {/* 外部レビュースコア（ダッシュボード最下部） */}
      <Card theme={theme} title="外部レビュースコア">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl p-3.5" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: "#4285F4", fontWeight: 700 }}>G</span>
            <div>
              <div className={`text-xs ${theme.subText}`}>Google スコア</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black" style={{ color: BRAND.blue }}>{s.gbp.score.toFixed(1)}</span>
                <Stars score={s.gbp.score} empty={theme.dark ? "#334155" : "#E2E8F0"} />
              </div>
            </div>
            <div className="ml-auto text-right">
              <Delta value={s.gbp.scoreDelta} digits={1} />
              <div className={`text-xs ${theme.subText}`}>口コミ {s.gbp.reviews.toLocaleString()} 件</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl p-3.5" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: "#FF2800", fontWeight: 700, fontSize: 11 }}>食</span>
            <div>
              <div className={`text-xs ${theme.subText}`}>食べログ スコア</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black" style={{ color: "#FF2800" }}>{s.tabelog.score.toFixed(2)}</span>
                <Stars score={s.tabelog.score} empty={theme.dark ? "#334155" : "#E2E8F0"} />
              </div>
            </div>
            <div className="ml-auto text-right">
              <Delta value={s.tabelog.scoreDelta} digits={2} />
              <div className={`text-xs ${theme.subText}`}>口コミ {s.tabelog.reviews.toLocaleString()} 件</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ theme, icon, accent, label, value, sub, badge }) {
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-2xl border p-4 shadow-sm`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: accent }}>{icon}</span>
        <span className={`text-xs font-semibold leading-tight ${theme.subText}`}>{label}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="text-2xl font-black tracking-tight" style={{ color: accent }}>{value}</div>
      <div className={`mt-1 text-xs ${theme.subText}`}>{sub}</div>
    </div>
  );
}

function MiniKpi({ theme, label, value }) {
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-xl border px-3 py-2.5 shadow-sm`}>
      <div className={`text-xs ${theme.subText}`}>{label}</div>
      <div className="mt-0.5 text-base font-bold">{value}</div>
    </div>
  );
}

/* ============================================================
   小口現金 出納帳
   ============================================================ */
function PettyCash({ s, pc, pcAgg, metrics, theme, addEntry, removeEntry, quickFoodBuy, setOpening }) {
  const [day, setDay] = useState(TODAY);
  const [category, setCategory] = useState("食材買い出し");
  const [inout, setInout] = useState("out");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState(null);

  const food = isFoodCategory(category);

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const before = metrics.actualF;
    addEntry({ day: Number(day), category, inout, amount: amt, payee: payee || "ー", note, food });
    if (inout === "out" && food) {
      const after = before + (amt / s.sales) * 100;
      setFlash({ before, after, amt });
      setTimeout(() => setFlash(null), 4500);
    }
    setAmount(""); setPayee(""); setNote("");
  };

  const catChart = useMemo(() =>
    Object.entries(pcAgg.byCat).map(([name, value]) => ({ name, value, food: isFoodCategory(name) })),
    [pcAgg]);

  const PIE_COLORS = [BRAND.alert, "#F472B6", BRAND.blue, "#60A5FA", BRAND.amber, "#34D399", "#A78BFA"];

  return (
    <div className="space-y-4">
      {/* 残高サマリー */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard theme={theme} icon={<Coins size={16} />} accent={BRAND.blue} label="期首残高"
          value={yen(pc.opening)}
          sub={<button onClick={() => {
            const v = prompt("期首残高を入力（円）", String(pc.opening));
            if (v !== null && !isNaN(Number(v))) setOpening(Number(v));
          }} className="inline-flex items-center gap-1 font-semibold" style={{ color: BRAND.blue }}><Pencil size={11} /> 期首残高編集</button>} />
        <SummaryCard theme={theme} icon={<Wallet size={16} />} accent={pcAgg.balance < 0 ? BRAND.red : BRAND.green} label="期末残高（現在）"
          value={yen(pcAgg.balance)} sub={`入金 ${yen(pcAgg.inSum)} ／ 出金 ${yen(pcAgg.outSum)}`} />
        <SummaryCard theme={theme} icon={<Utensils size={16} />} accent={BRAND.alert} label="小口 食材費 合算（F反映）"
          value={yen(pcAgg.foodSum)} sub={<span>実際F比率へ <b style={{ color: BRAND.alert }}>+{pct(metrics.fDelta, 2)}</b> 加算中</span>} badge={<FlaroBadge k="F" />} />
        <SummaryCard theme={theme} icon={<TrendingUp size={16} />} accent={BRAND.blue} label="連動後 実際F比率"
          value={pct(metrics.actualF)} sub={`目標 ${pct(s.targetF, 0)}`} />
      </div>

      {flash && (
        <div className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: theme.dark ? "rgba(225,29,111,0.12)" : "#FDF2F8", borderColor: "rgba(225,29,111,0.35)", color: BRAND.alert }}>
          <Sparkles size={18} />
          食材買い出し {yen(flash.amt)} を登録 → 実際F比率が <b>{pct(flash.before)}</b> から <b>{pct(flash.after)}</b> へ上昇しました。
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 入力フォーム */}
        <Card theme={theme} title="出納登録"
          right={<button onClick={() => quickFoodBuy()} className="rounded-lg px-2.5 py-1 text-xs font-bold text-white" style={{ backgroundColor: BRAND.alert }}>急な食材買い出し +¥5,000</button>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field theme={theme} label="日付">
                <select value={day} onChange={(e) => setDay(e.target.value)} className={inputCls(theme)}>
                  {Array.from({ length: DAYS_IN_MONTH }).map((_, i) => <option key={i} value={i + 1}>{i + 1} 日</option>)}
                </select>
              </Field>
              <Field theme={theme} label="科目">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls(theme)}>
                  {PC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {food && (
              <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: theme.dark ? "rgba(225,29,111,0.12)" : "#FDF2F8", color: BRAND.alert }}>
                <Utensils size={12} /> この科目は食材原価（F比率）に自動合算されます
              </div>
            )}

            <Field theme={theme} label="区分・金額">
              <div className="flex gap-2">
                <div className="flex rounded-lg border p-0.5" style={{ borderColor: theme.dark ? "#334155" : "#E2E8F0" }}>
                  {["out", "in"].map((io) => (
                    <button key={io} onClick={() => setInout(io)}
                      className="rounded-md px-3 py-1.5 text-xs font-bold transition"
                      style={inout === io ? { backgroundColor: io === "out" ? BRAND.alert : BRAND.green, color: "#fff" } : { color: theme.dark ? "#94A3B8" : "#64748B" }}>
                      {io === "out" ? "出金" : "入金"}
                    </button>
                  ))}
                </div>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={`${inputCls(theme)} text-right`} />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field theme={theme} label="支払先">
                <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="スーパー 等" className={inputCls(theme)} />
              </Field>
              <Field theme={theme} label="摘要">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="内容メモ" className={inputCls(theme)} />
              </Field>
            </div>

            <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95" style={{ backgroundColor: BRAND.blue }}>
              <Plus size={16} /> 登録する
            </button>
          </div>
        </Card>

        {/* 科目別支出 */}
        <Card theme={theme} className="lg:col-span-2" title="当月 科目別支出"
          right={<span className="flex items-center gap-1 text-xs font-semibold" style={{ color: BRAND.blue }}><FileDown size={12} /> 仕訳データ出力</span>}>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catChart} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={2}>
                  {catChart.map((e, i) => <Cell key={i} fill={e.food ? BRAND.alert : PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip theme={theme} money />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {catChart.sort((a, b) => b.value - a.value).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.food ? BRAND.alert : PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                  <span className="flex-1 font-medium">{c.name}{c.food && <span className="ml-1 text-xs" style={{ color: BRAND.alert }}>（F連動）</span>}</span>
                  <span className="font-bold">{yen(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 出納帳テーブル */}
      <Card theme={theme} title="小口現金 出納帳">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-left text-xs ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                <th className="py-2 pr-2 font-semibold">日付</th>
                <th className="py-2 pr-2 font-semibold">科目</th>
                <th className="py-2 pr-2 font-semibold">支払先</th>
                <th className="py-2 pr-2 text-right font-semibold">入金</th>
                <th className="py-2 pr-2 text-right font-semibold">出金</th>
                <th className="py-2 pr-2 text-right font-semibold">残高</th>
                <th className="py-2 pr-2 font-semibold">摘要</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let bal = pc.opening;
                const sorted = [...pc.entries].sort((a, b) => a.day - b.day);
                return sorted.map((e) => {
                  bal += e.inout === "in" ? e.amount : -e.amount;
                  return (
                    <tr key={e.id} className="border-b text-xs" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                      <td className="py-2 pr-2 whitespace-nowrap">{e.day} 日</td>
                      <td className="py-2 pr-2">
                        <span className="whitespace-nowrap">{e.category}</span>
                        {e.food && <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white align-middle" style={{ backgroundColor: FLARO_COLORS.F }}>F</span>}
                      </td>
                      <td className={`py-2 pr-2 ${theme.subText}`}>{e.payee}</td>
                      <td className="py-2 pr-2 text-right" style={{ color: e.inout === "in" ? BRAND.green : undefined }}>{e.inout === "in" ? yen(e.amount) : "—"}</td>
                      <td className="py-2 pr-2 text-right" style={{ color: e.inout === "out" ? BRAND.alert : undefined }}>{e.inout === "out" ? yen(e.amount) : "—"}</td>
                      <td className="py-2 pr-2 text-right font-semibold" style={{ color: bal < 0 ? BRAND.red : undefined }}>{yen(bal)}</td>
                      <td className={`py-2 pr-2 ${theme.subText}`}>{e.note}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => removeEntry(e.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="text-xs font-bold" style={{ color: BRAND.blue }}>
                <td className="py-2.5" colSpan={3}>合計</td>
                <td className="py-2.5 text-right" style={{ color: BRAND.green }}>{yen(pcAgg.inSum)}</td>
                <td className="py-2.5 text-right" style={{ color: BRAND.alert }}>{yen(pcAgg.outSum)}</td>
                <td className="py-2.5 text-right" style={{ color: pcAgg.balance < 0 ? BRAND.red : BRAND.blue }}>{yen(pcAgg.balance)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Field({ theme, label, children }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-semibold ${theme.subText}`}>{label}</span>
      {children}
    </label>
  );
}
function inputCls(theme) {
  return `w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none ${theme.dark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`;
}

/* ============================================================
   日別 売上・FL 明細（添付の予実表イメージ）
   ============================================================ */
function SalesFL({ s, pc, metrics, theme }) {
  const pettyByDay = useMemo(() => {
    const m = {};
    pc.entries.forEach((e) => { if (e.inout === "out" && e.food) m[e.day] = (m[e.day] || 0) + e.amount; });
    return m;
  }, [pc]);

  const rows = useMemo(() => s.daily.map((d) => {
    const food = d.foodBase == null ? null : d.foodBase + (pettyByDay[d.dnum] || 0);
    const fRate = food != null && d.daily ? (food / d.daily) * 100 : null;
    const lRate = d.labor != null && d.daily ? (d.labor / d.daily) * 100 : null;
    const flRate = fRate != null && lRate != null ? fRate + lRate : null;
    return { ...d, food, fRate, lRate, flRate };
  }), [s, pettyByDay]);

  const tot = useMemo(() => rows.reduce((a, r) => {
    a.budget += r.budget;
    if (r.daily != null) { a.sales += r.daily; a.food += r.food; a.labor += r.labor; }
    return a;
  }, { budget: 0, sales: 0, food: 0, labor: 0 }), [rows]);
  const fRateT = tot.sales ? (tot.food / tot.sales) * 100 : 0;
  const lRateT = tot.sales ? (tot.labor / tot.sales) * 100 : 0;
  const flRateT = fRateT + lRateT;
  const flTarget = s.targetF + s.targetL;

  const chartData = rows.filter((r) => r.daily != null).map((r) => ({
    day: r.day, 売上: r.daily,
    F率: +r.fRate.toFixed(1), L率: +r.lRate.toFixed(1), FL率: +r.flRate.toFixed(1),
  }));

  const dowColor = (dow) => (dow === "土" ? BRAND.blue : dow === "日" ? BRAND.red : undefined);

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard theme={theme} icon={<TrendingUp size={16} />} accent={BRAND.green} label="当月売上 累計（円）" value={yen(tot.sales)} sub={`予算 ${man(s.budgetSales)}`} />
        <SummaryCard theme={theme} icon={<CalendarDays size={16} />} accent={BRAND.blue} label="着地予測（万）" value={man(s.landing)} sub={`達成率 ${pct(metrics.budgetAchieve)}`} />
        <SummaryCard theme={theme} icon={<Utensils size={16} />} accent={fRateT > s.targetF + 1.5 ? BRAND.alert : BRAND.blue} label="F率（累計・小口込）" value={pct(fRateT)} sub={`目標 ${pct(s.targetF, 0)}`} badge={<FlaroBadge k="F" />} />
        <SummaryCard theme={theme} icon={<Users size={16} />} accent={lRateT > s.targetL + 2 ? BRAND.amber : BRAND.blue} label="L率（累計）" value={pct(lRateT)} sub={`目標 ${pct(s.targetL, 0)}`} badge={<FlaroBadge k="L" />} />
        <SummaryCard theme={theme} icon={<AlertTriangle size={16} />} accent={flRateT > flTarget ? BRAND.alert : BRAND.green} label="FL率（累計）" value={pct(flRateT)} sub={flRateT > flTarget ? "⚠ 目標超過" : "✓ 適正レンジ"} />
      </div>

      {/* 日別 売上＆FL率グラフ */}
      <Card theme={theme} title="日別 売上 ＆ FL率 推移">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.chartGrid} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: theme.chartAxis, fontSize: 10 }} interval={1} />
            <YAxis yAxisId="l" tickFormatter={(v) => (v / 10000).toFixed(0) + "万"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={44} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => v + "%"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={38} domain={[0, 80]} />
            <Tooltip content={<ChartTip theme={theme} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" name="売上" dataKey="売上" fill={theme.dark ? "#334155" : "#CBD5E1"} radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Line yAxisId="r" name="F率" dataKey="F率" stroke={FLARO_COLORS.F} strokeWidth={2} dot={false} />
            <Line yAxisId="r" name="L率" dataKey="L率" stroke={BRAND.amber} strokeWidth={2} dot={false} />
            <Line yAxisId="r" name="FL率" dataKey="FL率" stroke={BRAND.alert} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* 日別明細テーブル */}
      <Card theme={theme} title="日別 売上・FL 明細"
        right={<span className={`text-xs ${theme.subText}`}>売上=円 / 予算=万円 / F・L=実績</span>}>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                <th className="py-2 pr-2 text-left font-semibold">日</th>
                <th className="py-2 pr-2 text-center font-semibold">曜</th>
                <th className="py-2 pr-2 text-right font-semibold">売上予算(万)</th>
                <th className="py-2 pr-2 text-right font-semibold">売上実績(円)</th>
                <th className="py-2 pr-2 text-right font-semibold">売上累計(円)</th>
                <th className="py-2 pr-2 text-right font-semibold">F 食材(円)</th>
                <th className="py-2 pr-2 text-right font-semibold">F率</th>
                <th className="py-2 pr-2 text-right font-semibold">L 人件費(円)</th>
                <th className="py-2 pr-2 text-right font-semibold">L率</th>
                <th className="py-2 text-right font-semibold">FL率</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const today = r.dnum === TODAY;
                const flOver = r.flRate != null && r.flRate > flTarget;
                return (
                  <tr key={r.dnum} className="border-b" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9", backgroundColor: today ? (theme.dark ? "rgba(10,109,194,0.12)" : "#F0F7FF") : undefined }}>
                    <td className="py-1.5 pr-2 text-left font-semibold">
                      {r.dnum}
                      {today && <span className="ml-1 rounded px-1 text-white" style={{ backgroundColor: BRAND.blue, fontSize: 9 }}>本日</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-center font-semibold" style={{ color: dowColor(r.dow) }}>{r.dow}</td>
                    <td className="py-1.5 pr-2 text-right">{man(r.budget)}</td>
                    <td className="py-1.5 pr-2 text-right font-medium">{r.daily != null ? yen(r.daily) : "—"}</td>
                    <td className={`py-1.5 pr-2 text-right ${theme.subText}`}>{r.actualCum != null ? yen(r.actualCum) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right">{r.food != null ? yen(r.food) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold" style={{ color: r.fRate != null && r.fRate > s.targetF + 2 ? BRAND.alert : undefined }}>{r.fRate != null ? pct(r.fRate) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right">{r.labor != null ? yen(r.labor) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold" style={{ color: r.lRate != null && r.lRate > s.targetL + 3 ? BRAND.amber : undefined }}>{r.lRate != null ? pct(r.lRate) : "—"}</td>
                    <td className="py-1.5 text-right font-bold" style={{ color: flOver ? BRAND.alert : undefined }}>{r.flRate != null ? pct(r.flRate) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold" style={{ color: BRAND.blue }}>
                <td className="py-2.5 pr-2 text-left" colSpan={2}>合計 / 累計</td>
                <td className="py-2.5 pr-2 text-right">{man(tot.budget)}</td>
                <td className="py-2.5 pr-2 text-right">{yen(tot.sales)}</td>
                <td className="py-2.5 pr-2 text-right">{yen(tot.sales)}</td>
                <td className="py-2.5 pr-2 text-right">{yen(tot.food)}</td>
                <td className="py-2.5 pr-2 text-right">{pct(fRateT)}</td>
                <td className="py-2.5 pr-2 text-right">{yen(tot.labor)}</td>
                <td className="py-2.5 pr-2 text-right">{pct(lRateT)}</td>
                <td className="py-2.5 text-right" style={{ color: flRateT > flTarget ? BRAND.alert : BRAND.blue }}>{pct(flRateT)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   グルメ・SNS集計分析
   ============================================================ */
function Marketing({ s, theme }) {
  const totalCost = s.gourmet.reduce((a, m) => a + m.cost, 0);
  const totalRev = s.gourmet.reduce((a, m) => a + m.revenue, 0);
  const blendedRoi = totalRev / totalCost;
  const bestMedia = [...s.gourmet].sort((a, b) => b.roi - a.roi)[0];
  const worstMedia = [...s.gourmet].sort((a, b) => a.roi - b.roi)[0];

  const advice = [
    { icon: TrendingUp, color: BRAND.green, title: "予算再配分の提案",
      body: `費用対効果が最も高い「${bestMedia.media}」（ROI ${bestMedia.roi}倍）へ広告費を寄せ、ROIが伸び悩む「${worstMedia.media}」（${worstMedia.roi}倍）の掲載プランを見直すと、全体ROIの改善が見込めます。` },
    { icon: MessageCircle, color: BRAND.blue, title: "UGC・口コミ強化",
      body: s.googleScore < 4.0
        ? `Googleスコア ${s.googleScore.toFixed(1)} はエリア平均を下回り気味です。来店直後クーポン等でレビュー投稿を促し、返信率を高めると集客CVの改善に直結します。`
        : `Googleスコア ${s.googleScore.toFixed(1)} は良好です。好意的な口コミをInstagram/TikTokへ二次利用し、UGCの露出を増やすフェーズです。` },
    { icon: Video, color: BRAND.alert, title: "SNS動線の最適化",
      body: `TikTok エンゲージメント率 ${s.sns.tiktok.engage}% が高水準です。バズ投稿からLINE公式（友だち ${s.sns.line.friends.toLocaleString()}人）への予約導線を設計し、フォロワーの来店転換を高めましょう。` },
  ];

  return (
    <div className="space-y-4">
      {/* グルメ媒体サマリー */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard theme={theme} icon={<Coins size={16} />} accent={BRAND.blue} label="グルメ媒体 広告費 合計" value={yen(totalCost)} sub={`5媒体合算 / 送客 ${s.gourmet.reduce((a, m) => a + m.guests, 0).toLocaleString()}人`} />
        <SummaryCard theme={theme} icon={<TrendingUp size={16} />} accent={BRAND.green} label="媒体経由 売上貢献" value={yen(totalRev)} sub="推定 媒体想定売上" />
        <SummaryCard theme={theme} icon={<Sparkles size={16} />} accent={blendedRoi >= 3 ? BRAND.green : BRAND.amber} label="全体 費用対効果（ROI）" value={blendedRoi.toFixed(1) + " 倍"} sub={`最高 ${bestMedia.media} ${bestMedia.roi}倍`} />
      </div>

      {/* グルメ媒体 KPI・ROI比較 */}
      <Card theme={theme} title="グルメサイト5媒体 KPI・ROI比較">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.gourmet} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.chartGrid} vertical={false} />
              <XAxis dataKey="media" tick={{ fill: theme.chartAxis, fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={42} />
              <YAxis yAxisId="l" tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={38} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: theme.chartAxis, fontSize: 10 }} width={28} />
              <Tooltip content={<ChartTip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" name="広告費" dataKey="cost" fill={theme.dark ? "#475569" : "#CBD5E1"} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar yAxisId="l" name="売上貢献" dataKey="revenue" fill={BRAND.blue} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Line yAxisId="r" name="ROI(倍)" type="monotone" dataKey="roi" stroke={BRAND.alert} strokeWidth={2.5} dot={{ r: 3 }} />
            </BarChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-left text-xs ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                  <th className="py-2 pr-2 font-semibold">媒体</th>
                  <th className="py-2 pr-2 text-right font-semibold">広告費</th>
                  <th className="py-2 pr-2 text-right font-semibold">送客数</th>
                  <th className="py-2 pr-2 text-right font-semibold">ROI</th>
                  <th className="py-2 text-right font-semibold">スコア</th>
                </tr>
              </thead>
              <tbody>
                {s.gourmet.map((m) => (
                  <tr key={m.media} className="border-b text-xs" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                    <td className="py-2 pr-2 font-semibold">{m.media}</td>
                    <td className="py-2 pr-2 text-right">{yen(m.cost)}</td>
                    <td className="py-2 pr-2 text-right">{m.guests}人</td>
                    <td className="py-2 pr-2 text-right font-bold" style={{ color: m.roi >= 3 ? BRAND.green : BRAND.amber }}>{m.roi} 倍</td>
                    <td className="py-2 text-right">{m.score.toFixed(1)} ★</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Google 評価（GBP / MEO） */}
      <Card theme={theme} title={<span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: "#4285F4", fontSize: 11, fontWeight: 700 }}>G</span> Google評価（ビジネスプロフィール / MEO）</span>}
        right={<span className={`text-xs ${theme.subText}`}>比較対象：前月</span>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* スコア */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
            <div className={`text-xs ${theme.subText}`}>Googleスコア</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: BRAND.blue }}>{s.gbp.score.toFixed(1)}</span>
              <span className={`mb-1 text-xs ${theme.subText}`}>/ 5.0</span>
              <span className="mb-1 ml-auto"><Delta value={s.gbp.scoreDelta} digits={1} /></span>
            </div>
            <div className="mt-1 text-lg"><Stars score={s.gbp.score} empty={theme.dark ? "#334155" : "#E2E8F0"} /></div>
            <div className={`mt-1.5 text-xs ${theme.subText}`}>エリア平均 {s.gbp.meoAvgScore.toFixed(1)} ★</div>
          </div>

          {/* 口コミ数 */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
            <div className={`text-xs ${theme.subText}`}>口コミ数（累計）</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-black">{s.gbp.reviews.toLocaleString()}</span>
              <span className={`mb-1 text-xs ${theme.subText}`}>件</span>
              <span className="mb-1 ml-auto"><Delta value={s.gbp.reviewsDelta} suffix="件" /></span>
            </div>
            <div className={`mt-2 flex items-center justify-between text-xs ${theme.subText}`}>
              <span>今月の新規口コミ</span>
              <span className="font-bold" style={{ color: BRAND.green }}>+{s.gbp.monthlyNew} 件</span>
            </div>
            <div className={`mt-1 flex items-center justify-between text-xs ${theme.subText}`}>
              <span>月間 表示回数</span>
              <span className="font-semibold">{s.gbp.impressions.toLocaleString()} 回</span>
            </div>
          </div>

          {/* MEO診断 */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${theme.subText}`}>MEO診断</span>
              {(() => {
                const ratio = s.gbp.meoRank / s.gbp.meoTotal;
                const [label, color] = ratio <= 0.15 ? ["上位表示 良好", BRAND.green] : ratio <= 0.4 ? ["改善余地あり", BRAND.amber] : ["要対策", BRAND.alert];
                return <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>{label}</span>;
              })()}
            </div>
            <div className="mt-1.5 flex items-end gap-1.5">
              <span className="text-2xl font-black" style={{ color: BRAND.blue }}>{s.gbp.meoRank}</span>
              <span className={`mb-0.5 text-xs ${theme.subText}`}>位 / {s.gbp.meoTotal} 店（同一カテゴリ）</span>
            </div>
            <div className="mt-2.5">
              <div className={`mb-1 flex items-center justify-between text-xs ${theme.subText}`}>
                <span>プロフィール情報 充実度</span>
                <span className="font-bold" style={{ color: s.gbp.complete >= 85 ? BRAND.green : BRAND.amber }}>{s.gbp.complete}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                <div className="h-full rounded-full" style={{ width: `${s.gbp.complete}%`, backgroundColor: s.gbp.complete >= 85 ? BRAND.green : BRAND.amber }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* SNS 3媒体 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SnsCard theme={theme} icon={Instagram} color="#E1306C" name="Instagram"
          main={s.sns.instagram.followers} mainLabel="フォロワー" growth={s.sns.instagram.growth}
          rows={[["リーチ", s.sns.instagram.reach.toLocaleString()], ["エンゲージ率", s.sns.instagram.engage + "%"]]} />
        <SnsCard theme={theme} icon={Video} color="#111827" name="TikTok"
          main={s.sns.tiktok.followers} mainLabel="フォロワー" growth={s.sns.tiktok.growth}
          rows={[["再生数", s.sns.tiktok.views.toLocaleString()], ["エンゲージ率", s.sns.tiktok.engage + "%"]]} />
        <SnsCard theme={theme} icon={MessageCircle} color="#06C755" name="LINE公式"
          main={s.sns.line.friends} mainLabel="友だち数" growth={s.sns.line.growth}
          rows={[["LINE経由予約", s.sns.line.reserve + "件"], ["クーポン使用", s.sns.line.coupon.toLocaleString()]]} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* UGC推移 */}
        <Card theme={theme} title="UGC投稿数 推移（媒体別）">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={s.ugc} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.chartGrid} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: theme.chartAxis, fontSize: 10 }} />
              <YAxis tick={{ fill: theme.chartAxis, fontSize: 10 }} width={30} />
              <Tooltip content={<ChartTip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line name="Instagram" dataKey="instagram" stroke="#E1306C" strokeWidth={2.5} dot={{ r: 2 }} />
              <Line name="TikTok" dataKey="tiktok" stroke={theme.dark ? "#E2E8F0" : "#111827"} strokeWidth={2.5} dot={{ r: 2 }} />
              <Line name="LINE" dataKey="line" stroke="#06C755" strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* AI改善アドバイス */}
        <Card theme={theme} title={<span className="flex items-center gap-1.5"><Sparkles size={15} style={{ color: BRAND.blue }} /> AI 改善アドバイス</span>}>
          <div className="space-y-2.5">
            {advice.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex gap-3 rounded-xl p-3" style={{ backgroundColor: theme.dark ? "#0F1A2E" : "#F8FAFC" }}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: a.color }}><Icon size={15} /></span>
                  <div>
                    <div className="text-xs font-bold">{a.title}</div>
                    <div className={`mt-0.5 text-xs leading-relaxed ${theme.subText}`}>{a.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SnsCard({ theme, icon: Icon, color, name, main, mainLabel, growth, rows }) {
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-2xl border p-4 shadow-sm`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}><Icon size={16} /></span>
        <span className="text-sm font-bold">{name}</span>
        <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: BRAND.green }}>
          <ArrowUpRight size={12} />+{growth.toLocaleString()}
        </span>
      </div>
      <div className="text-2xl font-black tracking-tight">{main.toLocaleString()}</div>
      <div className={`text-xs ${theme.subText}`}>{mainLabel}</div>
      <div className="mt-3 space-y-1 border-t pt-2.5" style={{ borderColor: theme.dark ? "#1E293B" : "#F1F5F9" }}>
        {rows.map(([k, v], i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className={theme.subText}>{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   カスタムツールチップ
   ============================================================ */
function ChartTip({ active, payload, label, theme, money }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${theme.dark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-700"}`}>
      {label && <div className="mb-1 font-bold">{label}</div>}
      {payload.filter((p) => p.value != null).map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color || p.fill }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold">{money && typeof p.value === "number" ? yen(p.value) : (typeof p.value === "number" ? p.value.toLocaleString() : p.value)}</span>
        </div>
      ))}
    </div>
  );
}
