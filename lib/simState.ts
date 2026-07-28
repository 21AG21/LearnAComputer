import { storageGet, storageRemove, storageSet } from "./safeStorage";

const KEY = "lac-sim";

function readAll(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(storageGet(KEY) || "{}");
  } catch {
    return {};
  }
}

export function readSimState<T>(key: string): T | null {
  const all = readAll();
  return (all[key] as T) ?? null;
}

export function writeSimState(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[key] = value;
  // safeStorage falls back to memory when localStorage throws — the bare setItem
  // here used to crash the App Market's install click in private browsing.
  storageSet(KEY, JSON.stringify(all));
}

export function clearSimState(): void {
  if (typeof window === "undefined") return;
  storageRemove(KEY);
}
