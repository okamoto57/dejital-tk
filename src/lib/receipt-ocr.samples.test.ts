import { describe, expect, it } from "vitest";
import { parseReceiptText } from "./receipt-ocr";

// Transcribed from real photos of receipts (drugstore, 100-yen shop,
// supermarket with member discounts, parking, small produce purchase).
// These exist because a real-world photo caught a bug plain hand-written
// test cases hadn't: "小計 5点 ¥540"-style lines (an item count between the
// keyword and the actual price) made the amount parser read "5" instead of
// "540". Keeping these as regression fixtures for that class of layout.

describe("parseReceiptText on real receipt samples", () => {
  it("drugstore receipt with a tax breakdown", () => {
    const text = `スギ薬局
西院店 075-325-2071
2026年07月17日(金)15:48 レジ0005
賞No00000100 セルフレジ0
エス オアシストイレ18 ¥547
A 流せるトイレクリーナー24枚
2コ×単107 ¥214
合計/ 3点 (対象) ¥761
(10%対象) ¥69
(10%税額) ¥69
(税合計) ¥761
決済ブランド PayPay
決済金額 ¥761
店No01737
レシートNo2484`;

    const parsed = parseReceiptText(text);
    expect(parsed.date).toBe("2026-07-17");
    expect(parsed.amount).toBe(761);
    expect(parsed.payee).toBe("スギ薬局");
    expect(parsed.category).toBe("消耗品");
  });

  it("100-yen shop receipt where '小計 5点 ¥540' precedes the total", () => {
    const text = `だんぜん!ダイソー
ダイソー 京都西院駅前店
TEL:075-326-6188
2026年07月18日(土)15:54
レジNo:10001 取引No:000030
ドウシシャ チョコレート
@100 X 5個 ¥500
小計 5点 ¥540
軽減税率対象額 ¥40
合計 ¥540
PayPay
お釣り ¥0
店:006447 レジNo:8917`;

    const parsed = parseReceiptText(text);
    expect(parsed.date).toBe("2026-07-18");
    // regression: must read the ¥540 total, not the "5" from "5点"
    expect(parsed.amount).toBe(540);
  });

  it("supermarket receipt with per-line member discounts", () => {
    const text = `AEON STYLE
イオンスタイル京都五条
TEL075-322-2300 FAX075-322-2301
領収証
登録番号T2040001000456
レジ0109 2026/7/20(月) 9:48
コーライきゅうりキムチ 894
(3個X単298)
会員様割引5% -45
松屋みぞれ玉 316
(2個X単158) -16
小計 ¥2,046
外税8%対象額 ¥2,046
外税8% ¥163
合計 ¥2,209
WAON支払 ¥2,209
お釣り ¥0`;

    const parsed = parseReceiptText(text);
    expect(parsed.date).toBe("2026-07-20");
    expect(parsed.amount).toBe(2209);
    expect(parsed.payee).toBe("AEON STYLE");
    expect(parsed.category).toBe("食材");
  });

  it("parking receipt (no item lines at all)", () => {
    const text = `名谷公園駐車場
公益財団法人 神戸市公園緑化協会
登録番号T1140005005376
精算機#01 A 精算No.000020
発券機#01 発券No.033782
入庫時刻 2026年7月15日(水)09:48
出庫時刻 2026年7月15日(水)12:35
駐車時間 2:47
駐車料金 A料金 500円
合計 500円
現金領収額
お預り
お釣り
駐車料金は消費税率10%対象です。`;

    const parsed = parseReceiptText(text);
    expect(parsed.date).toBe("2026-07-15");
    expect(parsed.amount).toBe(500);
    expect(parsed.payee).toBe("名谷公園駐車場");
    expect(parsed.category).toBe("交通費");
  });

  it("small produce receipt recognizes specific vegetable names", () => {
    const text = `AEON STYLE
イオンスタイル京都五条
TEL075-322-2300 FAX075-322-2301
領収証
イオンリテール株式会社
レジ0104 2026/7/22(水) 9:10
ミニトマト 248
きゅうり 136
(2個X単68)
小計 ¥384
外税8%対象額 ¥384
外税8% ¥30
合計 ¥414
WAON支払 ¥414
お釣り ¥0`;

    const parsed = parseReceiptText(text);
    expect(parsed.date).toBe("2026-07-22");
    expect(parsed.amount).toBe(414);
    expect(parsed.payee).toBe("AEON STYLE");
    expect(parsed.category).toBe("食材");
  });
});
