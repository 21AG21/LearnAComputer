"use client";

import { useState } from "react";
import SimulatorFrame from "./SimulatorFrame";

/**
 * A hands-on, guided messaging and video calling simulator. The learner
 * performs real messaging actions — selecting contacts, sending messages,
 * attaching photos, reacting to messages, starting/managing video calls —
 * one guided step at a time with pulsing highlights.
 */

export type GuidedMessagingStep = {
  say: string;
  action:
    | "select-contact"
    | "send-message"
    | "add-reaction"
    | "attach-photo"
    | "start-call"
    | "mute"
    | "camera-off"
    | "end-call";
  target?: string;
  value?: string;
};

interface GuidedMessagingTaskProps {
  goal: string;
  steps: GuidedMessagingStep[];
  onResult: (success: boolean) => void;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: string;
}

const CONTACTS: Contact[] = [
  { id: "alex", name: "Alex", avatar: "👤", status: "Hey! What's up?" },
  { id: "jordan", name: "Jordan", avatar: "👩", status: "Free to chat" },
  { id: "sam", name: "Sam", avatar: "🧑", status: "At work" },
  { id: "grandma", name: "Grandma", avatar: "👵", status: "Miss you!" },
];

interface Message {
  from: "me" | "contact";
  text: string;
  photo?: boolean;
  reactions?: string[];
}

const INITIAL_THREADS: Record<string, Message[]> = {
  alex: [{ from: "contact", text: "Hey! Want to meet at the coffee shop at 3pm tomorrow?" }],
  jordan: [{ from: "contact", text: "Did you see that funny video I sent?" }],
  sam: [{ from: "contact", text: "Can you pick up milk on the way home?" }],
  grandma: [{ from: "contact", text: "Hi sweetheart! How are you doing? I miss you so much! 💕" }],
};

