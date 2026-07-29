"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ColorFilter = "none" | "grayscale" | "warm";

export interface SimTheme {
  dark: boolean;
  brightness: number; // 20–100
  nightShift: boolean;
  textScale: number; // 100–140
  boldText: boolean;
  notificationsMuted: boolean;
  invert: boolean;
  highContrast: boolean;
  colorFilter: ColorFilter;
  reduceMotion: boolean;
  largeCursor: boolean;
  spokenDescriptions: boolean;
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
  invert: false,
  highContrast: false,
  colorFilter: "none",
  reduceMotion: false,
  largeCursor: false,
  spokenDescriptions: false,
};

/**
 * The CSS filter chain the desktop wears. Brightness and Night Shift are drawn
 * as overlays instead, so they are not here. Order matters: the color filter
 * and contrast act on the real colors, and invert runs last so it flips
 * whatever they produced — which is what an inverted display actually does.
 */
export function themeFilter(t: SimTheme): string | undefined {
  const parts: string[] = [];
  if (t.colorFilter === "grayscale") parts.push("grayscale(1)");
  if (t.colorFilter === "warm") parts.push("sepia(0.55) saturate(1.4) hue-rotate(-12deg)");
  if (t.highContrast) parts.push("contrast(1.55)");
  if (t.invert) parts.push("invert(1) hue-rotate(180deg)");
  return parts.length ? parts.join(" ") : undefined;
}

/** A fat high-visibility arrow, drawn inline so it needs no asset. */
const BIG_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M8 4 L8 38 L17 30 L23 43 L30 40 L24 27 L36 27 Z' fill='%23ffffff' stroke='%23000000' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E\") 6 4, auto";

export function themeCursor(t: SimTheme): string | undefined {
  return t.largeCursor ? BIG_CURSOR : undefined;
}

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
