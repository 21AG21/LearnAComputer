"use client";

/**
 * localStorage with an in-memory fallback.
 *
 * On a locked-down library machine or in private browsing, localStorage can be
 * missing, full, or set to throw on write. The three stores (`lac-progress`,
 * `lac-sim`, `lac-chats`) used to degrade in three different ways — one threw on
 * an install click, the other two dropped writes silently, which was worse: every
 * read came back empty *within the same session*, so a lesson finished a minute
 * ago showed as not done.
 *
 * This wrapper makes the failure mode uniform and honest: writes that cannot
 * persist land in memory, reads see them for the rest of the tab's life, and the
 * first failure announces itself once so the UI can tell the learner their work
 * lasts until the tab closes.
 */

const memory = new Map<string, string>();
let degraded = false;

/** Fired once, on the first write that had to fall back to memory. */
export const STORAGE_DEGRADED_EVENT = "lac-storage-degraded";

function markDegraded() {
  if (degraded) return;
  degraded = true;
  window.dispatchEvent(new Event(STORAGE_DEGRADED_EVENT));
}

/** True when this tab's progress lives in memory only. */
export function isStorageDegraded(): boolean {
  return degraded;
}

export function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  // Memory wins once a write has fallen back — localStorage is stale from then on.
  const inMemory = memory.get(key);
  if (inMemory !== undefined) return inMemory;
  try {
    return window.localStorage.getItem(key);
  } catch {
    markDegraded();
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key); // persisted for real; stop shadowing
  } catch {
    memory.set(key, value);
    markDegraded();
  }
}

export function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    markDegraded();
  }
}
