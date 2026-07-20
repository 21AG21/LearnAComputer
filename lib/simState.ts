const KEY = "lac-sim";

function readAll(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
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
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearSimState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
