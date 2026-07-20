"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { FILLER_FILES } from "./Desktop/filesData";
import {
  InboxIcon, SendIcon, DraftIcon, SpamIcon, ArchiveIcon,
  MailIcon, ImageIcon, SpreadsheetIcon, MusicIcon, FileDocIcon,
  PencilIcon, PaperclipIcon, TrashIcon, ReplyIcon, ForwardIcon,
} from "./Icons";

export type GuidedEmailStep = {
  say: string;
  action:
    | "open-email" | "compose" | "set-to" | "set-cc" | "set-bcc"
    | "set-subject" | "set-body" | "attach" | "send" | "reply"
    | "forward" | "delete" | "mark-spam" | "archive" | "go-to-folder"
    | "unspam" | "move-to-inbox";
  target?: string;
  value?: string;
};

interface GuidedEmailTaskProps {
  goal: string;
  steps: GuidedEmailStep[];
  onResult: (success: boolean, failMessage?: string) => void;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  folder: Folder;
  replies?: { from: string; body: string; date: string }[];
}

const FOLDERS = ["Inbox", "Sent", "Drafts", "Spam", "Archive"] as const;
type Folder = (typeof FOLDERS)[number];

const INITIAL_EMAILS: Email[] = [
  { id: "mom", from: "Mom", subject: "Dinner Sunday?", preview: "Hi! Are we still on for dinner...", body: "Hi! Are we still on for dinner this Sunday? Let me know! Love, Mom", date: "2h ago", folder: "Inbox" },
  { id: "drdigital", from: "Dr. Digital", subject: "Great Progress!", preview: "You're doing wonderfully...", body: "You're doing wonderfully in the lessons! Keep it up — you're becoming a real computer pro!", date: "1d ago", folder: "Inbox" },
  { id: "amazon", from: "Amazon", subject: "Your order shipped", preview: "Your order #38291 has shipped...", body: "Your order #38291 has shipped. Expected delivery: tomorrow. Track at amazon.com/orders.", date: "3h ago", folder: "Inbox" },
  { id: "scam", from: "URGENT WIN", subject: "You won $1,000,000!!!", preview: "Click here NOW to claim...", body: "Click here NOW to claim your prize! Send your bank details to verify your identity. Hurry — offer expires today!", date: "5h ago", folder: "Inbox" },
  { id: "boss", from: "Boss", subject: "Meeting Tuesday", preview: "Don't forget our team meeting...", body: "Don't forget our team meeting at 2pm Tuesday in Conference Room B. See you there!", date: "Yesterday", folder: "Inbox" },
];

const FOLDER_ICONS: Record<Folder, ReactNode> = {
  Inbox: <InboxIcon size={14} />, Sent: <SendIcon size={14} />, Drafts: <DraftIcon size={14} />, Spam: <SpamIcon size={14} />, Archive: <ArchiveIcon size={14} />,
};

const ATTACH_FILES = FILLER_FILES.map((f) => f.name);

