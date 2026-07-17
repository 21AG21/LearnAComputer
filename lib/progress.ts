"use client";

// Progress is scoped to the browser session (sessionStorage) since there's no
// backend yet. The read/write shape here is deliberately small so it can be
// swapped for a real account + database later without touching call sites.

const STORAGE_KEY = "lac-progress";

interface ProgressState {
  completedSlugs: string[];
}

function readState(): ProgressState {
  if (typeof window === "undefined") return { completedSlugs: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedSlugs: [] };
    const parsed = JSON.parse(raw);
    return { completedSlugs: Array.isArray(parsed.completedSlugs) ? parsed.completedSlugs : [] };
  } catch {
    return { completedSlugs: [] };
  }
}

function writeState(state: ProgressState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function markComplete(slug: string): void {
  const state = readState();
  if (!state.completedSlugs.includes(slug)) {
    state.completedSlugs.push(slug);
    writeState(state);
  }
}

export function isComplete(slug: string): boolean {
  return readState().completedSlugs.includes(slug);
}

export function getCompletedSlugs(): string[] {
  return readState().completedSlugs;
}
