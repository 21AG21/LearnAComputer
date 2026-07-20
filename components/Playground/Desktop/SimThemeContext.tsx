"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface SimTheme {
  dark: boolean;
  brightness: number; // 20–100
  nightShift: boolean;
  textScale: number; // 100–140
  boldText: boolean;
  notificationsMuted: boolean;
}

interface SimThemeCtx extends SimTheme {
  set: (patch: Partial<SimTheme>) => void;
}

const defaults: SimTheme = {
  dark: false,
  brightness: 100,
  nightShift: false,
  textScale: 100,
  boldText: false,
  notificationsMuted: false,
};

const Ctx = createContext<SimThemeCtx>({ ...defaults, set: () => {} });

export function SimThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SimTheme>(defaults);
  const value: SimThemeCtx = {
    ...theme,
    set: (patch) => setTheme((prev) => ({ ...prev, ...patch })),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSimTheme() {
  return useContext(Ctx);
}
