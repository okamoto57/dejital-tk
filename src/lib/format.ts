export const yen = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");
export const man = (n: number) =>
  (n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + " 万円";
export const pct = (n: number, digits = 1) => n.toFixed(digits) + "%";
export const yearMonthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Compares Japanese store names in natural reading order (rather than raw
 * Unicode code-point order, which would separate kana-led and kanji-led
 * names in a way that looks unsorted to a Japanese reader). */
export const compareJa = (a: string, b: string) => a.localeCompare(b, "ja");
