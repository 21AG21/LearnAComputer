"use client";

import Image from "next/image";
import { useState } from "react";
import AppWindow from "./AppWindow";

export interface ChatMessage {
  from: "contact" | "me";
  text: string;
}

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
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  { from: "contact", text: "Woof woof! Hi friend! It's me, Doggo. What's your name?" },
];

const SIDEBAR_CONTACTS = [
  { name: "Doggo", avatar: "/playgrounds/Dog.png" },
  { name: "Cat", avatar: "/playgrounds/Cat1.png" },
  { name: "Snake", avatar: "/playgrounds/Snake.png" },
];

export default function MessagingApp({
  onClose,
  onMinimize,
  onSendMessage,
  contactName = "Doggo",
  avatarSrc = "/playgrounds/Dog.png",
  initialMessages = DEFAULT_MESSAGES,
  showHeader = true,
  instructionBanner,
}: MessagingAppProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "me", text }]);
    setDraft("");
    onSendMessage?.(text);
  }

  return (
    <AppWindow title="Messaging App" onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      <div className="h-full flex gap-4 px-2 pb-2">
        {/* Contacts sidebar */}
        <div className="w-40 shrink-0 bg-[#c9e4f7] border-2 border-black flex flex-col items-center gap-6 py-6">
          {SIDEBAR_CONTACTS.map((contact, i) => (
            <button
              key={contact.name}
              aria-label={`Contact: ${contact.name}`}
              className={`relative w-24 h-24 border-2 border-black overflow-hidden ${
                i === 0 ? "bg-blue-200" : "bg-white"
              }`}
            >
              <Image src={contact.avatar} alt={contact.name} fill sizes="96px" className="object-contain p-1" />
            </button>
          ))}
        </div>

        {/* Conversation pane */}
        <div className="flex-1 bg-[#c9e4f7] border-2 border-black flex flex-col p-4">
          {instructionBanner && (
            <p className="text-lg border-2 border-yellow-400 bg-yellow-100 rounded px-4 py-2 mb-3">
              {instructionBanner}
            </p>
          )}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 max-w-[75%] ${
                  message.from === "me" ? "self-end flex-row-reverse" : "self-start"
                }`}
              >
                {message.from === "contact" && (
                  <span className="relative w-10 h-10 shrink-0 border-2 border-black bg-white overflow-hidden">
                    <Image src={avatarSrc} alt={contactName} fill sizes="40px" className="object-contain p-0.5" />
                  </span>
                )}
                <p className="bg-white border-2 border-black px-4 py-2 text-xl break-words">
                  {message.from === "contact" && <span className="block text-sm font-bold">{contactName}</span>}
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
    </AppWindow>
  );
}
