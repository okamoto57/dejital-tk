export interface ParsedReceipt {
  date: string;
  amount: number | null;
  payee: string;
  note: string;
  category: string;
}

const BOILERPLATE_LINE =
  /^(領収証|領収書|レシート|請求書|伝票|お買い上げ|お買上げ|お会計|合計|小計|税込|内税|外税|消費税|軽減税率|対象|お釣り|お預り|預り|現金|カード|クレジット|電子マネー|PayPay|WAON|nanaco|Suica|交通系|駐車|但し|様|上記正に受領|登録番号|点数|個数|小計|TEL|電話|FAX|No\.?|番号|会員|店舗|店番|株式会社|有限会社|住所|支払|精算|レジ|取引|担当|責任者|ポイント)/i;

function normalizeText(text: string) {
  let t = String(text || "");
  t = t.replace(/\r/g, "");
  t = t.replace(/[　\t]/g, " ");
  t = t.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 48));
  t = t.replace(/，/g, ",");
  t = t.replace(/．/g, ".");
  t = t.replace(/－/g, "-");
  t = t.replace(/￥/g, "¥");
  const kanjiMap: Record<string, string> = {
    零: "0",
    〇: "0",
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9",
  };
  t = t.replace(/[零〇一二三四五六七八九](?=[年月日])/g, (c) => kanjiMap[c] ?? c);
  // NOTE: intentionally use [ \t] rather than \s below — \s also matches
  // newlines, and this text is still multi-line here. Using \s silently
  // swallows line breaks whenever a line happens to end in one of these
  // punctuation chars (e.g. almost any line ending in "円"), merging
  // unrelated receipt lines into one and corrupting every line-based
  // extraction (payee, items, amount) downstream.
  t = t.replace(/([0-9])[ \t]+([0-9])/g, "$1$2");
  t = t.replace(/[ \t]*([,.\/\-:年月日¥円])[ \t]*/g, "$1");
  return t
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
}

