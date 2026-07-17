"use client";

import Image from "next/image";
import { useState } from "react";
import AppWindow from "./AppWindow";
import { getThread, saveThread, StoredChatMessage } from "@/lib/chat";

export type ChatMessage = StoredChatMessage;

interface MessagingAppProps {
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage?: (text: string) => void;
  contactName?: string;
  avatarSrc?: string;
  initialMessages?: ChatMessage[];
  showHeader?: boolean;
  /** Yellow-highlighted Dr. Digital-style tip — only pass this from the specific lesson that needs it. */
  instructionBanner?: string;
  noWifi?: boolean;
}

// The lesson message-reply task always targets Doggo today.
const TARGET_CONTACT_ID = "doggo";

const CONTACT_ORDER = ["doggo", "cat", "snake"];

const DEFAULT_CONTACTS: Record<string, { name: string; avatar: string; greeting: string }> = {
  doggo: { name: "Doggo", avatar: "/playgrounds/Dog.png", greeting: "Woof woof! Hi friend! It's me, Doggo. What's your name?" },
  cat: { name: "Cat", avatar: "/playgrounds/Cat1.png", greeting: "Meow! I'm Cat. Want to chat with me too?" },
  snake: { name: "Snake", avatar: "/playgrounds/Snake.png", greeting: "Hisss... hi there, I'm Snake! Nice to meet you." },
};

function initialThreads(doggoOverride?: ChatMessage[]): Record<string, ChatMessage[]> {
  const threads: Record<string, ChatMessage[]> = {};
  for (const id of CONTACT_ORDER) {
    const saved = getThread(id);
    if (saved) {
      threads[id] = saved;
    } else if (id === TARGET_CONTACT_ID && doggoOverride) {
      threads[id] = doggoOverride;
    } else {
      threads[id] = [{ from: "contact", text: DEFAULT_CONTACTS[id].greeting }];
    }
  }
  return threads;
}

export default function MessagingApp({
  onClose,
  onMinimize,
  onSendMessage,
  contactName,
  avatarSrc,
  initialMessages,
  showHeader = true,
  instructionBanner,
  noWifi = false,
}: MessagingAppProps) {
  const [draft, setDraft] = useState("");
  const [activeContactId, setActiveContactId] = useState(TARGET_CONTACT_ID);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(() => initialThreads(initialMessages));

  const contacts = { ...DEFAULT_CONTACTS };
  if (contactName) contacts[TARGET_CONTACT_ID] = { ...contacts[TARGET_CONTACT_ID], name: contactName };
  if (avatarSrc) contacts[TARGET_CONTACT_ID] = { ...contacts[TARGET_CONTACT_ID], avatar: avatarSrc };

  const activeContact = contacts[activeContactId];
  const activeMessages = threads[activeContactId] ?? [];

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const next = [...activeMessages, { from: "me" as const, text }];
    setThreads((prev) => ({ ...prev, [activeContactId]: next }));
    saveThread(activeContactId, next);
    setDraft("");
    if (activeContactId === TARGET_CONTACT_ID) onSendMessage?.(text);
  }

  return (
    <AppWindow title="Messaging App" onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      <div className="relative h-full">
      {noWifi && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 gap-2">
          <p className="text-4xl">📵</p>
          <p className="text-xl font-bold text-red-600">No WiFi</p>
          <p className="text-gray-500 text-sm">Connect to a network to use Messaging.</p>
        </div>
      )}
      <div className="h-full flex gap-4 px-2 pb-2">
        {/* Contacts sidebar */}
        <div className="w-40 shrink-0 bg-[#c9e4f7] border-2 border-black flex flex-col items-center gap-6 py-6">
          {CONTACT_ORDER.map((id) => (
            <button
              key={id}
              onClick={() => setActiveContactId(id)}
              aria-label={`Contact: ${contacts[id].name}`}
              className={`relative w-24 h-24 border-2 border-black overflow-hidden ${
                id === activeContactId ? "bg-blue-200" : "bg-white"
              }`}
            >
              <Image src={contacts[id].avatar} alt={contacts[id].name} fill sizes="96px" className="object-contain p-1" />
            </button>
          ))}
        </div>

        {/* Conversation pane */}
        <div className="flex-1 bg-[#c9e4f7] border-2 border-black flex flex-col p-4">
          {instructionBanner && activeContactId === TARGET_CONTACT_ID && (
            <p className="text-lg border-2 border-yellow-400 bg-yellow-100 rounded px-4 py-2 mb-3">
              {instructionBanner}
            </p>
          )}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {activeMessages.map((message, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 max-w-[75%] ${
                  message.from === "me" ? "self-end flex-row-reverse" : "self-start"
                }`}
              >
                {message.from === "contact" && (
                  <span className="relative w-10 h-10 shrink-0 border-2 border-black bg-white overflow-hidden">
                    <Image src={activeContact.avatar} alt={activeContact.name} fill sizes="40px" className="object-contain p-0.5" />
                  </span>
                )}
                <p className="bg-white border-2 border-black px-4 py-2 text-xl break-words">
                  {message.from === "contact" && <span className="block text-sm font-bold">{activeContact.name}</span>}
                  {message.text}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-stretch gap-3 pt-3">
            <span className="bg-white border-2 border-black px-3 flex items-center text-xl shrink-0">Type Here:</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              aria-label="Message text"
              className="flex-1 bg-[#8fb4cb] border-2 border-black px-3 text-xl outline-none"
            />
          </div>
        </div>
      </div>
      </div>
    </AppWindow>
  );
}