export default function GuidedEmailTask({ goal, steps, onResult }: GuidedEmailTaskProps) {
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder>("Inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [draft, setDraft] = useState({ to: "", cc: "", bcc: "", subject: "", body: "" });
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [filePicker, setFilePicker] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  const [undoPill, setUndoPill] = useState<{ emailId: string; countdown: number; body: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  useEffect(() => {
    if (!undoPill) return;
    undoTimer.current = setInterval(() => {
      setUndoPill((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          if (undoTimer.current) clearInterval(undoTimer.current);
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => { if (undoTimer.current) clearInterval(undoTimer.current); };
  }, [undoPill?.emailId]);

  function completeStep() {
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
  }

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "open-email": return kind === "email-row" && name === step.target;
      case "compose": return kind === "compose-btn";
      case "set-to": return kind === "field-to";
      case "set-cc": return kind === "field-cc";
      case "set-bcc": return kind === "field-bcc";
      case "set-subject": return kind === "field-subject";
      case "set-body": return kind === "field-body";
      case "attach": return filePicker ? (kind === "file-pick" && name === step.target) : kind === "attach-btn";
      case "send": return kind === "send-btn";
      case "reply": return kind === "reply-btn";
      case "forward": return kind === "forward-btn";
      case "delete": return kind === "delete-btn";
      case "mark-spam": return kind === "spam-btn";
      case "archive": return kind === "archive-btn";
      case "go-to-folder": return kind === "folder" && name === step.target;
      case "unspam": return kind === "unspam-btn";
      case "move-to-inbox": return kind === "move-inbox-btn";
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  const visibleEmails =
    currentFolder === "Sent"
      ? [...sentEmails, ...emails.filter((e) => e.folder === "Sent")]
      : emails.filter((e) => e.folder === currentFolder);

  function folderCount(f: Folder) {
    return f === "Sent"
      ? sentEmails.length + emails.filter((e) => e.folder === "Sent").length
      : emails.filter((e) => e.folder === f).length;
  }

  function handleOpenEmail(email: Email) {
    setSelectedEmail(email);
    setComposing(false);
    setReplyTo(null);
    if (step?.action === "open-email" && step.target === email.subject) completeStep();
  }

  function handleCompose() {
    setComposing(true);
    setSelectedEmail(null);
    setReplyTo(null);
    setDraft({ to: "", cc: "", bcc: "", subject: "", body: "" });
    setAttachedFile(null);
    setFilePicker(false);
    if (step?.action === "compose") completeStep();
  }

  function handleFieldBlur(field: "to" | "cc" | "bcc" | "subject" | "body", val: string) {
    const actionMap: Record<string, string> = { to: "set-to", cc: "set-cc", bcc: "set-bcc", subject: "set-subject", body: "set-body" };
    if (step?.action === actionMap[field]) {
      const required = (step.value ?? "").toLowerCase();
      if (!required || val.toLowerCase().includes(required)) completeStep();
    }
  }

  function handleAttachClick() {
    setFilePicker(true);
    if (step?.action === "attach" && !step.target) completeStep();
  }

  function handlePickFile(fileName: string) {
    setAttachedFile(fileName);
    setFilePicker(false);
    if (step?.action === "attach" && step.target === fileName) completeStep();
  }

  function handleSend() {
    if (replyTo) {
      const replyBody = draft.body;
      setEmails((prev) =>
        prev.map((e) =>
          e.id === replyTo.id
            ? { ...e, replies: [...(e.replies ?? []), { from: "You", body: replyBody, date: "just now" }] }
            : e
        )
      );
      const updated = emails.find((e) => e.id === replyTo.id);
      if (updated) {
        setSelectedEmail({ ...updated, replies: [...(updated.replies ?? []), { from: "You", body: replyBody, date: "just now" }] });
      }
      setComposing(false);
      setReplyTo(null);
      setDraft({ to: "", cc: "", bcc: "", subject: "", body: "" });
      setAttachedFile(null);
      setUndoPill({ emailId: replyTo.id, countdown: 30, body: replyBody });
    } else {
      const newEmail: Email = {
        id: `sent-${Date.now()}`,
        from: "Me",
        subject: draft.subject || "(no subject)",
        preview: draft.body.slice(0, 50),
        body: draft.body,
        date: "Just now",
        folder: "Sent",
      };
      setSentEmails((prev) => [newEmail, ...prev]);
      setComposing(false);
      setDraft({ to: "", cc: "", bcc: "", subject: "", body: "" });
      setAttachedFile(null);
    }
    if (step?.action === "send") completeStep();
  }

  function handleUndo() {
    if (!undoPill) return;
    setEmails((prev) =>
      prev.map((e) =>
        e.id === undoPill.emailId
          ? { ...e, replies: (e.replies ?? []).slice(0, -1) }
          : e
      )
    );
    const email = emails.find((e) => e.id === undoPill.emailId);
    if (email) {
      setComposing(true);
      setReplyTo(email);
      setDraft({ to: email.from, cc: "", bcc: "", subject: `Re: ${email.subject}`, body: undoPill.body });
      setSelectedEmail(null);
    }
    if (undoTimer.current) clearInterval(undoTimer.current);
    setUndoPill(null);
  }

  function handleReply() {
    if (!selectedEmail) return;
    setComposing(true);
    setReplyTo(selectedEmail);
    setDraft({ to: selectedEmail.from, cc: "", bcc: "", subject: `Re: ${selectedEmail.subject}`, body: "" });
    if (step?.action === "reply") completeStep();
  }

  function handleForward() {
    if (!selectedEmail) return;
    setComposing(true);
    setReplyTo(null);
    setDraft({ to: "", cc: "", bcc: "", subject: `Fwd: ${selectedEmail.subject}`, body: `\n\n--- Original Message ---\n${selectedEmail.body}` });
    if (step?.action === "forward") completeStep();
  }

  function handleDelete() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.filter((e) => e.id !== selectedEmail.id));
    setSelectedEmail(null);
    if (step?.action === "delete") completeStep();
  }

  function handleMarkSpam() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Spam" as Folder } : e));
    setSelectedEmail(null);
    if (step?.action === "mark-spam") completeStep();
  }

  function handleArchive() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Archive" as Folder } : e));
    setSelectedEmail(null);
    if (step?.action === "archive") completeStep();
  }

  function handleUnspam() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Inbox" as Folder } : e));
    setSelectedEmail(null);
    if (step?.action === "unspam") completeStep();
  }

  function handleMoveToInbox() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Inbox" as Folder } : e));
    setSelectedEmail(null);
    if (step?.action === "move-to-inbox") completeStep();
  }

  function handleGoToFolder(f: Folder) {
    setCurrentFolder(f);
    setSelectedEmail(null);
    setComposing(false);
    setReplyTo(null);
    if (step?.action === "go-to-folder" && step.target === f) completeStep();
  }

  const extIcon = (name: string): ReactNode => {
    if (name.endsWith(".png") || name.endsWith(".jpg")) return <ImageIcon size={14} />;
    if (name.endsWith(".xlsx")) return <SpreadsheetIcon size={14} />;
    if (name.endsWith(".mp3")) return <MusicIcon size={14} />;
    if (name.endsWith(".docx")) return <FileDocIcon size={14} />;
    return <FileDocIcon size={14} />;
  };

  return (
    <SimulatorFrame
      appName="Mail"
      appIcon={<MailIcon size={20} />}
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
    >
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-32 bg-gray-50 border-r flex flex-col flex-shrink-0">
          <div className="p-2 border-b">
            <button
              onClick={handleCompose}
              className={`w-full px-2 py-2 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-all ${hl("compose-btn") ? pulse : ""}`}
            >
              <span className="inline-flex items-center gap-1"><PencilIcon size={12} /> Compose</span>
            </button>
          </div>
          {FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => handleGoToFolder(f)}
              className={`flex items-center justify-between px-2 py-2.5 text-xs text-left border-b transition-all hover:bg-gray-100 ${
                currentFolder === f ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"
              } ${hl("folder", f) ? pulse : ""}`}
            >
              <span className="inline-flex items-center gap-1.5">{FOLDER_ICONS[f]} {f}</span>
              {folderCount(f) > 0 && (
                <span className="text-xs bg-gray-200 rounded-full px-1 leading-4">{folderCount(f)}</span>
              )}
            </button>
          ))}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {composing ? (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">{replyTo ? `Reply to ${replyTo.from}` : "New Message"}</h3>
                <button onClick={() => { setComposing(false); setReplyTo(null); }} className="text-gray-400 hover:text-gray-600">&times;</button>
              </div>
              {(["to", "cc", "bcc", "subject"] as const).map((field) => (
                <input
                  key={field}
                  value={draft[field]}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  onBlur={(e) => handleFieldBlur(field, e.target.value)}
                  placeholder={field === "to" ? "TO" : field === "cc" ? "CC" : field === "bcc" ? "BCC" : "SUBJECT"}
                  className={`w-full border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 ${hl(`field-${field}`) ? pulse : ""}`}
                />
              ))}
              <textarea
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                onBlur={(e) => handleFieldBlur("body", e.target.value)}
                placeholder="Write your message..."
                rows={5}
                className={`w-full border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-none ${hl("field-body") ? pulse : ""}`}
              />
              <p className="text-[10px] text-gray-400 -mt-1">Tip: press Tab to jump to the next box, Shift+Tab to go back.</p>
              {attachedFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  {extIcon(attachedFile)} {attachedFile}
                  <button onClick={() => setAttachedFile(null)} className="ml-auto text-gray-400 hover:text-red-500">✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  className={`px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-all ${hl("send-btn") ? pulse : ""}`}
                >
                  Send
                </button>
                <button
                  onClick={handleAttachClick}
                  className={`px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-all ${hl("attach-btn") ? pulse : ""}`}
                >
                  <span className="inline-flex items-center gap-1"><PaperclipIcon size={12} /> Attach</span>
                </button>
              </div>
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{selectedEmail.subject}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">From: {selectedEmail.from} · {selectedEmail.date}</p>
                  </div>
                  <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">✕</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={handleReply} className={`px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all inline-flex items-center gap-1 ${hl("reply-btn") ? pulse : ""}`}><ReplyIcon size={12} /> Reply</button>
                  <button onClick={handleForward} className={`px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all inline-flex items-center gap-1 ${hl("forward-btn") ? pulse : ""}`}><ForwardIcon size={12} /> Forward</button>
                  {currentFolder === "Spam" ? (
                    <button onClick={handleUnspam} className={`px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded transition-all ${hl("unspam-btn") ? pulse : ""}`}>Not spam</button>
                  ) : (
                    <button onClick={handleMarkSpam} className={`px-2 py-1 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 rounded transition-all inline-flex items-center gap-1 ${hl("spam-btn") ? pulse : ""}`}><SpamIcon size={12} /> Spam</button>
                  )}
                  {currentFolder === "Archive" ? (
                    <button onClick={handleMoveToInbox} className={`px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-all inline-flex items-center gap-1 ${hl("move-inbox-btn") ? pulse : ""}`}><InboxIcon size={12} /> Move to Inbox</button>
                  ) : (
                    <button onClick={handleArchive} className={`px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-all inline-flex items-center gap-1 ${hl("archive-btn") ? pulse : ""}`}><ArchiveIcon size={12} /> Archive</button>
                  )}
                  <button onClick={handleDelete} className={`px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded transition-all inline-flex items-center gap-1 ${hl("delete-btn") ? pulse : ""}`}><TrashIcon size={12} /> Delete</button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{selectedEmail.body}</p>
                {/* Thread: replies */}
                {selectedEmail.replies?.map((r, i) => (
                  <div key={i} className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1 font-medium">{r.from} · {r.date}</p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{r.body}</p>
                  </div>
                ))}
              </div>
              {/* Undo pill */}
              {undoPill && undoPill.emailId === selectedEmail.id && (
                <div className="mx-4 mb-3 flex items-center gap-3 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                  <span>Sent</span>
                  <span className="text-gray-400">·</span>
                  <button onClick={handleUndo} className="font-semibold text-blue-300 hover:text-blue-200 underline">Undo</button>
                  <span className="ml-auto tabular-nums text-gray-400">{undoPill.countdown}s</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                {currentFolder}
              </div>
              {visibleEmails.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Empty</div>
              ) : (
                visibleEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleOpenEmail(email)}
                    className={`w-full text-left px-3 py-3 border-b hover:bg-gray-50 transition-all ${hl("email-row", email.subject) ? pulse : ""}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{email.from}</span>
                      <span className="text-xs text-gray-400">{email.date}</span>
                    </div>
                    <p className="text-xs text-gray-700 truncate">{email.subject}</p>
                    <p className="text-xs text-gray-400 truncate">{email.preview}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* File picker modal */}
        {filePicker && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
            <div className="bg-white rounded-lg shadow-xl w-56 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                <span className="text-xs font-semibold text-gray-700">Choose a file</span>
                <button onClick={() => setFilePicker(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {ATTACH_FILES.map((name) => (
                  <button
                    key={name}
                    onClick={() => handlePickFile(name)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b last:border-0 flex items-center gap-2 transition-all ${hl("file-pick", name) ? pulse : ""}`}
                  >
                    <span>{extIcon(name)}</span>
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SimulatorFrame>
  );
}
