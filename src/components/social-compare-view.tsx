"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { compareJa } from "@/lib/format";
import { Card, Delta } from "./ui";
import { useAppTheme } from "./theme-provider";

export interface SocialRow {
  storeId: string;
  name: string;
  tracksDazhong: boolean;
  google: { score: number; scorePrev: number; reviews: number; reviewsDelta: number; meoRank: number | null; meoTotal: number | null } | null;
  tabelog: { score: number; scorePrev: number; reviews: number; reviewsDelta: number } | null;
  dazhong: { score: number; scorePrev: number; reviews: number; reviewsDelta: number } | null;
  tripadvisor: { score: number; scorePrev: number; reviews: number; reviewsDelta: number } | null;
  instagramFollowers: number;
  instagramGrowth: number;
  lineFriends: number;
  lineGrowth: number;
}

type SortKey =
  | "custom"
  | "name"
  | "googleReviews"
  | "tabelogReviews"
  | "lineFriends"
  | "instagramFollowers"
  | "dazhongReviews"
  | "tripadvisorReviews";

export function SocialCompareView({ rows, yearMonth }: { rows: SocialRow[]; yearMonth: string }) {
  const theme = useAppTheme();
  // "custom" shows rows in the store-management drag order (the default).
  // Clicking 店舗名 cycles custom -> 五十音asc -> 五十音desc -> custom;
  // clicking a 口コミ数/フォロワー数/登録数 header sorts by that count
  // (high-to-low first), toggling low-to-high on a second click.
  const [sortKey, setSortKey] = useState<SortKey>("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (key === "name") {
      if (sortKey !== "name") {
        setSortKey("name");
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey("custom");
      }
      return;
    }
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedRows = useMemo(() => {
    if (sortKey === "custom") return rows;
    if (sortKey === "name") {
      const sorted = [...rows].sort((a, b) => compareJa(a.name, b.name));
      return sortDir === "asc" ? sorted : sorted.reverse();
    }

    const getValue = (r: SocialRow): number | null => {
      switch (sortKey) {
        case "googleReviews":
          return r.google?.reviews ?? null;
        case "tabelogReviews":
          return r.tabelog?.reviews ?? null;
        case "dazhongReviews":
          return r.tracksDazhong ? (r.dazhong?.reviews ?? null) : null;
        case "tripadvisorReviews":
          return r.tripadvisor?.reviews ?? null;
        case "instagramFollowers":
          return r.instagramFollowers;
        case "lineFriends":
          return r.lineFriends;
        default:
          return null;
      }
    };

    // Stores with no data for the sorted metric always sink to the bottom,
    // regardless of sort direction, so "—"/対象外 rows don't interleave
    // with the ranked ones.
    const withVal = rows.map((r) => ({ r, v: getValue(r) }));
    withVal.sort((a, b) => {
      if (a.v == null && b.v == null) return 0;
      if (a.v == null) return 1;
      if (b.v == null) return -1;
      return sortDir === "desc" ? b.v - a.v : a.v - b.v;
    });
    return withVal.map((x) => x.r);
  }, [rows, sortKey, sortDir]);

  const withGoogle = rows.filter((r) => r.google);
  const avgGoogle = withGoogle.length ? withGoogle.reduce((a, r) => a + (r.google?.score ?? 0), 0) / withGoogle.length : null;
  const withTabelog = rows.filter((r) => r.tabelog);
  const avgTabelog = withTabelog.length ? withTabelog.reduce((a, r) => a + (r.tabelog?.score ?? 0), 0) / withTabelog.length : null;
  const totalInstagram = rows.reduce((a, r) => a + r.instagramFollowers, 0);
  const totalLine = rows.reduce((a, r) => a + r.lineFriends, 0);

  const th = "py-2 px-2 text-right font-semibold whitespace-nowrap";
  const thLeft = "py-2 px-2 text-left font-semibold whitespace-nowrap";
  const td = "py-1.5 px-2 text-right whitespace-nowrap tabular-nums";
  const borderColor = theme.dark ? "#1E293B" : "#E2E8F0";
  const rowBorder = theme.dark ? "#111C2E" : "#F1F5F9";

  // Stacks the value above its delta, both right-aligned to a fixed-width
  // column, so the score/count and the arrow+delta line up vertically down
  // the table instead of drifting left/right with each row's text width.
  function ScoreCell({ value, delta }: { value: React.ReactNode; delta: React.ReactNode }) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span>{value}</span>
        {delta}
      </div>
    );
  }

  function SortButton({ sortKeyValue, label }: { sortKeyValue: SortKey; label: string }) {
    const active = sortKey === sortKeyValue;
    return (
      <button onClick={() => toggleSort(sortKeyValue)} className="inline-flex items-center gap-1 hover:underline">
        {label}
        {active ? sortDir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : null}
      </button>
    );
  }

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
                  <SortButton sortKeyValue="name" label="店舗名" />
                </th>
                <th className={th} colSpan={3} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  Google
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  食べログ
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  LINE
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  Instagram
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  大衆点評
                </th>
                <th className={th} colSpan={2} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  Tripadvisor
                </th>
              </tr>
              <tr className={theme.subText} style={{ borderBottom: `1px solid ${borderColor}` }}>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>
                  <SortButton sortKeyValue="googleReviews" label="口コミ数(前月比)" />
                </th>
                <th className={th}>MEO順位</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>
                  <SortButton sortKeyValue="tabelogReviews" label="口コミ数(前月比)" />
                </th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  <SortButton sortKeyValue="lineFriends" label="登録数" />
                </th>
                <th className={th}>前月比</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  <SortButton sortKeyValue="instagramFollowers" label="フォロワー数" />
                </th>
                <th className={th}>前月比</th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>
                  <SortButton sortKeyValue="dazhongReviews" label="口コミ数(前月比)" />
                </th>
                <th className={th} style={{ borderLeft: `1px solid ${borderColor}` }}>
                  ☆スコア(前月比)
                </th>
                <th className={th}>
                  <SortButton sortKeyValue="tripadvisorReviews" label="口コミ数(前月比)" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.storeId} style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <td className="py-1.5 px-2 text-left font-semibold whitespace-nowrap">
                    <Link href={`/marketing?store=${r.storeId}`} className="hover:underline" style={{ color: BRAND.blue }}>
                      {r.name}
                    </Link>
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.google ? (
                      <ScoreCell value={r.google.score.toFixed(1)} delta={<Delta value={r.google.score - r.google.scorePrev} digits={1} />} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    {r.google ? (
                      <ScoreCell value={r.google.reviews.toLocaleString()} delta={<Delta value={r.google.reviewsDelta} suffix="件" />} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>{r.google?.meoRank != null ? `${r.google.meoRank}位${r.google.meoTotal != null ? ` / ${r.google.meoTotal}` : ""}` : "—"}</td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.tabelog ? (
                      <ScoreCell value={r.tabelog.score.toFixed(2)} delta={<Delta value={r.tabelog.score - r.tabelog.scorePrev} digits={2} />} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    {r.tabelog ? (
                      <ScoreCell value={r.tabelog.reviews.toLocaleString()} delta={<Delta value={r.tabelog.reviewsDelta} suffix="件" />} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.lineFriends.toLocaleString()}
                  </td>
                  <td className={td}>
                    <Delta value={r.lineGrowth} />
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.instagramFollowers.toLocaleString()}
                  </td>
                  <td className={td}>
                    <Delta value={r.instagramGrowth} />
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.tracksDazhong && r.dazhong ? (
                      <ScoreCell value={r.dazhong.score.toFixed(1)} delta={<Delta value={r.dazhong.score - r.dazhong.scorePrev} digits={1} />} />
                    ) : r.tracksDazhong ? (
                      "未入力"
                    ) : (
                      <span className={theme.subText}>対象外</span>
                    )}
                  </td>
                  <td className={td}>
                    {r.tracksDazhong && r.dazhong ? (
                      <ScoreCell value={r.dazhong.reviews.toLocaleString()} delta={<Delta value={r.dazhong.reviewsDelta} suffix="件" />} />
                    ) : r.tracksDazhong ? (
                      "未入力"
                    ) : (
                      <span className={theme.subText}>対象外</span>
                    )}
                  </td>
                  <td className={td} style={{ borderLeft: `1px solid ${borderColor}` }}>
                    {r.tripadvisor ? (
                      <ScoreCell value={r.tripadvisor.score.toFixed(1)} delta={<Delta value={r.tripadvisor.score - r.tripadvisor.scorePrev} digits={1} />} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    {r.tripadvisor ? (
                      <ScoreCell value={r.tripadvisor.reviews.toLocaleString()} delta={<Delta value={r.tripadvisor.reviewsDelta} suffix="件" />} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className={`py-6 text-center ${theme.subText}`}>
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