function extractDate(text: string): string {
  const patterns = [
    /(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})\s*日?/,
    /(\d{4})\s*[/\-](\d{1,2})\s*[/\-](\d{1,2})/,
    /(\d{1,2})\s*[月/](\d{1,2})\s*日?/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[3]) {
      const year = Number(match[1]);
      const month = String(Number(match[2])).padStart(2, "0");
      const day = String(Number(match[3])).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const currentYear = new Date().getFullYear();
    const month = String(Number(match[1])).padStart(2, "0");
    const day = String(Number(match[2])).padStart(2, "0");
    return `${currentYear}-${month}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function normalizeAmountCandidate(raw: string): number | null {
  const normalized = String(raw || "")
    .replace(/[¥￥]/g, "")
    .replace(/[\s,，]/g, "")
    .replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

/** Finds the currency-marked number on a line (¥123 or 123円), preferring
 * the last one. Deliberately does NOT just grab "the first number after the
 * keyword" — lines like "小計 5点 ¥540" put an item-count ("5点") before the
 * real amount, and a naive first-number match would misread the total as 5. */
function extractCurrencyAmountFromLine(line: string): number | null {
  const yenPrefixed = [...line.matchAll(/[¥￥]([0-9,，.]+)/g)];
  if (yenPrefixed.length > 0) {
    return normalizeAmountCandidate(yenPrefixed[yenPrefixed.length - 1][1]);
  }
  const yenSuffixed = [...line.matchAll(/([0-9,，.]+)円/g)];
  if (yenSuffixed.length > 0) {
    return normalizeAmountCandidate(yenSuffixed[yenSuffixed.length - 1][1]);
  }
  return null;
}

function extractAmount(text: string): number | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse();
  // "合計" (grand total) must win over "現金"/"お釣り" (cash tendered / change),
  // which often appear below it and would otherwise be matched first.
  const strong = /(合計|税込|お会計|支払金額|請求金額|お支払い|小計)/i;
  const weak = /(金額|現金)/i;

  for (const pattern of [strong, weak]) {
    for (const line of lines) {
      if (!pattern.test(line)) continue;
      const amount = extractCurrencyAmountFromLine(line);
      if (amount !== null) return amount;
    }
  }

  // No keyword line had a usable currency amount — take the last
  // currency-marked number anywhere in the text (still prefers ¥/円 over a
  // bare number, so item counts elsewhere don't win by accident).
  for (const line of lines) {
    const amount = extractCurrencyAmountFromLine(line);
    if (amount !== null) return amount;
  }

  const fallback = lines
    .flatMap((line) => [...line.matchAll(/([0-9,，.]{2,})/g)].map((m) => normalizeAmountCandidate(m[1])))
    .filter((n): n is number => n !== null && n >= 10 && n <= 1000000 && !(n >= 1900 && n <= 2100));
  return fallback[0] ?? null;
}

function isPureNumberLine(line: string) {
  return /^[0-9\s,，¥￥.\-]+$/.test(line);
}

function isDateOrTimeLine(line: string) {
  return /\d{2,4}[年/\-]\d{1,2}[月/\-]\d{1,2}/.test(line) || /\d{1,2}[:：]\d{2}/.test(line);
}

// Deliberately narrower than BOILERPLATE_LINE: many real store names are
// legally registered as "株式会社◯◯" and commonly printed as the very
// first line of a receipt, so that prefix must NOT disqualify a line here
// even though it's a useful exclusion for purchased-item candidates.
const PAYEE_EXCLUDE_LINE =
  /^(領収証|領収書|レシート|請求書|伝票|お買い上げ|お買上げ|お会計|合計|小計|税込|内税|外税|消費税|軽減税率|お釣り|お預り|預り|現金|カード|クレジット|電子マネー|PayPay|WAON|nanaco|Suica|交通系|駐車|TEL|電話|FAX|No\.?|番号|住所|レジ|取引)/i;

function extractPayee(lines: string[]): string {
  for (const line of lines) {
    if (line.length < 2) continue;
    if (PAYEE_EXCLUDE_LINE.test(line)) continue;
    if (isDateOrTimeLine(line)) continue;
    if (isPureNumberLine(line)) continue;
    return line;
  }
  return lines[0] ?? "";
}

/** Picks the lines most likely to be purchased-item names (as opposed to
 * boilerplate, totals, or the store name itself), for the 購入品 field. */
function extractItems(lines: string[], payee: string): string {
  const candidates = lines.filter((line) => {
    if (!line || line.length < 2) return false;
    if (line === payee) return false;
    if (BOILERPLATE_LINE.test(line)) return false;
    if (isDateOrTimeLine(line)) return false;
    if (isPureNumberLine(line)) return false;
    if (/^(TEL|FAX)[\s:：]*[\d\-]+$/i.test(line)) return false;
    return true;
  });
  return candidates.slice(0, 4).join("・");
}

/** Best-effort mapping of receipt content to this app's 小口現金 科目 list. */
const FOOD_KEYWORDS =
  /(食材|野菜|肉|魚|卵|米|豆|精肉|鮮魚|青果|食品|飲料|酒|惣菜|パン|牛乳|乳製品|ヨーグルト|きゅうり|トマト|キャベツ|にんじん|たまねぎ|玉ねぎ|じゃがいも|ねぎ|レタス|もやし|キムチ|漬物|冷凍食品|調味料|食用油)/;

export function inferCategory(text: string): string {
  if (FOOD_KEYWORDS.test(text)) return "食材";
  if (/(消耗|洗剤|紙|トイレ|ラップ|ポリ袋|軍手|ゴム手袋)/.test(text)) return "消耗品";
  if (/(電車|バス|タクシ|ガソリン|駐車|高速|ETC|定期)/.test(text)) return "交通費";
  if (/(備品|器具|鍋|皿|箸|まな板|工具|電球)/.test(text)) return "備品";
  return "雑費";
}

export function parseReceiptText(text: string): ParsedReceipt {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

  const date = extractDate(normalized);
  const amount = extractAmount(normalized);
  const payee = extractPayee(lines);
  const note = extractItems(lines, payee);
  const category = inferCategory(normalized);

  return { date, amount, payee, note, category };
}
