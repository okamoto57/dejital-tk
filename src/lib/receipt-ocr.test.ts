import { describe, expect, it } from "vitest";
import { inferCategory, parseReceiptText } from "./receipt-ocr";

describe("parseReceiptText", () => {
  it("extracts date, amount, payee, and purchased items from a typical Japanese receipt", () => {
    const text = `株式会社サンプル商店
2026/08/03 08:24
お会計 3,250円
合計 3,250円
冷やし中華
`;

    const parsed = parseReceiptText(text);

    expect(parsed.date).toBe("2026-08-03");
    expect(parsed.amount).toBe(3250);
    expect(parsed.payee).toBe("株式会社サンプル商店");
    expect(parsed.note).toContain("冷やし中華");
    expect(parsed.note).not.toContain("お会計");
  });

  it("handles a receipt with a slash date and yen symbol", () => {
    const text = `山田商店
08/01 19:32
￥1,280
お会計￥1,280
`;

    const parsed = parseReceiptText(text);

    expect(parsed.date).toBe("2026-08-01");
    expect(parsed.amount).toBe(1280);
    expect(parsed.payee).toBe("山田商店");
  });

  it("collects multiple purchased-item lines while excluding boilerplate and totals", () => {
    const text = `八百屋やまと
2026/07/15 10:02
にんじん 3束
たまねぎ 1袋
小計 1,200円
消費税 96円
合計 1,296円
現金 2,000円
お釣り 704円
`;

    const parsed = parseReceiptText(text);

    expect(parsed.payee).toBe("八百屋やまと");
    expect(parsed.note).toBe("にんじん 3束・たまねぎ 1袋");
    expect(parsed.amount).toBe(1296);
  });
});

describe("inferCategory", () => {
  it("maps food-related receipt text to 食材買い出し", () => {
    expect(inferCategory("八百屋やまと にんじん たまねぎ 野菜")).toBe("食材買い出し");
  });

  it("maps cleaning-supply text to 消耗品", () => {
    expect(inferCategory("業務用洗剤 トイレットペーパー")).toBe("消耗品");
  });

  it("maps transit text to 交通費", () => {
    expect(inferCategory("タクシー乗車 領収書")).toBe("交通費");
  });

  it("falls back to 雑費 when nothing matches", () => {
    expect(inferCategory("文房具店 ボールペン")).toBe("雑費");
  });
});
