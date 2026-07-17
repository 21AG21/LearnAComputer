"use client";

// Chat threads are persisted the same way as lesson progress (lib/progress.ts) so a
// conversation started inside a lesson (e.g. replying to Doggo) is still there later
// when the learner opens the Messaging App on its own in the Playground.

const STORAGE_KEY = "lac-chats";

export interface StoredChatMessage {
  from: "contact" | "me";
  text: string;
}

type ChatStore = Record<string, StoredChatMessage[]>;

function readStore(): ChatStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ChatStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage can throw in private-browsing mode or when the quota is exceeded.
    // Degrade silently — the learner loses persistence for this session only.
  }
}

export function getThread(contactId: string): StoredChatMessage[] | null {
  return readStore()[contactId] ?? null;
}

export function saveThread(contactId: string, messages: StoredChatMessage[]): void {
  const store = readStore();
  store[contactId] = messages;
  writeStore(store);
}
