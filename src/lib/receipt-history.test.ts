import { describe, expect, it } from "vitest";
import { buildReceiptHistoryPayload } from "./receipt-history";

describe("buildReceiptHistoryPayload", () => {
  it("normalizes OCR results for storage", () => {
    const payload = buildReceiptHistoryPayload({
      storeId: "store-1",
      parsedDate: "2026-08-03",
      amount: 3250,
      payee: "  株式会社サンプル商店  ",
      note: "  冷やし中華  ",
      category: "食材買い出し",
    });

    expect(payload.payee).toBe("株式会社サンプル商店");
    expect(payload.note).toBe("冷やし中華");
    expect(payload.amount).toBe(3250);
    expect(payload.category).toBe("食材買い出し");
  });
});
