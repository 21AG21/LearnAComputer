"use client";

import { useState } from "react";
import AppWindow from "./AppWindow";

interface MailAppProps {
  onClose: () => void;
  onMinimize: () => void;
  onEmailOpened?: (subject: string) => void;
}

const EMAILS = [
  {
    from: "Dr. Digital",
    subject: "Welcome to your new computer!",
    body: "Hi there!\n\nI'm so glad you're exploring your new computer. Click around — you can't break anything in here!\n\n— Dr. Digital",
  },
  {
    from: "Grandma",
    subject: "Sunday dinner",
    body: "Hi sweetie,\n\nAre you coming over for dinner on Sunday? I'm making your favorite!\n\nLove, Grandma",
  },
  {
    from: "Library",
    subject: "Your book is ready for pickup",
    body: "Good news! The book you placed on hold is ready. Please pick it up within 7 days.",
  },
  {
    from: "Weather Alerts",
    subject: "Sunny skies this weekend",
    body: "Expect clear skies and 75°F this weekend. A great time for a walk!",
  },
];

export default function MailApp({ onClose, onMinimize, onEmailOpened }: MailAppProps) {
  const [selected, setSelected] = useState<(typeof EMAILS)[number] | null>(null);

  function handleOpen(email: (typeof EMAILS)[number]) {
    setSelected(email);
    onEmailOpened?.(email.subject);
  }

  return (
    <AppWindow title="Mail App" onClose={onClose} onMinimize={onMinimize}>
      <div className="h-full flex px-2 pb-2">
        {/* Inbox list */}
        <div className="w-64 shrink-0 border-2 border-black flex flex-col">
          {EMAILS.map((email) => (
            <button
              key={email.subject}
              onClick={() => handleOpen(email)}
              className={`h-1/4 border-b-2 border-black last:border-b-0 bg-[#8fb4cb] text-left px-3 py-2 ${
                selected?.subject === email.subject ? "brightness-110" : ""
              }`}
            >
              <span className="block font-bold text-lg">{email.from}</span>
              <span className="block text-base truncate">{email.subject}</span>
            </button>
          ))}
        </div>

        {/* Reading pane */}
        <div className="flex-1 bg-[#c9e4f7] border-2 border-l-0 border-black p-6 overflow-y-auto">
          {selected && (
            <div className="space-y-4">
              <p className="text-2xl font-bold">{selected.subject}</p>
              <p className="text-xl">From: {selected.from}</p>
              <p className="text-xl whitespace-pre-wrap">{selected.body}</p>
            </div>
          )}
        </div>
      </div>
    </AppWindow>
  );
}
