"use client";

import { useState } from "react";
import AppWindow from "./AppWindow";

interface MailAppProps {
  onClose: () => void;
  onMinimize: () => void;
  onEmailOpened?: (subject: string) => void;
  /** Called when the learner sends a composed email (used by the Unit 2 "email Dr. Digital" task). */
  onSend?: (email: { to: string; subject: string; body: string }) => void;
  showHeader?: boolean;
}

interface Email {
  from: string;
  when: string;
  subject: string;
  body: string;
}

const EMAILS: Email[] = [
  {
    from: "Company CEO",
    when: "2 days ago",
    subject: "Promotion!!",
    body: "Congratulations on your hard work this quarter! We'd like to offer you a promotion. Let's talk soon.",
  },
  {
    from: "Scam",
    when: "1 week ago",
    subject: "Give me money",
    body: "I am a prince and I need your help moving $10,000,000. Just send me your bank details and a small fee first!",
  },
  {
    from: "Clothing Store",
    when: "4 hours ago",
    subject: "Out for delivery",
    body: "Your order is out for delivery! Your tracking #: 3492-XY. Expected by 5pm today.",
  },
  {
    from: "Doctor Digital",
    when: "10 minutes ago",
    subject: "Great Progress so Far",
    body: "Hi there! You're doing wonderfully in the lessons. Keep it up — you're becoming a real computer pro!",
  },
];

export default function MailApp({ onClose, onMinimize, onEmailOpened, onSend, showHeader = true }: MailAppProps) {
  const [selected, setSelected] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ to: "", subject: "", body: "" });

  function handleOpen(email: Email) {
    setComposing(false);
    setSelected(email);
    onEmailOpened?.(email.subject);
  }

  function handleSend() {
    onSend?.(draft);
    setComposing(false);
    setDraft({ to: "", subject: "", body: "" });
  }

  return (
    <AppWindow title="Mail App" onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      <div className="h-full flex px-2 pb-2">
        {/* Inbox list */}
        <div className="w-72 shrink-0 border-2 border-black flex flex-col overflow-y-auto">
          {EMAILS.map((email) => (
            <button
              key={email.subject}
              onClick={() => handleOpen(email)}
              className={`border-b-2 border-black last:border-b-0 bg-[#8fb4cb] text-left px-3 py-2 leading-tight ${
                selected?.subject === email.subject ? "brightness-110" : ""
              }`}
            >
              <p>
                <span className="font-bold">From</span>: {email.from}
              </p>
              <p>
                <span className="font-bold">When</span>: {email.when}
              </p>
              <p>
                <span className="font-bold">Subject</span>: {email.subject}
              </p>
              <p className="truncate">
                <span className="font-bold">Contents</span>: {email.body}
              </p>
            </button>
          ))}
        </div>

        {/* Reading / compose pane */}
        <div className="relative flex-1 bg-[#c9e4f7] border-2 border-l-0 border-black p-6 overflow-y-auto">
          {/* Compose pencil */}
          <button
            onClick={() => {
              setComposing(true);
              setSelected(null);
            }}
            aria-label="Compose new email"
            className="absolute top-3 right-3 w-12 h-12 flex items-center justify-center"
          >
            <PencilIcon className="w-10 h-10" />
          </button>

          {composing ? (
            <div className="space-y-3 pr-14">
              <p className="text-2xl font-bold">New Email</p>
              <label className="block">
                <span className="font-bold">To:</span>
                <input
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                  className="ml-2 border-2 border-black px-2 py-1 text-lg"
                  aria-label="To"
                />
              </label>
              <label className="block">
                <span className="font-bold">Subject:</span>
                <input
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                  className="ml-2 border-2 border-black px-2 py-1 text-lg"
                  aria-label="Subject"
                />
              </label>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                className="w-full h-40 border-2 border-black p-2 text-lg"
                placeholder="Write your message here..."
                aria-label="Email body"
              />
              <button onClick={handleSend} className="border-2 border-black px-6 py-2 text-lg font-bold bg-white">
                Send
              </button>
            </div>
          ) : (
            selected && (
              <div className="space-y-4 pr-14">
                <p className="text-2xl font-bold">{selected.subject}</p>
                <p className="text-xl">From: {selected.from}</p>
                <p className="text-lg text-gray-600">{selected.when}</p>
                <p className="text-xl whitespace-pre-wrap">{selected.body}</p>
              </div>
            )
          )}
        </div>
      </div>
    </AppWindow>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M6 34 L9 25 L27 7 L33 13 L15 31 Z" fill="#8db4e0" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
      <path d="M27 7 L33 13" stroke="#111" strokeWidth="2" />
      <path d="M9 25 L15 31" stroke="#111" strokeWidth="2" />
      <path d="M6 34 L11 32 L9 25 Z" fill="#f4c9a1" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 34 L8 33 L7 31 Z" fill="#333" />
      <path d="M27 7 L30 4 L36 10 L33 13 Z" fill="#e57373" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
