"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useIsPhone } from "./SimFormFactor";
import { useSwipe } from "./touchGestures";
import SimulatorFrame from "./SimulatorFrame";
import { ROW_RING } from "./PhoneChrome";
import { useStepRunner, type SimMode } from "./useStepRunner";
import { ATTACHABLE_FILES } from "./Desktop/filesData";
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

/** An extra message dropped into the Inbox on mount, optionally carrying a link. */
export interface SeedInboxEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  date?: string;
  /** Renders a button at the foot of the body — a link inside an email. */
  actionLabel?: string;
}

interface GuidedEmailTaskProps {
  goal: string;
  steps: GuidedEmailStep[];
  seedDraft?: { to: string; subject: string; body: string };
  /**
   * Extra Inbox messages. Unit 11's password reset needs a bank's reset email to
   * be sitting in the *real* Mail app, because the dock icon that opens it is the
   * same icon Unit 6 spent nine lessons teaching.
   */
  seedInbox?: SeedInboxEmail[];
  /**
   * Pulse an Inbox row by subject, and the open email's link. Hosts that drive
   * this app from their own step list have no steps of their own to light up.
   */
  highlightEmail?: string;
  highlightEmailAction?: boolean;
  onOpenEmail?: (subject: string) => void;
  onEmailAction?: (subject: string) => void;
  mode?: SimMode;
  hint?: string;
  freePlay?: boolean;
  onResult: (success: boolean, failMessage?: string) => void;
}

const FIELD_ACTION = {
  to: "set-to", cc: "set-cc", bcc: "set-bcc", subject: "set-subject", body: "set-body",
} as const;

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  folder: Folder;
  replies?: { from: string; body: string; date: string }[];
  /** A link inside the message, rendered as a button under the body. */
  actionLabel?: string;
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

const ATTACH_FILES = ATTACHABLE_FILES.map((f) => f.name);

/**
 * A row you can tap, or swipe left to archive.
 *
 * The course had `useSwipe` and used it in exactly two places, both of them the
 * home bar — no swipe-to-delete, no swipe between photos, nothing. That absence
 * is most of what still made the simulated phone feel like a computer: the
 * gesture people use twenty times a day on a real mail app did not exist here.
 *
 * Two things are load-bearing and both are documented in `touchGestures.ts`
 * because they shipped as bugs first: the pointer is tracked on the **window**
 * (a swipe that leaves the row must not die), and `consumeClick()` is called
 * first in the click handler — a drag that starts and ends inside one element
 * still fires a `click`, so without it swiping a message also opens it.
 */