export default function GuidedMessagingTask({ goal, steps, onResult }: GuidedMessagingTaskProps) {
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Message[]>>(INITIAL_THREADS);
  const [draft, setDraft] = useState("");
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;
  const currentMessages = activeContact ? threads[activeContact] ?? [] : [];
  const currentContactObj = CONTACTS.find((c) => c.id === activeContact);

  function completeStep() {
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
    setPhase(0);
  }

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "select-contact":
        return kind === "contact" && name === step.target;
      case "send-message":
        return phase === 0 ? kind === "message-input" : kind === "send-btn";
      case "add-reaction":
        return phase === 0 ? kind === "message-bubble" : kind === "reaction-picker";
      case "attach-photo":
        return phase === 0 ? kind === "attach-btn" : kind === "photo-pick";
      case "start-call":
        return kind === "call-btn";
      case "mute":
        return kind === "mute-btn";
      case "camera-off":
        return kind === "camera-btn";
      case "end-call":
        return kind === "endcall-btn";
      default:
        return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  function handleSelectContact(id: string) {
    setActiveContact(id);
    if (step?.action === "select-contact" && step.target === id) {
      completeStep();
    }
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || !activeContact) return;
    const next = [...currentMessages, { from: "me" as const, text }];
    setThreads((prev) => ({ ...prev, [activeContact]: next }));
    setDraft("");
    if (step?.action === "send-message" && phase === 1) {
      const target = (step.value ?? "").toLowerCase();
      if (text.toLowerCase().includes(target) || !target) {
        completeStep();
      }
    }
  }

  function handleInputFocus() {
    if (step?.action === "send-message" && phase === 0) {
      setPhase(1);
    }
  }

  function handleReactionClick(msgIdx: number) {
    if (step?.action === "add-reaction" && phase === 0) {
      setPhase(1);
    }
  }

  function handleReactionPick(emoji: string, msgIdx: number) {
    if (!activeContact) return;
    const msgs = [...currentMessages];
    const msg = { ...msgs[msgIdx] };
    msg.reactions = [...(msg.reactions ?? []), emoji];
    msgs[msgIdx] = msg;
    setThreads((prev) => ({ ...prev, [activeContact]: msgs }));
    if (step?.action === "add-reaction" && phase === 1) {
      completeStep();
    }
  }

  function handleAttach() {
    if (step?.action === "attach-photo" && phase === 0) {
      setPhase(1);
    }
  }

  function handlePhotoPick() {
    if (!activeContact) return;
    const next = [...currentMessages, { from: "me" as const, text: "Sent a photo", photo: true }];
    setThreads((prev) => ({ ...prev, [activeContact]: next }));
    if (step?.action === "attach-photo" && phase === 1) {
      completeStep();
    }
  }

  function handleStartCall() {
    setInCall(true);
    setMuted(false);
    setCameraOff(false);
    if (step?.action === "start-call") completeStep();
  }

  function handleMute() {
    setMuted(!muted);
    if (step?.action === "mute") completeStep();
  }

  function handleCameraOff() {
    setCameraOff(!cameraOff);
    if (step?.action === "camera-off") completeStep();
  }

  function handleEndCall() {
    setInCall(false);
    if (step?.action === "end-call") completeStep();
  }

  // Video call overlay
  if (inCall) {
    return (
      <SimulatorFrame
        appName="Video Call"
        appIcon="📹"
        instruction={step?.say}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        done={done}
        goal={goal}
        flash={flash}
      >
        <div className="flex-1 min-h-0 flex flex-col bg-gray-900 text-white">
        {/* Call display */}
        <div className="flex-1 flex items-center justify-center relative">
          {cameraOff ? (
            <div className="text-center">
              <p className="text-6xl mb-4">{currentContactObj?.avatar ?? "👤"}</p>
              <p className="text-xl">{currentContactObj?.name ?? "Contact"}</p>
              <p className="text-sm text-gray-400 mt-1">Camera off</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-8xl mb-4">{currentContactObj?.avatar ?? "👤"}</p>
              <p className="text-xl">{currentContactObj?.name ?? "Contact"}</p>
              <p className="text-sm text-green-400 mt-1">Connected</p>
            </div>
          )}
          {/* Self preview */}
          <div className="absolute bottom-4 right-4 w-24 h-32 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600">
            <span className="text-3xl">🙂</span>
          </div>
        </div>

        {/* Call controls */}
        <div className="flex items-center justify-center gap-6 py-6 bg-gray-800">
          <button
            onClick={handleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
              muted ? "bg-red-500" : "bg-gray-600 hover:bg-gray-500"
            } ${hl("mute-btn") ? pulse : ""}`}
          >
            {muted ? "🔇" : "🎤"}
          </button>
          <button
            onClick={handleCameraOff}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
              cameraOff ? "bg-red-500" : "bg-gray-600 hover:bg-gray-500"
            } ${hl("camera-btn") ? pulse : ""}`}
          >
            {cameraOff ? "📷" : "📹"}
          </button>
          <button
            onClick={handleEndCall}
            className={`w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-2xl transition-all ${
              hl("endcall-btn") ? pulse : ""
            }`}
          >
            📞
          </button>
        </div>
        </div>
      </SimulatorFrame>
    );
  }

  return (
    <SimulatorFrame
      appName="Messages"
      appIcon="💬"
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Contacts sidebar */}
        <div className="w-48 border-r bg-gray-50 flex flex-col overflow-y-auto">
          <div className="p-3 border-b bg-gray-100">
            <p className="font-bold text-sm text-gray-600">Contacts</p>
          </div>
          {CONTACTS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectContact(c.id)}
              className={`flex items-center gap-3 px-3 py-3 text-left border-b transition-all hover:bg-blue-50 ${
                activeContact === c.id ? "bg-blue-100" : ""
              } ${hl("contact", c.id) ? pulse : ""}`}
            >
              <span className="text-2xl">{c.avatar}</span>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.status}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {!activeContact ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Select a contact to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentContactObj?.avatar}</span>
                  <span className="font-medium">{currentContactObj?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartCall}
                    className={`px-3 py-1.5 rounded bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all ${
                      hl("call-btn") ? pulse : ""
                    }`}
                  >
                    📹 Video Call
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {currentMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col max-w-[75%] ${msg.from === "me" ? "self-end items-end" : "self-start items-start"}`}>
                    <div
                      onClick={() => msg.from === "contact" && handleReactionClick(i)}
                      className={`px-4 py-2 rounded-2xl text-sm cursor-pointer transition-all ${
                        msg.from === "me"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-gray-200 text-gray-900 rounded-bl-md"
                      } ${hl("message-bubble") && msg.from === "contact" && i === currentMessages.length - 1 ? pulse : ""}`}
                    >
                      {msg.photo ? (
                        <span className="text-lg">🖼️ Photo</span>
                      ) : (
                        msg.text
                      )}
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {msg.reactions.map((r, ri) => (
                          <span key={ri} className="text-sm bg-gray-100 rounded-full px-1.5 py-0.5 border">{r}</span>
                        ))}
                      </div>
                    )}
                    {/* Reaction picker */}
                    {step?.action === "add-reaction" && phase === 1 && msg.from === "contact" && i === currentMessages.length - 1 && (
                      <div className={`flex gap-2 mt-2 p-2 bg-white border rounded-lg shadow-lg ${hl("reaction-picker") ? pulse : ""}`}>
                        {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
                          <button key={emoji} onClick={() => handleReactionPick(emoji, i)} className="text-xl hover:scale-125 transition-transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Compose bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-t bg-gray-50">
                <button
                  onClick={handleAttach}
                  className={`w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg hover:bg-gray-300 transition-all ${
                    hl("attach-btn") ? pulse : ""
                  }`}
                >
                  +
                </button>
                {/* Photo picker dropdown */}
                {step?.action === "attach-photo" && phase === 1 && (
                  <div className={`absolute bottom-16 left-16 bg-white border rounded-lg shadow-xl p-3 z-30 ${hl("photo-pick") ? pulse : ""}`}>
                    <p className="text-xs text-gray-500 mb-2 font-medium">Choose a photo:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["🌅", "🏖️", "🐶"].map((p) => (
                        <button key={p} onClick={handlePhotoPick} className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-2xl hover:bg-blue-100">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={handleInputFocus}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className={`flex-1 px-4 py-2 border rounded-full text-sm outline-none focus:border-blue-400 transition-all ${
                    hl("message-input") ? pulse : ""
                  }`}
                />
                <button
                  onClick={handleSend}
                  className={`px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-all ${
                    hl("send-btn") ? pulse : ""
                  }`}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </SimulatorFrame>
  );
}
