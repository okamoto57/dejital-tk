"use client";

import Link from "next/link";
import { BRAND } from "@/lib/theme";
import { Card, Delta } from "./ui";
import { useAppTheme } from "./theme-provider";

export interface SocialRow {
  storeId: string;
  name: string;
  tracksDazhong: boolean;
  google: { score: number; scorePrev: number; reviews: number; reviewsDelta: number; meoRank: number | null; meoTotal: number | null } | null;
  tabelog: { score: number; scorePrev: number; reviews: number; reviewsDelta: number } | null;
  dazhong: { score: number; scorePrev: number; reviews: number; reviewsDelta: number } | null;
  instagramFollowers: number;
  instagramGrowth: number;
  lineFriends: number;
  lineGrowth: number;
}

export function SocialCompareView({ rows, yearMonth }: { rows: SocialRow[]; yearMonth: string }) {
  const theme = useAppTheme();

  const withGoogle = rows.filter((r) => r.google);
  const avgGoogle = withGoogle.length ? withGoogle.reduce((a, r) => a + (r.google?.score ?? 0), 0) / withGoogle.length : null;
  const withTabelog = rows.filter((r) => r.tabelog);
  const avgTabelog = withTabelog.length ? withTabelog.reduce((a, r) => a + (r.tabelog?.score ?? 0), 0) / withTabelog.length : null;
  const totalInstagram = rows.reduce((a, r) => a + r.instagramFollowers, 0);
  const totalLine = rows.reduce((a, r) => a + r.lineFriends, 0);

  const th = "py-2 px-2 text-right font-semibold whitespace-nowrap";
  const thLeft = "py-2 px-2 text-left font-semibold whitespace-nowrap";
  const td = "py-1.5 px-2 text-right whitespace-nowrap";
  const borderColor = theme.dark ? "#1E293B" : "#E2E8F0";
  const rowBorder = theme.dark ? "#111C2E" : "#F1F5F9";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card title="平均 Googleスコア">
          <div className="text-2xl font-black" style={{ color: "#4285F4" }}>
            {avgGoogle != null ? avgGoogle.toFixed(1) : "—"}
          </div>
        </Card>
        <Card title="平均 食べログスコア">
          <div className="text-2xl font-black" style={{ color: "#FF2800" }}>
            {avgTabelog != null ? avgTabelog.toFixed(2) : "—"}
          </div>
        </Card>
        <Card title="全店舗 Instagramフォロワー合計">
          <div className="text-2xl font-black" style={{ color: BRAND.blue }}>
            {totalInstagram.toLocaleString()}
          </div>
        </Card>
        <Card title="全店舗 LINE登録数合計">
          <div className="text-2xl font-black" style={{ color: "#06C755" }}>
            {totalLine.toLocaleString()}
          </div>
        </Card>
      </div>

      <Card title={`SNS・口コミ 全店舗比較(${yearMonth}、前月比)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={theme.subText} style={{ borderBottom: `1px solid ${borderColor}` }}>
                <th className={thLeft} rowSpan={2}>
                  店舗名
                </th>
                <th className={th} colSpan={3} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  Google
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  食べログ
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  大衆点評
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  Instagram
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  LINE
                </th>
              </tr>
              <tr className={theme.subText} style={{ borderBottom: `1px solid ${borderColor}` }}>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>口コミ数(前月比)</th>
                <th className={th}>MEO順位</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>口コミ数(前月比)</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>口コミ数(前月比)</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  フォロワー数
                </th>
                <th className={th}>前月比</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  登録数
                </th>
                <th className={th}>前月比</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.storeId} style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <td className="py-1.5 px-2 text-left font-semibold whitespace-nowrap">
                    <Link href={`/marketing?store=${r.storeId}`} className="hover:underline" style={{ color: BRAND.blue }}>
                      {r.name}
                    </Link>
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.google ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.google.score.toFixed(1)}
                        <Delta value={r.google.score - r.google.scorePrev} digits={1} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    {r.google ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.google.reviews.toLocaleString()}
                        <Delta value={r.google.reviewsDelta} suffix="件" />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>{r.google?.meoRank != null ? `${r.google.meoRank}位${r.google.meoTotal != null ? ` / ${r.google.meoTotal}` : ""}` : "—"}</td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.tabelog ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.tabelog.score.toFixed(2)}
                        <Delta value={r.tabelog.score - r.tabelog.scorePrev} digits={2} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    {r.tabelog ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.tabelog.reviews.toLocaleString()}
                        <Delta value={r.tabelog.reviewsDelta} suffix="件" />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.tracksDazhong && r.dazhong ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.dazhong.score.toFixed(1)}
                        <Delta value={r.dazhong.score - r.dazhong.scorePrev} digits={1} />
                      </span>
                    ) : r.tracksDazhong ? (
                      "未入力"
                    ) : (
                      <span className={theme.subText}>対象外</span>
                    )}
                  </td>
                  <td className={td}>
                    {r.tracksDazhong && r.dazhong ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.dazhong.reviews.toLocaleString()}
                        <Delta value={r.dazhong.reviewsDelta} suffix="件" />
                      </span>
                    ) : r.tracksDazhong ? (
                      "未入力"
                    ) : (
                      <span className={theme.subText}>対象外</span>
                    )}
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.instagramFollowers.toLocaleString()}
                  </td>
                  <td className={td}>
                    <Delta value={r.instagramGrowth} />
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.lineFriends.toLocaleString()}
                  </td>
                  <td className={td}>
                    <Delta value={r.lineGrowth} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className={`py-6 text-center ${theme.subText}`}>
                    店舗データがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className={`mt-2 text-xs ${theme.subText}`}>
          大衆点評は和牛之国・和牛王国・キョロちゃん 池田店・京の虎牛のみ対象です。前月比はデータ入力タブで入力した「前月スコア」「今月の新規口コミ」「今月の増加数」から算出しています。
        </p>
      </Card>
    </div>
  );
}
