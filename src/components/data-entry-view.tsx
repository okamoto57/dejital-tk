"use client";

import { Camera, Video, MessageCircle } from "lucide-react";
import type { DailyRow } from "@/lib/types";
import type { GourmetRow, ReputationInitial, PreviousScoreRef } from "./entry-forms";
import { DailyRecordForm, BulkDailyRecordForm, BulkBudgetForm, GourmetMediaForm, ReputationForm, SnsEntryForm } from "./entry-forms";

export interface SnsInitialData {
  instagram: Record<string, number>;
  tiktok: Record<string, number>;
  line: Record<string, number>;
}

export interface PreviousReference {
  google: PreviousScoreRef | null;
  tabelog: PreviousScoreRef | null;
  dazhong: PreviousScoreRef | null;
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  lineFriends: number | null;
}

export function DataEntryView({
  storeId,
  yearMonth,
  dailyRows,
  gourmet,
  google,
  tabelog,
  dazhong,
  sns,
  previous,
}: {
  storeId: string;
  yearMonth: string;
  dailyRows: DailyRow[];
  gourmet: GourmetRow[];
  google: ReputationInitial | null;
  tabelog: ReputationInitial | null;
  dazhong?: ReputationInitial | null;
  sns: SnsInitialData;
  previous: PreviousReference;
}) {
  return (
    <div className="space-y-4">
      <DailyRecordForm storeId={storeId} yearMonth={yearMonth} />

      <BulkDailyRecordForm storeId={storeId} yearMonth={yearMonth} rows={dailyRows} />

      <BulkBudgetForm storeId={storeId} yearMonth={yearMonth} rows={dailyRows} />

      <GourmetMediaForm storeId={storeId} yearMonth={yearMonth} rows={gourmet} />

      <div className={`grid grid-cols-1 gap-4 ${dazhong !== undefined ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <ReputationForm
          storeId={storeId}
          yearMonth={yearMonth}
          source="GOOGLE"
          label="Google評価を入力"
          color="#4285F4"
          initial={google}
          previous={previous.google}
        />
        <ReputationForm
          storeId={storeId}
          yearMonth={yearMonth}
          source="TABELOG"
          label="食べログ評価を入力"
          color="#FF2800"
          initial={tabelog}
          previous={previous.tabelog}
        />
        {dazhong !== undefined && (
          <ReputationForm
            storeId={storeId}
            yearMonth={yearMonth}
            source="DAZHONG"
            label="大衆点評を入力"
            color="#FF6A00"
            initial={dazhong ?? null}
            previous={previous.dazhong}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SnsEntryForm
          storeId={storeId}
          yearMonth={yearMonth}
          platform="instagram"
          icon={Camera}
          color="#E1306C"
          name="Instagram"
          initial={sns.instagram}
          countField={{ key: "followers", label: "フォロワー" }}
          otherFields={[
            { key: "reach", label: "リーチ" },
            { key: "engage", label: "エンゲージ率(%)" },
          ]}
          previousCount={previous.instagramFollowers}
        />
        <SnsEntryForm
          storeId={storeId}
          yearMonth={yearMonth}
          platform="tiktok"
          icon={Video}
          color="#111827"
          name="TikTok"
          initial={sns.tiktok}
          countField={{ key: "followers", label: "フォロワー" }}
          otherFields={[
            { key: "views", label: "再生数" },
            { key: "engage", label: "エンゲージ率(%)" },
          ]}
          previousCount={previous.tiktokFollowers}
        />
        <SnsEntryForm
          storeId={storeId}
          yearMonth={yearMonth}
          platform="line"
          icon={MessageCircle}
          color="#06C755"
          name="LINE公式"
          initial={sns.line}
          countField={{ key: "friends", label: "友だち数" }}
          otherFields={[
            { key: "reserve", label: "LINE経由予約(件)" },
            { key: "coupon", label: "クーポン使用" },
          ]}
          previousCount={previous.lineFriends}
        />
      </div>
    </div>
  );
}
