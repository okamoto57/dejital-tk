"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { BRAND, FLARO_COLORS } from "@/lib/theme";
import { yen } from "@/lib/format";
import { useAppTheme } from "./theme-provider";

export function Card({
  className = "",
  children,
  title,
  right,
}: {
  className?: string;
  children: React.ReactNode;
  title?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-2xl border p-4 shadow-sm ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-bold">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function FlaroBadge({ k }: { k: keyof typeof FLARO_COLORS }) {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: FLARO_COLORS[k] }}
    >
      {k}
    </span>
  );
}

export function Stars({ score, empty }: { score: number; empty?: string }) {
  const theme = useAppTheme();
  const emptyColor = empty ?? (theme.dark ? "#334155" : "#CBD5E1");
  return (
    <span className="whitespace-nowrap" style={{ letterSpacing: "1px" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ color: i < Math.round(score) ? "#F5A623" : emptyColor }}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Delta({ value, suffix = "", digits = 0 }: { value: number; suffix?: string; digits?: number }) {
  const up = value >= 0;
  const v = Math.abs(value).toFixed(digits);
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: up ? BRAND.green : BRAND.red }}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? "+" : "−"}
      {v}
      {suffix}
    </span>
  );
}

export function SummaryCard({
  icon,
  accent,
  label,
  value,
  sub,
  badge,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-2xl border p-4 shadow-sm`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: accent }}>
          {icon}
        </span>
        <span className={`text-xs font-semibold leading-tight ${theme.subText}`}>{label}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="text-2xl font-black tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className={`mt-1 text-xs ${theme.subText}`}>{sub}</div>}
    </div>
  );
}

export function MiniKpi({ label, value }: { label: string; value: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <div className={`${theme.card} ${theme.cardBorder} rounded-xl border px-3 py-2.5 shadow-sm`}>
      <div className={`text-xs ${theme.subText}`}>{label}</div>
      <div className="mt-0.5 text-base font-bold">{value}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-semibold ${theme.subText}`}>{label}</span>
      {children}
    </label>
  );
}

export function useInputCls() {
  const theme = useAppTheme();
  return `w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none ${
    theme.dark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
  }`;
}

interface TooltipPayloadItem {
  color?: string;
  fill?: string;
  name?: string;
  value?: number | string | null;
}

export function ChartTip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  money?: boolean;
}) {
  const theme = useAppTheme();
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${
        theme.dark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-700"
      }`}
    >
      {label && <div className="mb-1 font-bold">{label}</div>}
      {payload
        .filter((p) => p.value != null)
        .map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color || p.fill }} />
            <span className="flex-1">{p.name}</span>
            <span className="font-semibold">
              {money && typeof p.value === "number"
                ? yen(p.value)
                : typeof p.value === "number"
                  ? p.value.toLocaleString()
                  : p.value}
            </span>
          </div>
        ))}
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
        <circle cx="42" cy="42" r="30" stroke={BRAND.blue} strokeWidth="11" fill="none" />
        <path d="M64 64 L86 86" stroke={BRAND.blue} strokeWidth="11" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-black tracking-tight" style={{ color: BRAND.blue }}>
        デジタル・阪神TK
      </span>
    </div>
  );
}
