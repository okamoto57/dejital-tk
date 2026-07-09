"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, CalendarDays, Wallet, Megaphone, Building2, Store, Moon, Sun, PencilLine, Share2, CalendarClock, ClipboardList, UserCircle } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { yearMonthNow, compareJa } from "@/lib/format";
import { logout } from "@/lib/actions";
import { Logo } from "./ui";
import { useAppTheme } from "./theme-provider";

interface StoreOption {
  id: string;
  name: string;
}

export function AppShell({
  role,
  stores,
  userName,
  children,
}: {
  role: "HQ_ADMIN" | "STORE_MANAGER";
  stores: StoreOption[];
  userName: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortedStores = [...stores].sort((a, b) => compareJa(a.name, b.name));
  const currentStoreId = searchParams.get("store") ?? sortedStores[0]?.id ?? null;
  const currentMonth = searchParams.get("month") ?? yearMonthNow();
  const showMonthPicker = !pathname.startsWith("/stores");

  const tabs = [
    { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "input", label: "データ入力", icon: PencilLine },
    { id: "inventory", label: "棚卸入力", icon: ClipboardList },
    { id: "salesfl", label: "日別 売上・FL", icon: CalendarDays },
    { id: "pettycash", label: "小口現金 出納帳", icon: Wallet },
    { id: "marketing", label: "グルメ・SNS集計分析", icon: Megaphone },
    ...(role === "HQ_ADMIN"
      ? [
          { id: "hq", label: "全店舗比較", icon: Building2 },
          { id: "social", label: "SNS全店比較", icon: Share2 },
          { id: "stores", label: "店舗管理", icon: Store },
        ]
      : []),
  ];

  function navigateTo(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (currentStoreId && tabId !== "hq" && tabId !== "stores" && tabId !== "social") params.set("store", currentStoreId);
    router.push(`/${tabId}?${params.toString()}`);
  }

  function switchStore(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("store", storeId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function switchMonth(month: string) {
    if (!month) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className={`mx-auto max-w-screen-xl px-4 pb-16 pt-4 ${theme.text}`}
      style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Yu Gothic',system-ui,sans-serif" }}
    >
      <header className={`${theme.card} ${theme.cardBorder} mb-4 rounded-2xl border px-5 py-3.5 shadow-sm`}>
        <div className="flex flex-wrap items-center gap-4">
          <Logo />
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {role === "HQ_ADMIN" && stores.length > 0 && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${theme.cardBorder} ${theme.dark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                <Store size={16} style={{ color: BRAND.blue }} />
                <select
                  value={currentStoreId ?? ""}
                  onChange={(e) => switchStore(e.target.value)}
                  className={`max-w-xs cursor-pointer bg-transparent text-sm font-semibold outline-none ${theme.text}`}
                >
                  {sortedStores.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-800">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {role === "STORE_MANAGER" && stores[0] && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${theme.cardBorder} ${theme.dark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                <Store size={16} style={{ color: BRAND.blue }} />
                <span className="text-sm font-semibold">{stores[0].name}</span>
              </div>
            )}
            {showMonthPicker && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${theme.cardBorder} ${theme.dark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                <CalendarClock size={16} style={{ color: BRAND.blue }} />
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => switchMonth(e.target.value)}
                  className={`cursor-pointer bg-transparent text-sm font-semibold outline-none ${theme.text}`}
                />
              </div>
            )}
            <Link
              href="/account"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${theme.cardBorder} ${theme.subText}`}
              title="アカウント設定・パスワード変更"
            >
              <UserCircle size={14} />
              <span className="hidden sm:inline">{userName}</span>
            </Link>
            <button
              onClick={theme.toggle}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${theme.cardBorder} ${
                theme.dark ? "bg-slate-800 text-amber-300" : "bg-slate-50 text-slate-600"
              }`}
              title="テーマ切替"
            >
              {theme.dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <form action={logout}>
              <button
                type="submit"
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${theme.cardBorder} ${theme.subText}`}
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>

        <nav className="mt-3.5 flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const active = pathname.startsWith(`/${t.id}`);
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => navigateTo(t.id)}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition"
                style={
                  active
                    ? { backgroundColor: BRAND.blue, color: "#fff" }
                    : { backgroundColor: theme.dark ? "#1E293B" : "#F1F5F9", color: theme.dark ? "#94A3B8" : "#475569" }
                }
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {children}

      <footer className={`mt-8 text-center text-xs ${theme.subText}`}>
        デジタル・阪神TK — 店舗FL管理システム
      </footer>
    </div>
  );
}
