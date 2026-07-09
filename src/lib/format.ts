export const yen = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");
export const man = (n: number) =>
  (n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + " 万円";
export const pct = (n: number, digits = 1) => n.toFixed(digits) + "%";
export const yearMonthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
