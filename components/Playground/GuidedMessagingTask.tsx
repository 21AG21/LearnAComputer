"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";

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
  onResult: (success: boolean, failMessage?: string) => void;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: string;
}

const CONTACTS: Contact[] = [
  { id: "alex", name: "Alex", avatar: "/playgrounds/Dog.png", status: "Hey! What's up?" },
  { id: "jordan", name: "Jordan", avatar: "/playgrounds/Cat1.png", status: "Free to chat" },
  { id: "sam", name: "Sam", avatar: "/playgrounds/Bird.png", status: "At work" },
  { id: "grandma", name: "Grandma", avatar: "/playgrounds/Cow.png", status: "Miss you!" },
];

const PHOTO_OPTIONS = [
  { src: "/playgrounds/Dog.png", label: "Dog" },
  { src: "/playgrounds/file-vacation-photo.png", label: "Beach" },
  { src: "/playgrounds/Cat1.png", label: "Cat" },
  { src: "/playgrounds/Bird.png", label: "Bird" },
  { src: "/playgrounds/Cow.png", label: "Cow" },
  { src: "/playgrounds/Snake.png", label: "Snake" },
];

interface Message {
  from: "me" | "contact";
  text: string;
  photoSrc?: string;
  reactions?: string[];
}

const INITIAL_THREADS: Record<string, Message[]> = {
  alex: [{ from: "contact", text: "Hey! Want to meet at the coffee shop at 3pm tomorrow?" }],
  jordan: [{ from: "contact", text: "Did you see that funny video I sent?" }],
  sam: [{ from: "contact", text: "Can you pick up milk on the way home?" }],
  grandma: [{ from: "contact", text: "Hi sweetheart! How are you doing? I miss you so much!" }],
};

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="11" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .66-.09 1.3-.26 1.9" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CameraOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
    </svg>
  );
}

function PhoneEndIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}

