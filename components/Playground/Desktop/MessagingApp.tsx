"use client";

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
  initialMessages?: ChatMessage[];
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  { from: "contact", text: "Woof woof! Hi friend! It's me, Doggo. What's your name?" },
];

export default function MessagingApp({
  onClose,
  onMinimize,
  onSendMessage,
  contactName = "Doggo",
  initialMessages = DEFAULT_MESSAGES,
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
    <AppWindow title="Messaging App" onClose={onClose} onMinimize={onMinimize}>
      <div className="h-full flex gap-4 px-2 pb-2">
        {/* Contacts sidebar */}
        <div className="w-40 shrink-0 bg-[#c9e4f7] border-2 border-black flex flex-col items-center gap-6 py-6">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              aria-label={i === 0 ? `Contact: ${contactName}` : `Contact ${i + 1}`}
              className="w-24 h-24 bg-white border-2 border-black flex items-center justify-center text-sm font-semibold"
            >
              {i === 0 ? contactName : ""}
            </button>
          ))}
        </div>

        {/* Conversation pane */}
        <div className="flex-1 bg-[#c9e4f7] border-2 border-black flex flex-col p-4">
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {messages.map((message, i) => (
              <p
                key={i}
                className={`bg-white border-2 border-black px-4 py-2 text-xl max-w-[70%] break-words ${
                  message.from === "me" ? "self-end" : "self-start"
                }`}
              >
                {message.from === "contact" && (
                  <span className="block text-sm font-bold">{contactName}</span>
                )}
                {message.text}
              </p>
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
