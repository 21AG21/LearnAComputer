"use client";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage can throw in private-browsing mode or when the quota is exceeded.
    // Degrade silently — the learner loses persistence for this session only.
  }
}

export function markComplete(slug: string): void {
  const state = readState();
  if (!state.completedSlugs.includes(slug)) {
    state.completedSlugs.push(slug);
    writeState(state);
  }
}

export function getCompletedSlugs(): string[] {
  return readState().completedSlugs;
}

export function resetProgress(): void {
  writeState({ version: SCHEMA_VERSION, completedSlugs: [] });
}
