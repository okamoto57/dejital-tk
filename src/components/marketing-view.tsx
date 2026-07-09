"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Coins, TrendingUp, Sparkles, Camera, Video, MessageCircle, ArrowUpRight, ArrowUpRight as GrowthIcon } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { yen } from "@/lib/format";
import type { AdviceItem } from "@/lib/metrics";
import { Card, SummaryCard, Stars, Delta } from "./ui";
import { useAppTheme } from "./theme-provider";

export interface GourmetRow {
  mediaName: string;
  cost: number;
  revenue: number;
  guests: number;
  score: number;
}

export interface SnsData {
  instagram: { followers: number; reach: number; engage: number; growth: number };
  tiktok: { followers: number; views: number; engage: number; growth: number };
  line: { friends: number; reserve: number; coupon: number; growth: number };
}

export interface ReputationData {
  score: number;
  scorePrev: number;
  reviews: number;
  reviewsDelta: number;
}

export interface GoogleReputationData extends ReputationData {
  meoRank: number | null;
  meoTotal: number | null;
}

export function MarketingView({
  gourmet,
  sns,
  google,
  tabelog,
  dazhong,
  advice,
}: {
  gourmet: GourmetRow[];
  sns: SnsData;
  google: GoogleReputationData | null;
  tabelog: ReputationData | null;
  dazhong?: ReputationData | null;
  advice: AdviceItem[];
}) {
  const theme = useAppTheme();
  const totalCost = gourmet.reduce((a, m) => a + m.cost, 0);
  const totalRev = gourmet.reduce((a, m) => a + m.revenue, 0);
  const blendedRoi = totalCost > 0 ? totalRev / totalCost : 0;
  const bestMedia = totalCost > 0 ? [...gourmet].filter((m) => m.cost > 0).sort((a, b) => b.revenue / b.cost - a.revenue / a.cost)[0] : null;

  const chartData = gourmet.map((r) => ({
    media: r.mediaName,
    広告費: r.cost,
    売上貢献: r.revenue,
    ROI: r.cost > 0 ? +(r.revenue / r.cost).toFixed(1) : 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={<Coins size={16} />} accent={BRAND.blue} label="グルメ媒体 広告費 合計" value={yen(totalCost)} sub={`送客 ${gourmet.reduce((a, m) => a + m.guests, 0).toLocaleString()}人`} />
        <SummaryCard icon={<TrendingUp size={16} />} accent={BRAND.green} label="媒体経由 売上貢献" value={yen(totalRev)} sub="手入力ベースの推定値" />
        <SummaryCard
          icon={<Sparkles size={16} />}
          accent={blendedRoi >= 3 ? BRAND.green : BRAND.amber}
          label="全体 費用対効果(ROI)"
          value={blendedRoi.toFixed(1) + " 倍"}
          sub={bestMedia ? `最高 ${bestMedia.mediaName} ${(bestMedia.revenue / bestMedia.cost).toFixed(1)}倍` : "—"}
        />
      </div>

      <Card title="グルメサイト媒体 KPI・ROI比較">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.chartGrid} vertical={false} />
              <XAxis dataKey="media" tick={{ fill: theme.chartAxis, fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={42} />
              <YAxis yAxisId="l" tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fill: theme.chartAxis, fontSize: 10 }} width={38} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: theme.chartAxis, fontSize: 10 }} width={28} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" name="広告費" dataKey="広告費" fill="#CBD5E1" radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar yAxisId="l" name="売上貢献" dataKey="売上貢献" fill={BRAND.blue} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Line yAxisId="r" name="ROI(倍)" type="monotone" dataKey="ROI" stroke={BRAND.alert} strokeWidth={2.5} dot={{ r: 3 }} />
            </BarChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b text-left ${theme.subText}`} style={{ borderColor: theme.dark ? "#1E293B" : "#E2E8F0" }}>
                  <th className="py-1.5 pr-2 font-semibold">媒体</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">広告費</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">売上貢献</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">送客</th>
                  <th className="py-1.5 text-right font-semibold">スコア</th>
                </tr>
              </thead>
              <tbody>
                {gourmet.map((r) => (
                  <tr key={r.mediaName} className="border-b" style={{ borderColor: theme.dark ? "#111C2E" : "#F1F5F9" }}>
                    <td className="py-1.5 pr-2 font-semibold">{r.mediaName}</td>
                    <td className="py-1.5 pr-2 text-right">{yen(r.cost)}</td>
                    <td className="py-1.5 pr-2 text-right">{yen(r.revenue)}</td>
                    <td className="py-1.5 pr-2 text-right">{r.guests.toLocaleString()}人</td>
                    <td className="py-1.5 text-right">{r.score.toFixed(1)} ★</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className={`grid grid-cols-1 gap-4 ${dazhong !== undefined ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <ReputationDisplay label="Google評価" color="#4285F4" data={google} digits={1} meo={google ? { rank: google.meoRank, total: google.meoTotal } : undefined} />
        <ReputationDisplay label="食べログ評価" color="#FF2800" data={tabelog} digits={2} />
        {dazhong !== undefined && <ReputationDisplay label="大衆点評" color="#FF6A00" data={dazhong} digits={1} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SnsStatCard
          icon={Camera}
          color="#E1306C"
          name="Instagram"
          main={sns.instagram.followers}
          mainLabel="フォロワー"
          growth={sns.instagram.growth}
          rows={[
            ["リーチ", sns.instagram.reach.toLocaleString()],
            ["エンゲージ率", sns.instagram.engage + "%"],
          ]}
        />
        <SnsStatCard
          icon={Video}
          color="#111827"
          name="TikTok"
          main={sns.tiktok.followers}
          mainLabel="フォロワー"
          growth={sns.tiktok.growth}
          rows={[
            ["再生数", sns.tiktok.views.toLocaleString()],
            ["エンゲージ率", sns.tiktok.engage + "%"],
          ]}
        />
        <SnsStatCard
          icon={MessageCircle}
          color="#06C755"
          name="LINE公式"
          main={sns.line.friends}
          mainLabel="友だち数"
          growth={sns.line.growth}
          rows={[
            ["LINE経由予約", sns.line.reserve + "件"],
            ["クーポン使用", sns.line.coupon.toLocaleString()],
          ]}
        />
      </div>

      {advice.length > 0 && (
        <Card
          title={
            <span className="flex items-center gap-1.5">
              <Sparkles size={15} style={{ color: BRAND.blue }} /> AI 改善アドバイス
            </span>
          }
        >
          <div className="space-y-2.5">
            {advice.map((a, i) => (
              <div key={i} className="flex gap-3 rounded-xl p-3" style={{ backgroundColor: "#F8FAFC" }}>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.blue }}>
                  <ArrowUpRight size={15} />
                </span>
                <div>
                  <div className="text-xs font-bold">{a.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{a.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ReputationDisplay({
  label,
  color,
  data,
  digits,
  meo,
}: {
  label: string;
  color: string;
  data: ReputationData | null;
  digits: number;
  meo?: { rank: number | null; total: number | null };
}) {
  return (
    <Card title={label}>
      {data ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black" style={{ color }}>
            {data.score.toFixed(digits)}
          </span>
          <Stars score={data.score} />
          <div className="ml-auto text-right">
            <Delta value={data.score - data.scorePrev} digits={digits} />
            <div className="text-xs text-slate-500">口コミ {data.reviews.toLocaleString()} 件(今月 +{data.reviewsDelta})</div>
          </div>
        </div>
      ) : (
        <span className="text-sm text-slate-400">未入力</span>
      )}
      {meo && meo.rank != null && (
        <div className="mt-2 text-xs text-slate-500">
          MEO順位 <span className="font-bold text-slate-700">{meo.rank}位</span>
          {meo.total != null && ` / ${meo.total}店(同一カテゴリ)`}
        </div>
      )}
    </Card>
  );
}

function SnsStatCard({
  icon: Icon,
  color,
  name,
  main,
  mainLabel,
  growth,
  rows,
}: {
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  name: string;
  main: number;
  mainLabel: string;
  growth: number;
  rows: [string, string][];
}) {
  const theme = useAppTheme();
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}>
          <Icon size={16} />
        </span>
        <span className="text-sm font-bold">{name}</span>
        <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: BRAND.green }}>
          <GrowthIcon size={12} />+{growth.toLocaleString()}
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
    </Card>
  );
}