function EmailRow({
  onOpen,
  onSwipeArchive,
  className,
  children,
}: {
  onOpen: () => void;
  /** Omitted where archiving makes no sense — in Archive, Spam or Sent. */
  onSwipeArchive?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const swipe = useSwipe(
    ({ dir }) => {
      setDx(0);
      if (dir === "left" && onSwipeArchive) onSwipeArchive();
    },
    {
      axis: "x",
      threshold: 56,
      onMove: (moveX) => setDx(Math.min(0, Math.max(-96, moveX))),
    },
  );
  if (!onSwipeArchive) {
    return (
      <button onClick={onOpen} className={className}>
        {children}
      </button>
    );
  }
  return (
    <div className="relative overflow-hidden">
      {/* What the row slides off to reveal. A phone always shows the action
          under the finger before it commits to it. */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-blue-600 text-sm font-semibold text-white"
      >
        Archive
      </div>
      <button
        {...swipe.props}
        onClick={() => {
          if (swipe.consumeClick()) return;
          onOpen();
        }}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        className={`relative bg-white transition-transform sim-dark:bg-gray-900 ${className ?? ""}`}
      >
        {children}
      </button>
    </div>
  );
}

export default function GuidedEmailTask({
  goal, steps, seedDraft, seedInbox, highlightEmail, highlightEmailAction,
  onOpenEmail, onEmailAction, mode, hint, freePlay, onResult,
}: GuidedEmailTaskProps) {
  const isPhone = useIsPhone();
  const [emails, setEmails] = useState<Email[]>(() => {
    const seeded: Email[] = (seedInbox ?? []).map((e) => ({
      id: e.id,
      from: e.from,
      subject: e.subject,
      preview: e.body.slice(0, 50),
      body: e.body,
      date: e.date ?? "Just now",
      folder: "Inbox" as Folder,
      actionLabel: e.actionLabel,
    }));
    const base = [...seeded, ...INITIAL_EMAILS];
    if (!seedDraft) return base;
    return [
      ...base,
      {
        id: "draft-seed",
        from: "Me (unsent)",
        subject: seedDraft.subject,
        preview: seedDraft.body.slice(0, 50),
        body: seedDraft.body,
        date: "Now",
        folder: "Drafts" as Folder,
      },
    ];
  });
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder>("Inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [draft, setDraft] = useState({ to: "", cc: "", bcc: "", subject: "", body: "" });
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [filePicker, setFilePicker] = useState(false);
  const [undoPill, setUndoPill] = useState<{ emailId: string; countdown: number; body: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { step, stepIndex, finished, done, flash, tryStep, objectives, isAssessment } = useStepRunner({
    steps,
    mode,
    onResult,
    onStepComplete: () => setFilePicker(false),
  });

  /**
   * One screen at a time on a phone: the open message replaces the folder list.
   *
   * A step pointing at something *in* that list — Compose, or going to another
   * folder — pops back to it, which is both what the learner would do and the
   * only way the ring can be somewhere they can see.
   */
  const listStep = step?.action === "compose" || step?.action === "go-to-folder";
  const showDetail = isPhone && !isAssessment && !listStep && !!(selectedEmail || composing);

  /**
   * The mailbox list is its own screen, the way a phone's Mail app has it.
   *
   * Before this the folder list (Inbox, Sent, Drafts, Spam, Archive) and the
   * messages in the open folder were both on screen at once, stacked — a
   * macOS source list rotated 90 degrees. That is not what stacking a split
   * view gets you on a phone; a phone *pushes*. Mailboxes → the folder's
   * messages → the message, one screen at a time, each with a chevron naming
   * the screen behind it.
   *
   * A `go-to-folder` step pops back to Mailboxes, because that is where the
   * control the step is asking for actually lives — and it is the only way the
   * highlight ring can be somewhere the learner can see.
   *
   * Assessments keep both panes. Nothing points in an assessment, so the sim
   * cannot know which screen the learner needs next, and a wrong guess there
   * hides the control rather than merely moving it.
   */
  const [atMailboxes, setAtMailboxes] = useState(false);
  const showMailboxes =
    isPhone && !isAssessment && !showDetail && (atMailboxes || step?.action === "go-to-folder");
  /** The stacked layout, kept for assessments and for the laptop. */
  const bothPanes = !isPhone || isAssessment;

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
    // Only the identity of the pill should restart the countdown — depending on
    // the whole object would clear and restart the interval every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoPill?.emailId]);

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "open-email":
        // The reading pane replaces the list, so while a different email is open
        // the wanted row does not exist on screen. Glowing an invisible row
        // stranded learners: the way forward is the ✕ that closes this email.
        if (selectedEmail && selectedEmail.subject !== step.target) return kind === "close-reading";
        return kind === "email-row" && name === step.target;
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

  const pulse = "animate-ring-pulse";

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
    onOpenEmail?.(email.subject);
    if (email.folder === "Drafts") {
      setComposing(true);
      setSelectedEmail(null);
      setReplyTo(null);
      setDraft({ to: seedDraft?.to ?? "", cc: "", bcc: "", subject: email.subject, body: email.body });
      setAttachedFile(null);
      setFilePicker(false);
      setEmails((prev) => prev.filter((e) => e.id !== email.id));
      tryStep((s) => s.action === "open-email" && s.target === email.subject);
      return;
    }
    setSelectedEmail(email);
    setComposing(false);
    setReplyTo(null);
    tryStep((s) => s.action === "open-email" && s.target === email.subject);
  }

  function handleCompose() {
    setComposing(true);
    setSelectedEmail(null);
    setReplyTo(null);
    setDraft({ to: "", cc: "", bcc: "", subject: "", body: "" });
    setAttachedFile(null);
    setFilePicker(false);
    tryStep((s) => s.action === "compose");
  }

  function handleFieldChange(field: "to" | "cc" | "bcc" | "subject" | "body", val: string) {
    const wantedAction = FIELD_ACTION[field];
    tryStep((s) => {
      if (s.action !== wantedAction) return false;
      const required = (s.value ?? "").toLowerCase();
      return !required || val.toLowerCase().includes(required);
    });
  }

  /**
   * Assessments credit a field for *holding* the right value, not only for
   * being typed into.
   *
   * `handleFieldChange` fires on keystrokes, so a learner who replied or
   * forwarded — where the address, and sometimes the subject, are filled in for
   * them — did the thing the objective asked for and was never credited. Once
   * they pressed Send the compose was gone and the objective looked impossible.
   * Guided mode is left alone: there the instructions say what to type, and
   * crediting a pre-filled "Re: …" could tick a step the learner never reached.
   */
  useEffect(() => {
    if (mode !== "assessment") return;
    for (const [field, action] of Object.entries(FIELD_ACTION) as Array<
      [keyof typeof FIELD_ACTION, string]
    >) {
      const val = draft[field];
      if (!val) continue;
      tryStep((s) => s.action === action && (!s.value || val.toLowerCase().includes(s.value.toLowerCase())));
    }
  }, [draft, mode, tryStep]);

  function handleAttachClick() {
    setFilePicker(true);
    tryStep((s) => s.action === "attach" && !s.target);
  }

  function handlePickFile(fileName: string) {
    setAttachedFile(fileName);
    setFilePicker(false);
    tryStep((s) => s.action === "attach" && s.target === fileName);
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
    tryStep((s) => s.action === "send");
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
    tryStep((s) => s.action === "reply");
  }

  function handleForward() {
    if (!selectedEmail) return;
    setComposing(true);
    setReplyTo(null);
    setDraft({ to: "", cc: "", bcc: "", subject: `Fwd: ${selectedEmail.subject}`, body: `\n\n--- Original Message ---\n${selectedEmail.body}` });
    tryStep((s) => s.action === "forward");
  }

  function handleDelete() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.filter((e) => e.id !== selectedEmail.id));
    setSelectedEmail(null);
    tryStep((s) => s.action === "delete" && (!s.target || s.target === selectedEmail.subject));
  }

  function handleMarkSpam() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Spam" as Folder } : e));
    setSelectedEmail(null);
    tryStep((s) => s.action === "mark-spam" && (!s.target || s.target === selectedEmail.subject));
  }

  /**
   * Archive one row, named — the swipe's version of Archive.
   *
   * `handleArchive` works on `selectedEmail`, which is right for the button
   * inside an open message and wrong for a gesture on a row in the list: a
   * swipe knows exactly which email it is on and must not depend on what
   * happens to be selected.
   */
  function archiveOne(email: Email) {
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, folder: "Archive" as Folder } : e)));
    tryStep((s) => s.action === "archive" && (!s.target || s.target === email.subject));
  }

  function handleArchive() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Archive" as Folder } : e));
    setSelectedEmail(null);
    tryStep((s) => s.action === "archive" && (!s.target || s.target === selectedEmail.subject));
  }

  function handleUnspam() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Inbox" as Folder } : e));
    setSelectedEmail(null);
    tryStep((s) => s.action === "unspam");
  }

  function handleMoveToInbox() {
    if (!selectedEmail) return;
    setEmails((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, folder: "Inbox" as Folder } : e));
    setSelectedEmail(null);
    tryStep((s) => s.action === "move-to-inbox");
  }

  function handleGoToFolder(f: Folder) {
    setCurrentFolder(f);
    setSelectedEmail(null);
    setComposing(false);
    setReplyTo(null);
    tryStep((s) => s.action === "go-to-folder" && s.target === f);
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
      instruction={step?.say} currentStep={step}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
      freePlay={freePlay}
      /**
       * Which of Mail's three screens the phone's nav bar is titling, and what
       * its chevron pops back to. Mailboxes is the top of the app, so back
       * there means out of Mail; everywhere else it means one screen up.
       */
      phoneNav={
        bothPanes
          ? undefined
          : showMailboxes
            ? { title: "Mailboxes" }
            : showDetail
              ? {
                  title: composing ? (replyTo ? "Reply" : "New Message") : currentFolder,
                  backLabel: currentFolder,
                  onBack: () => { setSelectedEmail(null); setComposing(false); setReplyTo(null); },
                }
              : { title: currentFolder, backLabel: "Mailboxes", onBack: () => setAtMailboxes(true) }
      }
    >
      <div
        data-phone-stacked={isPhone || undefined}
        className={`flex-1 overflow-hidden relative ${isPhone ? "flex flex-col" : "flex"}`}
      >
        {/* Sidebar */}
        {/* On a phone the two panes stack: this app is a sidebar beside a content
              pane, which needs about 700px. At 390px the sidebar took 40% of the
              width and the thing the lesson is about got the rest. Stacked, the
              list keeps a capped slice of the height and scrolls inside it. */}
        <div
          className={`bg-gray-50 sim-dark:bg-gray-800 border-r flex flex-shrink-0 ${
            bothPanes
              ? "w-32 flex-col"
              : showMailboxes
                ? "w-full flex-1 flex-col overflow-y-auto animate-screen-push"
                : "hidden"
          }`}
        >
          {/* On a phone Compose is a floating button over the message list, the
              way every phone puts it — within reach of the thumb, and present
              on whichever screen you are on. Only the laptop keeps it as the
              first row of the sidebar. */}
          {bothPanes && (
            <div className="p-2 border-b">
              <button
                onClick={handleCompose}
                className={`w-full px-2 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-all ${hl("compose-btn") ? pulse : ""}`}
              >
                <span className="inline-flex items-center gap-1"><PencilIcon size={12} /> Compose</span>
              </button>
            </div>
          )}
          {FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => { setAtMailboxes(false); handleGoToFolder(f); }}
              className={`flex items-center justify-between text-left border-b transition-all hover:bg-gray-100 sim-dark:hover:bg-gray-700 ${
                bothPanes ? "px-2 py-2.5 text-xs" : "min-h-[52px] px-4 text-[17px]"
              } ${
                currentFolder === f ? "bg-blue-100 sim-dark:bg-blue-900 font-medium text-blue-700 sim-dark:text-blue-100" : "text-gray-700 sim-dark:text-gray-300"
              } ${hl("folder", f) ? ROW_RING : ""}`}
            >
              <span className={`inline-flex items-center ${bothPanes ? "gap-1.5" : "gap-3"}`}>{FOLDER_ICONS[f]} {f}</span>
              <span className="flex items-center gap-2">
                {folderCount(f) > 0 && (
                  <span className="text-xs bg-gray-200 sim-dark:bg-gray-600 sim-dark:text-gray-100 rounded-full px-1 leading-4">{folderCount(f)}</span>
                )}
                {/* The disclosure chevron that says "this pushes a screen". */}
                {!bothPanes && <span aria-hidden className="text-gray-400">›</span>}
              </span>
            </button>
          ))}
        </div>

        {/* Main area. On a phone this replaced the folder list, so it carries the
            only way back — a chevron at the top left, where a phone puts it. */}
        {/* Back lives in the phone's nav bar now, not in a strip the app draws
            for itself — see the `phoneNav` handed to `SimulatorFrame` below.
            Two back controls on one screen is two back controls. */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${showDetail ? "animate-screen-push" : ""} ${
            showMailboxes ? "hidden" : ""
          }`}
        >
          {composing ? (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">{replyTo ? `Reply to ${replyTo.from}` : "New Message"}</h3>
                <button onClick={() => { setComposing(false); setReplyTo(null); }} className="text-gray-500 sim-dark:text-gray-400 hover:text-gray-600 sim-dark:hover:text-gray-200">&times;</button>
              </div>
              {(["to", "cc", "bcc", "subject"] as const).map((field) => (
                <input
                  key={field}
                  value={draft[field]}
                  onChange={(e) => { setDraft((d) => ({ ...d, [field]: e.target.value })); handleFieldChange(field, e.target.value); }}
                  aria-label={field === "to" ? "To" : field === "cc" ? "Cc" : field === "bcc" ? "Bcc" : "Subject"}
                  placeholder={field === "to" ? "TO" : field === "cc" ? "CC" : field === "bcc" ? "BCC" : "SUBJECT"}
                  className={`w-full border border-gray-500 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 sim-dark:bg-gray-900 sim-dark:text-gray-100 sim-dark:placeholder-gray-400 ${hl(`field-${field}`) ? pulse : ""}`}
                />
              ))}
              <textarea
                value={draft.body}
                onChange={(e) => { setDraft((d) => ({ ...d, body: e.target.value })); handleFieldChange("body", e.target.value); }}
                aria-label="Message body"
                placeholder="Write your message..."
                rows={5}
                className={`w-full border border-gray-500 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 sim-dark:bg-gray-900 sim-dark:text-gray-100 sim-dark:placeholder-gray-400 resize-none ${hl("field-body") ? pulse : ""}`}
              />
              <p className="text-[10px] text-gray-500 sim-dark:text-gray-400 -mt-1">{isPhone ? "Tip: tap each box in turn — To, then Subject, then the message." : "Tip: press Tab to jump to the next box, Shift+Tab to go back."}</p>
              {attachedFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  {extIcon(attachedFile)} {attachedFile}
                  <button onClick={() => setAttachedFile(null)} className="ml-auto text-gray-500 sim-dark:text-gray-400 hover:text-red-500">✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  className={`px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-all ${hl("send-btn") ? pulse : ""}`}
                >
                  Send
                </button>
                <button
                  onClick={handleAttachClick}
                  className={`px-3 py-2 bg-gray-100 sim-dark:bg-gray-700 text-gray-700 sim-dark:text-gray-100 text-sm rounded hover:bg-gray-200 sim-dark:hover:bg-gray-600 transition-all ${hl("attach-btn") ? pulse : ""}`}
                >
                  <span className="inline-flex items-center gap-1"><PaperclipIcon size={12} /> Attach</span>
                </button>
              </div>
            </div>
          ) : selectedEmail ? (
            <div className={`flex-1 overflow-y-auto ${isPhone ? "flex flex-col" : ""}`}>
              <div className={`p-3 ${isPhone ? "order-first border-b" : "border-b"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{selectedEmail.subject}</h3>
                    <p className="text-xs text-gray-500 sim-dark:text-gray-400 mt-0.5">From: {selectedEmail.from} · {selectedEmail.date}</p>
                  </div>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    aria-label="Close email"
                    /* Hidden on a phone: the back row above already says
                       "← Inbox", and two controls that both mean "leave this
                       screen", one of them a ✕ in the far corner, is the
                       laptop habit this course keeps having to unlearn. */
                    className={`flex-shrink-0 rounded px-1 text-gray-500 hover:text-gray-600 sim-dark:text-gray-400 sim-dark:hover:text-gray-200 ${isPhone ? "hidden" : ""} ${hl("close-reading") ? pulse : ""}`}
                  >
                    ✕
                  </button>
                </div>
                {/**
                  * On a phone the actions are a bar under the message.
                  *
                  * Every phone mail app puts reply / flag / archive / trash
                  * along the bottom, because the message is what you came for
                  * and the thumb is down there. As a wrapping row of chips
                  * above the body it took two lines of the 578px screen before
                  * a word of the email, and pushed the text the lesson is
                  * about below the fold.
                  */}
                <div className={`flex flex-wrap gap-1.5 ${
                  isPhone ? "order-last border-t bg-gray-50 p-2 sim-dark:bg-gray-800" : ""
                }`}>
                  <button onClick={handleReply} className={`px-2 py-1 text-xs bg-gray-100 sim-dark:bg-gray-700 sim-dark:text-gray-100 hover:bg-gray-200 sim-dark:hover:bg-gray-600 rounded transition-all inline-flex items-center gap-1 ${hl("reply-btn") ? pulse : ""}`}><ReplyIcon size={12} /> Reply</button>
                  <button onClick={handleForward} className={`px-2 py-1 text-xs bg-gray-100 sim-dark:bg-gray-700 sim-dark:text-gray-100 hover:bg-gray-200 sim-dark:hover:bg-gray-600 rounded transition-all inline-flex items-center gap-1 ${hl("forward-btn") ? pulse : ""}`}><ForwardIcon size={12} /> Forward</button>
                  {currentFolder === "Spam" ? (
                    <button onClick={handleUnspam} className={`px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded transition-all ${hl("unspam-btn") ? pulse : ""}`}>Not spam</button>
                  ) : (
                    <button onClick={handleMarkSpam} className={`px-2 py-1 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 rounded transition-all inline-flex items-center gap-1 ${hl("spam-btn") ? pulse : ""}`}><SpamIcon size={12} /> Mark as spam</button>
                  )}
                  {currentFolder === "Archive" ? (
                    <button onClick={handleMoveToInbox} className={`px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-all inline-flex items-center gap-1 ${hl("move-inbox-btn") ? pulse : ""}`}><InboxIcon size={12} /> Move to Inbox</button>
                  ) : (
                    <button onClick={handleArchive} className={`px-2 py-1 text-xs bg-gray-50 sim-dark:bg-gray-700 sim-dark:text-gray-100 hover:bg-gray-100 sim-dark:hover:bg-gray-600 rounded transition-all inline-flex items-center gap-1 ${hl("archive-btn") ? pulse : ""}`}><ArchiveIcon size={12} /> Move to Archive</button>
                  )}
                  <button onClick={handleDelete} className={`px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded transition-all inline-flex items-center gap-1 ${hl("delete-btn") ? pulse : ""}`}><TrashIcon size={12} /> Delete</button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-800 sim-dark:text-gray-200 leading-relaxed whitespace-pre-line">{selectedEmail.body}</p>
                {/* A link inside the message. Real reset emails carry one, and clicking
                    it is the step the lesson is about. */}
                {selectedEmail.actionLabel && (
                  <button
                    onClick={() => onEmailAction?.(selectedEmail.subject)}
                    className={`mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all ${highlightEmailAction ? pulse : ""}`}
                  >
                    {selectedEmail.actionLabel}
                  </button>
                )}
                {/* Thread: replies */}
                {selectedEmail.replies?.map((r, i) => (
                  <div key={i} className="mt-4 pt-3 border-t border-gray-200 sim-dark:border-gray-700">
                    <p className="text-xs text-gray-500 sim-dark:text-gray-400 mb-1 font-medium">{r.from} · {r.date}</p>
                    <p className="text-sm text-gray-800 sim-dark:text-gray-200 leading-relaxed whitespace-pre-line">{r.body}</p>
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
              {/* The phone's nav bar already says which folder this is; a second
                  label under it is the desktop's column heading, not a phone's. */}
              {bothPanes && (
                <div className="px-3 py-2 border-b bg-gray-50 sim-dark:bg-gray-800 text-xs font-medium text-gray-500 sim-dark:text-gray-300 uppercase tracking-wide">
                  {currentFolder}
                </div>
              )}
              {visibleEmails.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-500 sim-dark:text-gray-400 text-sm">Empty</div>
              ) : (
                visibleEmails.map((email) => (
                  <EmailRow
                    key={email.id}
                    onOpen={() => handleOpenEmail(email)}
                    onSwipeArchive={
                      isPhone && currentFolder === "Inbox" ? () => archiveOne(email) : undefined
                    }
                    className={`w-full text-left px-3 py-3 border-b hover:bg-gray-50 sim-dark:hover:bg-gray-800 transition-all ${
                      hl("email-row", email.subject) || highlightEmail === email.subject ? ROW_RING : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-800 sim-dark:text-gray-100">{email.from}</span>
                      <span className="text-xs text-gray-500 sim-dark:text-gray-400">{email.date}</span>
                    </div>
                    <p className="text-xs text-gray-700 sim-dark:text-gray-300 truncate">{email.subject}</p>
                    <p className="text-xs text-gray-500 sim-dark:text-gray-400 truncate">{email.preview}</p>
                  </EmailRow>
                ))
              )}
            </div>
          )}
        </div>

        {/**
          * Compose, as the floating button a phone puts it in.
          *
          * On the laptop it is the first row of the sidebar; on a phone that
          * sidebar is a screen you have usually navigated away from, so the
          * button has to travel with the message list. Bottom right, clear of
          * the home indicator, which is where every mail app on a phone keeps
          * it and therefore where a thumb goes looking.
          */}
        {!bothPanes && !showDetail && (
          <button
            type="button"
            onClick={handleCompose}
            aria-label="Compose"
            className={`absolute bottom-4 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 ${
              hl("compose-btn") ? pulse : ""
            }`}
          >
            <PencilIcon size={22} />
          </button>
        )}

        {/* File picker modal */}
        {filePicker && (
          <div className={`absolute inset-0 z-20 flex bg-black/30 ${isPhone ? "items-end" : "items-center justify-center"}`}>
            <div
              className={`overflow-hidden bg-white shadow-xl sim-dark:bg-gray-900 ${
                isPhone ? "w-full rounded-t-2xl animate-sheet-up" : "w-56 rounded-lg"
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 sim-dark:bg-gray-800">
                <span className="text-xs font-semibold text-gray-700 sim-dark:text-gray-200">Choose a file</span>
                <button onClick={() => setFilePicker(false)} className="text-gray-500 sim-dark:text-gray-400 hover:text-gray-600 sim-dark:hover:text-gray-200 text-sm">✕</button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {ATTACH_FILES.map((name) => (
                  <button
                    key={name}
                    onClick={() => handlePickFile(name)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 sim-dark:hover:bg-gray-700 border-b last:border-0 flex items-center gap-2 transition-all ${hl("file-pick", name) ? pulse : ""}`}
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
