export const BRAND = {
  blue: "#0A6DC2",
  blueDark: "#08528F",
  green: "#21A24C",
  alert: "#E11D6F",
  amber: "#F59E0B",
  red: "#EF4444",
};

export const FLARO_COLORS: Record<string, string> = {
  S: "#21A24C",
  F: "#1D4ED8",
  L: "#2563EB",
  A: "#3B82F6",
  R: "#60A5FA",
  O: "#0EA5E9",
};

export const TYPE_PROFILE = {
  ramen: { label: "ラーメン", targetF: 30, targetL: 25 },
  yakiniku: { label: "焼肉・和牛", targetF: 38, targetL: 22 },
  spa: { label: "温浴施設", targetF: 14, targetL: 30 },
  sweets: { label: "スイーツ", targetF: 28, targetL: 24 },
  dining: { label: "ダイニング", targetF: 30, targetL: 26 },
  ck: { label: "セントラルキッチン", targetF: 46, targetL: 31 },
} as const;

export type StoreType = keyof typeof TYPE_PROFILE;

export const PC_CATEGORIES = ["食材買い出し", "食材(生鮮)", "消耗品", "雑費", "交通費", "備品", "その他"];
export const isFoodCategory = (c: string) => c.includes("食材");

/** Stores that additionally track 大衆点評 (Dianping) reputation, alongside Google/食べログ. */
export const DAZHONG_STORES = ["和牛之国", "和牛王国", "キョロちゃん 池田店", "京の虎牛"];