export default function GuidedMessagingTask({ goal, steps, onResult }: GuidedMessagingTaskProps) {
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Message[]>>(INITIAL_THREADS);
  const [draft, setDraft] = useState("");
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [sendNudge, setSendNudge] = useState<string | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [photoPicker, setPhotoPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;
  const currentMessages = activeContact ? threads[activeContact] ?? [] : [];
  const currentContactObj = CONTACTS.find((c) => c.id === activeContact);
  const lastContactIdx = currentMessages.reduce((acc, m, i) => (m.from === "contact" ? i : acc), -1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  const completeStep = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
    setSendNudge(null);
    setAttachMenu(false);
    setPhotoPicker(false);
    setReactionTarget(null);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, steps.length, onResult]);

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "select-contact":
        return kind === "contact" && name === step.target;
      case "send-message":
        if (kind === "message-input" && draft.trim() === "") return true;
        if (kind === "send-btn" && draft.trim() !== "") return true;
        return false;
      case "add-reaction":
        if (reactionTarget !== null) return kind === "reaction-picker";
        return kind === "message-bubble";
      case "attach-photo":
        if (photoPicker) return kind === "photo-pick";
        if (attachMenu) return kind === "attach-photos-row";
        return kind === "attach-btn";
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
    setAttachMenu(false);
    setPhotoPicker(false);
    setReactionTarget(null);
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
    if (step?.action === "send-message") {
      const target = (step.value ?? "").toLowerCase();
      if (!target || text.toLowerCase().includes(target)) {
        completeStep();
      } else {
        setSendNudge(`Include the words "${step.value}" in your message.`);
      }
    }
  }

  function handleReactionPointerDown(msgIdx: number) {
    holdTimer.current = setTimeout(() => {
      setReactionTarget(msgIdx);
      holdTimer.current = null;
    }, 500);
  }

  function handleReactionPointerUp() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function handleReactionDoubleClick(msgIdx: number) {
    setReactionTarget(msgIdx);
  }

  function handleReactionPick(emoji: string, msgIdx: number) {
    if (!activeContact) return;
    const msgs = [...currentMessages];
    const msg = { ...msgs[msgIdx] };
    msg.reactions = [...(msg.reactions ?? []), emoji];
    msgs[msgIdx] = msg;
    setThreads((prev) => ({ ...prev, [activeContact]: msgs }));
    setReactionTarget(null);
    if (step?.action === "add-reaction") {
      completeStep();
    }
  }

  function handleAttachBtn() {
    setAttachMenu((prev) => !prev);
    setPhotoPicker(false);
  }

  function handleAttachPhotosRow() {
    setPhotoPicker(true);
    setAttachMenu(false);
  }

  function handleAttachOtherRow(label: string) {
    setAttachMenu(false);
    // Informational — no real action for non-photo attachments
  }

  function handlePhotoPick(src: string) {
    if (!activeContact) return;
    const next = [...currentMessages, { from: "me" as const, text: "Photo", photoSrc: src }];
    setThreads((prev) => ({ ...prev, [activeContact]: next }));
    setPhotoPicker(false);
    if (step?.action === "attach-photo") {
      completeStep();
    }
  }

  function handleStartCall() {
    setInCall(true);
    setMuted(false);
    setCameraOff(false);
    setAttachMenu(false);
    setPhotoPicker(false);
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

  if (inCall) {
    return (
      <SimulatorFrame
        appName="Video Call"
        appIcon="V"
        instruction={step?.say}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        done={done}
        goal={goal}
        flash={flash}
      >
        <div className="flex-1 min-h-0 flex flex-col bg-gray-900 text-white">
          <div className="flex-1 flex items-center justify-center relative p-4">
            <div className="text-center">
              <div className="w-28 h-28 mx-auto rounded-full bg-gray-700 border-2 border-gray-500 overflow-hidden relative mb-3">
                {currentContactObj ? (
                  <Image src={currentContactObj.avatar} alt={currentContactObj.name} fill sizes="112px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">?</div>
                )}
              </div>
              <div className="bg-gray-800/80 px-3 py-1 rounded-full text-sm font-medium inline-block mb-1">
                {currentContactObj?.name ?? "Contact"}
              </div>
              <p className="text-sm text-green-400">Connected</p>
            </div>
            {/* Self preview */}
            <div className="absolute bottom-4 right-4 w-24 h-32 bg-gray-700 rounded-lg border border-gray-600 overflow-hidden flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gray-500 mb-1" />
              <span className="text-[10px] text-gray-300 bg-gray-800/80 px-1.5 py-0.5 rounded">You</span>
            </div>
          </div>

          <div className="flex items-end justify-center gap-5 py-5 px-4 bg-gray-800">
            <button
              onClick={handleMute}
              className={`flex flex-col items-center gap-1.5 transition-all ${hl("mute-btn") ? pulse : ""}`}
            >
              <span className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                muted ? "bg-red-500" : "bg-gray-600 hover:bg-gray-500"
              }`}>
                {muted ? <MicOffIcon className="w-6 h-6 text-white" /> : <MicIcon className="w-6 h-6 text-white" />}
              </span>
              <span className="text-[11px] text-gray-300">{muted ? "Unmute" : "Mute"}</span>
            </button>

            <button
              onClick={handleCameraOff}
              className={`flex flex-col items-center gap-1.5 transition-all ${hl("camera-btn") ? pulse : ""}`}
            >
              <span className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                cameraOff ? "bg-red-500" : "bg-gray-600 hover:bg-gray-500"
              }`}>
                {cameraOff ? <CameraOffIcon className="w-6 h-6 text-white" /> : <CameraIcon className="w-6 h-6 text-white" />}
              </span>
              <span className="text-[11px] text-gray-300">{cameraOff ? "Camera on" : "Camera off"}</span>
            </button>

            <button
              onClick={handleEndCall}
              className={`flex flex-col items-center gap-1.5 transition-all ${hl("endcall-btn") ? pulse : ""}`}
            >
              <span className="w-20 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors">
                <PhoneEndIcon className="w-7 h-7 text-white" />
              </span>
              <span className="text-[11px] text-gray-300">End call</span>
            </button>
          </div>
        </div>
      </SimulatorFrame>
    );
  }

  return (
    <SimulatorFrame
      appName="Messages"
      appIcon="M"
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
              <span className="relative w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
                <Image src={c.avatar} alt={c.name} fill sizes="36px" className="object-cover" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.status}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col relative">
          {!activeContact ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Select a contact to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="relative w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    <Image src={currentContactObj!.avatar} alt={currentContactObj!.name} fill sizes="32px" className="object-cover" />
                  </span>
                  <span className="font-medium">{currentContactObj?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartCall}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all ${
                      hl("call-btn") ? pulse : ""
                    }`}
                  >
                    <CameraIcon className="w-4 h-4" />
                    Video Call
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {currentMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col max-w-[75%] ${msg.from === "me" ? "self-end items-end" : "self-start items-start"}`}>
                    <div
                      onDoubleClick={() => msg.from === "contact" && i === lastContactIdx && handleReactionDoubleClick(i)}
                      onPointerDown={() => msg.from === "contact" && i === lastContactIdx && handleReactionPointerDown(i)}
                      onPointerUp={handleReactionPointerUp}
                      onPointerLeave={handleReactionPointerUp}
                      className={`px-4 py-2 rounded-2xl text-sm select-none transition-all ${
                        msg.from === "me"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-gray-200 text-gray-900 rounded-bl-md cursor-pointer"
                      } ${hl("message-bubble") && msg.from === "contact" && i === lastContactIdx ? pulse : ""}`}
                    >
                      {msg.photoSrc ? (
                        <div className="relative w-40 h-28 rounded overflow-hidden">
                          <Image src={msg.photoSrc} alt="Photo" fill sizes="160px" className="object-cover" />
                        </div>
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
                    {reactionTarget === i && msg.from === "contact" && (
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
                <div ref={messagesEndRef} />
              </div>

              {/* Send nudge */}
              {sendNudge && (
                <div className="mx-4 mb-1 px-3 py-1.5 bg-orange-100 border border-orange-300 rounded text-sm text-orange-800">
                  {sendNudge}
                </div>
              )}

              {/* Compose bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-t bg-gray-50 relative">
                <button
                  onClick={handleAttachBtn}
                  className={`w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg hover:bg-gray-300 transition-all ${
                    hl("attach-btn") ? pulse : ""
                  }`}
                >
                  +
                </button>

                {/* Attachment menu */}
                {attachMenu && (
                  <div className="absolute bottom-14 left-4 bg-white border rounded-lg shadow-xl py-1 z-30 w-48">
                    <button
                      onClick={handleAttachPhotosRow}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors ${
                        hl("attach-photos-row") ? "bg-yellow-50 ring-2 ring-yellow-400" : ""
                      }`}
                    >
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                      Photos
                    </button>
                    <button
                      onClick={() => handleAttachOtherRow("Files")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-gray-400"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                      Files
                    </button>
                    <button
                      onClick={() => handleAttachOtherRow("Camera")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-gray-400"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      Camera
                    </button>
                    <button
                      onClick={() => handleAttachOtherRow("Voice memo")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-gray-400"
                    >
                      <MicIcon className="w-5 h-5" />
                      Voice memo
                    </button>
                  </div>
                )}

                {/* Photo picker */}
                {photoPicker && (
                  <div className={`absolute bottom-14 left-4 bg-white border rounded-lg shadow-xl p-3 z-30 ${hl("photo-pick") ? pulse : ""}`}>
                    <p className="text-xs text-gray-500 mb-2 font-medium">Choose a photo:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PHOTO_OPTIONS.map((p) => (
                        <button
                          key={p.src}
                          onClick={() => handlePhotoPick(p.src)}
                          className="w-16 h-16 bg-gray-100 rounded overflow-hidden relative hover:ring-2 hover:ring-blue-400 transition-all group"
                        >
                          <Image src={p.src} alt={p.label} fill sizes="64px" className="object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                            {p.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setSendNudge(null); }}
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
