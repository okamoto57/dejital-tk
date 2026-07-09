"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface ThemeShape {
  dark: boolean;
  card: string;
  cardBorder: string;
  text: string;
  subText: string;
  chartGrid: string;
  chartAxis: string;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeShape | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("fl-app-dark");
    if (stored === "1") setDark(true);
  }, []);

  const toggle = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem("fl-app-dark", next ? "1" : "0");
      return next;
    });
  };

  const value: ThemeShape = {
    dark,
    card: dark ? "bg-slate-900" : "bg-white",
    cardBorder: dark ? "border-slate-800" : "border-slate-200",
    text: dark ? "text-slate-100" : "text-slate-800",
    subText: dark ? "text-slate-400" : "text-slate-500",
    chartGrid: dark ? "#1E293B" : "#EEF2F7",
    chartAxis: dark ? "#64748B" : "#94A3B8",
    toggle,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div
        className="min-h-screen w-full"
        style={{ backgroundColor: dark ? "#0B1220" : "#EEF2F7" }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeShape {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
