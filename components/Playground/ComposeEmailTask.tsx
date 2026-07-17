"use client";

import { useState } from "react";
import MailApp from "./Desktop/MailApp";
import { checkTypeText } from "./TaskChecker";

interface ComposeEmailTaskProps {
  to: string;
  subject: string;
  requiredBody: string;
  onResult: (success: boolean) => void;
  onExit: () => void;
}

export default function ComposeEmailTask({ to, subject, requiredBody, onResult, onExit }: ComposeEmailTaskProps) {
  const [wrong, setWrong] = useState(false);

  function handleSend(email: { to: string; subject: string; body: string }) {
    const success = checkTypeText(requiredBody, email.body, true);
    setWrong(!success);
    onResult(success);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <MailApp
          onClose={onExit}
          onMinimize={onExit}
          onSend={handleSend}
          composeDefaults={{ to, subject }}
          composeBanner={`Type this message exactly: "${requiredBody}"`}
          promptBanner="Click here to compose your email:"
        />
      </div>
      {wrong && (
        <p className="text-red-600 font-semibold text-center py-2">Not quite yet — check your message and send it again.</p>
      )}
    </div>
  );
}
