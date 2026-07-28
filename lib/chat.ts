"use client";

// Chat threads are persisted the same way as lesson progress (lib/progress.ts) so a
// conversation started inside a lesson (e.g. replying to Doggo) is still there later
// when the learner opens the Messaging App on its own in the Playground.

import { storageGet, storageSet } from "./safeStorage";

const STORAGE_KEY = "lac-chats";

export interface StoredChatMessage {
  from: "contact" | "me";
  text: string;
}

type ChatStore = Record<string, StoredChatMessage[]>;

function readStore(): ChatStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = storageGet(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ChatStore) {
  if (typeof window === "undefined") return;
  // safeStorage keeps the thread in memory when localStorage cannot persist it,
  // so the conversation survives the session even on a locked-down machine.
  storageSet(STORAGE_KEY, JSON.stringify(store));
}

export function getThread(contactId: string): StoredChatMessage[] | null {
  return readStore()[contactId] ?? null;
}

export function saveThread(contactId: string, messages: StoredChatMessage[]): void {
  const store = readStore();
  store[contactId] = messages;
  writeStore(store);
}
