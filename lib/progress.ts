"use client";

import { clearSimState } from "./simState";
import { storageGet, storageSet } from "./safeStorage";

// Progress is persisted in localStorage so it survives tab closes and returns across days.
// The read/write shape is intentionally small so it can be swapped for a real account + DB
// later without touching call sites. A schema version field lets future migrations
// discard or convert incompatible stored data rather than crashing.

const STORAGE_KEY = "lac-progress";
const SCHEMA_VERSION = 1;

interface ProgressState {
  version: number;
  completedSlugs: string[];
}

function readState(): ProgressState {
  if (typeof window === "undefined") return { version: SCHEMA_VERSION, completedSlugs: [] };
  try {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION, completedSlugs: [] };
    const parsed = JSON.parse(raw);
    // Unknown or future version → start fresh rather than corrupting with bad data.
    if (parsed.version !== SCHEMA_VERSION) return { version: SCHEMA_VERSION, completedSlugs: [] };
    return {
      version: SCHEMA_VERSION,
      completedSlugs: Array.isArray(parsed.completedSlugs) ? parsed.completedSlugs : [],
    };
  } catch {
    return { version: SCHEMA_VERSION, completedSlugs: [] };
  }
}

function writeState(state: ProgressState) {
  if (typeof window === "undefined") return;
  // When localStorage is unavailable (private browsing, locked-down machines),
  // safeStorage keeps the state in memory so this session still works, and fires
  // one event so StorageNotice can say so. Silence here used to mean progress
  // vanishing within the session.
  storageSet(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Fired after any change, so the account sync can push without every call site
 * having to know whether somebody is signed in.
 */
export const PROGRESS_EVENT = "lac-progress-changed";

function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function markComplete(slug: string): void {
  const state = readState();
  if (!state.completedSlugs.includes(slug)) {
    state.completedSlugs.push(slug);
    writeState(state);
    announce();
  }
}

export function getCompletedSlugs(): string[] {
  return readState().completedSlugs;
}

/** Used by the account sync when the merged list is bigger than the local one. */
export function replaceCompletedSlugs(slugs: string[]): void {
  writeState({ version: SCHEMA_VERSION, completedSlugs: slugs });
  announce();
}

export function resetProgress(): void {
  writeState({ version: SCHEMA_VERSION, completedSlugs: [] });
  // Also clear practice-simulator state (installed apps, and anything added later).
  clearSimState();
  announce();
}
