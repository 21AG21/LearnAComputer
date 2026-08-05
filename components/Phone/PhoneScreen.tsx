"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { PhoneLesson, PhoneStep } from "@/lib/phoneCourse";
import { useStepRunner } from "@/components/Playground/useStepRunner";
import { useLongPress, usePinch, useSliderDrag, useSwipe } from "./gestures";
import PhoneKeyboard from "./PhoneKeyboard";
import {
  ArrowLeftIcon,
  BellIcon,
  CameraIcon,
  ChatIcon,
  CheckIcon,
  GearIcon,
  ImageIcon,
  LockIcon,
  NoteIcon,
  PlusIcon,
  SendIcon,
  ShareIcon,
  SunIcon,
  TrashIcon,
  WarningIcon,
  WifiIcon,
} from "@/components/Playground/Icons";

/**
 * The simulated phone every lesson in the "On Your Phone" course is played on.
 *
 * It is a sibling of `FakeDesktop`, not a descendant of it, and the split is
 * deliberate: a phone is not a small desktop. There are no windows to move, no
 * menu bar, no second mouse button and no physical keyboard, so every one of
 * that component's affordances would be a lie here. What the two do share is the
 * step engine — `useStepRunner`, unchanged — so guided mode, assessment mode, the
 * 150ms double-fire guard and the stuck-learner ring reveal all behave exactly as
 * they do in the laptop course.
 *
 * ## The one rule this file has to keep
 *
 * **Every gesture must be performable with a finger and with a mouse.** The
 * course is meant to be played on a phone, but it is authored and script-checked
 * on a computer. `gestures.ts` carries the pointer-event plumbing that makes that
 * true; the job here is to never reach around it — no `onTouchStart`, no
 * `dblclick`, no hover-only affordance.
 *
 * ## No dead icons
 *
 * Every app on the home screen opens, and every row in Settings opens a panel
 * with something real in it. A beginner who taps something that does nothing does
 * not conclude "that app is empty" — they conclude they tapped it wrong, and try
 * again harder. The laptop course learned this the expensive way; see
 * `docs/SAME_ICON_AUDIT.md`.
 */

interface PhoneScreenProps {
  lesson: PhoneLesson;
  onResult: (success: boolean, failMessage?: string) => void;
  /** Shown by the shell when the learner asks for the hint. */
  onHint?: () => void;
}

type AppId = "messages" | "photos" | "camera" | "notes" | "settings" | "weather";

const APPS: Record<AppId, { name: string; Icon: typeof ChatIcon; tile: string }> = {
  messages: { name: "Messages", Icon: ChatIcon, tile: "bg-green-700" },
  photos: { name: "Photos", Icon: ImageIcon, tile: "bg-pink-700" },
  camera: { name: "Camera", Icon: CameraIcon, tile: "bg-slate-700" },
  notes: { name: "Notes", Icon: NoteIcon, tile: "bg-amber-600" },
  settings: { name: "Settings", Icon: GearIcon, tile: "bg-gray-600" },
  weather: { name: "Weather", Icon: SunIcon, tile: "bg-sky-700" },
};

/** What each app's press-and-hold menu offers. Every item does something real. */
const APP_MENU: Record<AppId, string[]> = {
  messages: ["New message", "Move apps around"],
  photos: ["Show the newest photo", "Move apps around"],
  camera: ["Take a photo", "Move apps around"],
  notes: ["New note", "Move apps around"],
  settings: ["Go straight to Wi-Fi", "Move apps around"],
  weather: ["Move apps around"],
};

const PHOTOS = [
  { id: "bird-branch", label: "Bird on a Branch", src: "/photos/bird-branch.webp" },
  { id: "dog-field", label: "Dog in the Field", src: "/photos/dog-field.webp" },
  { id: "cat-sleeping", label: "Cat Asleep", src: "/photos/cat-sleeping.webp" },
  { id: "sunset-beach", label: "Sunset at the Beach", src: "/photos/sunset-beach.webp" },
  { id: "coffee-cup", label: "Morning Coffee", src: "/photos/coffee-cup.webp" },
  { id: "single-flower", label: "Sunflower", src: "/photos/single-flower.webp" },
  { id: "city-dusk", label: "City at Dusk", src: "/photos/city-dusk.webp" },
  { id: "breakfast-table", label: "Breakfast", src: "/photos/breakfast-table.webp" },
];

/** The scene the camera is pointed at, and therefore the photo it produces. */
const CAMERA_SHOT = { id: "just-taken", label: "Just Taken", src: "/photos/mountain-dawn.webp" };

interface Thread {
  id: string;
  who: string;
  preview: string;
  when: string;
  junk?: boolean;
  /** The scam thread: a link that must not be tapped, and a Report Junk button. */
  scam?: boolean;
  messages: Array<{ from: "them" | "me"; text: string; photo?: string }>;
}

const THREADS: Thread[] = [
  {
    id: "Alex",
    who: "Alex",
    preview: "Are we still on for 6?",
    when: "9:41 AM",
    messages: [
      { from: "them", text: "Morning! Are we still on for 6?" },
      { from: "them", text: "No rush if something came up." },
    ],
  },
  {
    id: "Grandma",
    who: "Grandma",
    preview: "Send me a picture of the dog",
    when: "Yesterday",
    messages: [
      { from: "them", text: "Hello dear. Send me a picture of the dog when you get a moment." },
    ],
  },
  {
    id: "Sam",
    who: "Sam",
    preview: "Thanks for yesterday",
    when: "Yesterday",
    messages: [{ from: "them", text: "Thanks for yesterday, it was lovely." }],
  },
  {
    id: "Free Prize Draw",
    who: "Free Prize Draw",
    preview: "You have been selected!",
    when: "Tuesday",
    junk: true,
    messages: [{ from: "them", text: "You have been selected! Claim within 24 hours." }],
  },
  {
    id: "Delivery Notice",
    who: "Delivery Notice",
    preview: "Your package is held",
    when: "Tuesday",
    junk: true,
    messages: [{ from: "them", text: "Your package is held pending a small fee." }],
  },
  {
    id: "Unknown",
    who: "+1 (555) 010-4471",
    preview: "URGENT: your account is locked",
    when: "Monday",
    scam: true,
    messages: [
      {
        from: "them",
        text: "URGENT: your bank account has been locked. Verify within 4 hours or it will be closed permanently.",
      },
    ],
  },
];

/** Settings is a long list on purpose — Unit 1 asks the learner to scroll it. */
const SETTINGS_ROWS: Array<{ id: string; label: string }> = [
  { id: "wifi", label: "Wi-Fi" },
  { id: "bluetooth", label: "Bluetooth" },
  { id: "mobile-data", label: "Mobile Data" },
  { id: "display", label: "Display" },
  { id: "sounds", label: "Sounds" },
  { id: "notifications", label: "Notifications" },
  { id: "do-not-disturb", label: "Do Not Disturb" },
  { id: "wallpaper", label: "Wallpaper" },
  { id: "accessibility", label: "Accessibility" },
  { id: "privacy", label: "Privacy" },
  { id: "passwords", label: "Passwords" },
  { id: "battery", label: "Battery" },
  { id: "storage", label: "Storage" },
  { id: "date-time", label: "Date and Time" },
  { id: "software-update", label: "Software Update" },
  { id: "about", label: "About this phone" },
];

/** Panels that are just switches. Every one of them is a real, working switch. */
const TOGGLE_PANELS: Record<string, Array<{ id: string; label: string; note: string }>> = {
  bluetooth: [{ id: "bluetooth", label: "Bluetooth", note: "For headphones, speakers and hearing aids." }],
  "mobile-data": [{ id: "mobile-data", label: "Mobile Data", note: "The internet you pay for by the month." }],
  sounds: [
    { id: "ringer", label: "Ring for calls", note: "Off means the phone only vibrates." },
    { id: "keyboard-clicks", label: "Keyboard clicks", note: "A small tick as you type." },
  ],
  notifications: [
    { id: "message-alerts", label: "Message alerts", note: "A banner when a text arrives." },
    { id: "news-alerts", label: "News alerts", note: "Most people turn this one off." },
  ],
  "do-not-disturb": [{ id: "dnd", label: "Do Not Disturb", note: "Nothing rings or buzzes until you switch it off." }],
  wallpaper: [{ id: "dark-wallpaper", label: "Darker background picture", note: "Easier on the eyes at night." }],
  accessibility: [
    { id: "bold-text", label: "Bold text everywhere", note: "Thicker letters, easier to pick out." },
    { id: "reduce-motion", label: "Reduce motion", note: "Stops screens sliding about." },
  ],
  privacy: [{ id: "tracking", label: "Let apps track you across other apps", note: "Off is the safer answer." }],
  passwords: [{ id: "autofill", label: "Fill in passwords for me", note: "The phone remembers so you do not have to." }],
  battery: [{ id: "low-power", label: "Low power mode", note: "Dims the screen to make the charge last." }],
  storage: [{ id: "offload", label: "Remove apps you never open", note: "Frees space without losing your files." }],
  "date-time": [{ id: "auto-time", label: "Set the time automatically", note: "Follows the network. Leave this on." }],
  "software-update": [{ id: "auto-update", label: "Install updates overnight", note: "Updates are how security holes get closed." }],
};

const WIFI_NETWORKS = [
  { name: "Library Guest", locked: false, bars: 3 },
  { name: "BT-Home-9K2", locked: true, bars: 3 },
  { name: "Cafe Roma", locked: true, bars: 2 },
  { name: "Free Airport WiFi", locked: false, bars: 1 },
];

const RING = "animate-ring-pulse";

export default function PhoneScreen({ lesson, onResult, onHint }: PhoneScreenProps) {
  const runner = useStepRunner<PhoneStep>({
    steps: lesson.steps,
    mode: lesson.mode ?? "guided",
    onResult,
  });
  const { step, stepIndex, tryStep, done, flash, objectives, completed, isAssessment } = runner;

  // ── Device state ───────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<AppId | "home">("home");
  const [quick, setQuick] = useState(false);
  const [menuFor, setMenuFor] = useState<AppId | null>(null);
  const [wiggle, setWiggle] = useState(false);
  const [dock, setDock] = useState<AppId[]>(["messages", "settings"]);
  const [grid, setGrid] = useState<AppId[]>(["photos", "camera", "weather", "notes"]);
  const [nudge, setNudge] = useState<string | null>(null);

  // ── Per-app state ──────────────────────────────────────────────────────────
  const [threads, setThreads] = useState(THREADS);
  const [thread, setThread] = useState<string | null>(null);
  const [swiped, setSwiped] = useState<string | null>(null);
  const [attachPicker, setAttachPicker] = useState(false);
  const [attached, setAttached] = useState<string | null>(null);
  const [photos, setPhotos] = useState(PHOTOS);
  const [photo, setPhoto] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [sharePicker, setSharePicker] = useState(false);
  const [flash1, setFlash1] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [permission, setPermission] = useState(false);

  // ── Keyboard state ─────────────────────────────────────────────────────────
  const [keyboard, setKeyboard] = useState(false);
  const [layout, setLayout] = useState<"letters" | "numbers" | "emoji">("letters");
  const [shift, setShift] = useState(false);
  const [draft, setDraft] = useState("");

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    wifi: true,
    bluetooth: false,
    flashlight: false,
    dnd: false,
    ringer: true,
    "auto-time": true,
    "auto-update": true,
    autofill: true,
  });
  const [sliders, setSliders] = useState<Record<string, number>>({ brightness: 45, "text-size": 40 });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  /** Does the current step (or, in assessment, any unmet objective) want this? */
  const hl = useCallback(
    (pred: (s: PhoneStep) => boolean) => (step && pred(step) ? RING : ""),
    [step],
  );

  const nudgeOnce = useCallback((message: string) => {
    setNudge(message);
    setTimeout(() => setNudge(null), 4000);
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goHome = useCallback(() => {
    setScreen("home");
    setThread(null);
    setPhoto(null);
    setSection(null);
    setKeyboard(false);
    setSwiped(null);
    setAttachPicker(false);
    setSharePicker(false);
    tryStep((s) => s.action === "go-home");
  }, [tryStep]);

  const openApp = useCallback(
    (id: AppId) => {
      if (wiggle) return; // wiggling means "drag me", not "open me" — same as a real phone
      setScreen(id);
      setMenuFor(null);
      setDraft("");
      setKeyboard(false);
      setLayout("letters");
      if (id === "notes" && lesson.steps.some((s) => s.action === "permission")) setPermission(true);
      tryStep((s) => s.action === "open-app" && s.target === id);
    },
    [lesson.steps, tryStep, wiggle],
  );

  // ── The keyboard ───────────────────────────────────────────────────────────
  /**
   * A `type-text` step is satisfied by what the editor *contains*, not by an
   * exact match, so a learner who typed an extra letter and rubbed it out is not
   * punished for the detour. Case only matters when the lesson asked for a
   * capital — that is the whole point of the Shift lesson, and ignoring case
   * there would let it pass without ever finding the key.
   */
  const checkTyped = useCallback(
    (text: string) => {
      tryStep((s) => {
        if (s.action !== "type-text" || !s.value) return false;
        const wantsCase = /[A-Z]/.test(s.value);
        return wantsCase ? text.includes(s.value) : text.toLowerCase().includes(s.value.toLowerCase());
      });
    },
    [tryStep],
  );

  const onKey = useCallback(
    (char: string) => {
      setShift(false);
      setDraft((d) => {
        const next = d + char;
        checkTyped(next);
        return next;
      });
    },
    [checkTyped],
  );

  const onBackspace = useCallback(() => {
    setDraft((d) => d.slice(0, -1));
    tryStep((s) => s.action === "backspace-key");
  }, [tryStep]);

  const onSuggestion = useCallback(
    (word: string) => {
      setDraft((d) => {
        const parts = d.split(/(\s+)/);
        parts[parts.length - 1] = word + " ";
        const next = parts.join("");
        checkTyped(next);
        return next;
      });
      tryStep((s) => s.action === "tap-suggestion" && s.value === word);
    },
    [checkTyped, tryStep],
  );

  const onEmojiPick = useCallback(
    (name: string, char: string) => {
      setDraft((d) => d + char);
      tryStep((s) => s.action === "pick-emoji" && (!s.value || s.value === name));
    },
    [tryStep],
  );

  const focusEditor = useCallback(() => {
    setKeyboard(true);
    tryStep((s) => s.action === "tap-editor");
  }, [tryStep]);

  const keyboardHighlight = useMemo(() => {
    if (!step) return null;
    if (step.action === "shift-key") return "shift" as const;
    if (step.action === "numbers-key") return "numbers" as const;
    if (step.action === "backspace-key") return "backspace" as const;
    if (step.action === "emoji-key") return "emoji" as const;
    if (step.action === "tap-suggestion") return "suggestion" as const;
    return null;
  }, [step]);

  // ── Gestures on the device chrome ──────────────────────────────────────────
  const homeSwipe = useSwipe(
    ({ dir }) => {
      if (dir === "up") goHome();
    },
    { axis: "y", threshold: 24 },
  );

  const topSwipe = useSwipe(
    ({ dir }) => {
      if (dir === "down") {
        setQuick(true);
        tryStep((s) => s.action === "open-quick-settings");
      }
    },
    { axis: "y", threshold: 24 },
  );

  const quickSwipe = useSwipe(
    ({ dir }) => {
      if (dir === "up") {
        setQuick(false);
        tryStep((s) => s.action === "close-quick-settings");
      }
    },
    { axis: "y", threshold: 24 },
  );

  // ── Dragging an app into the dock ──────────────────────────────────────────
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<{ id: AppId; x: number; y: number } | null>(null);

  /**
   * Dragging an icon into the bottom row.
   *
   * The moves are followed on the window for the same reason every gesture in
   * `gestures.ts` is: the icon is 56px across and the dock is most of a screen
   * away, so the finger leaves the element it started on almost immediately, and
   * `setPointerCapture` is not an option on an element that also has to answer to
   * a plain tap. Listeners are added on press and removed on release, so nothing
   * outlives the gesture.
   */
  const dragHandlers = (id: AppId) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (!wiggle) return;
      setDragging({ id, x: e.clientX, y: e.clientY });
      const move = (ev: PointerEvent) => setDragging((d) => (d && d.id === id ? { ...d, x: ev.clientX, y: ev.clientY } : d));
      const finish = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        setDragging(null);
        const box = dockRef.current?.getBoundingClientRect();
        if (!box) return;
        const inDock =
          ev.clientX >= box.left && ev.clientX <= box.right && ev.clientY >= box.top - 12 && ev.clientY <= box.bottom;
        if (!inDock) return;
        setGrid((g) => g.filter((a) => a !== id));
        setDock((d) => (d.includes(id) ? d : [...d, id]));
        tryStep((s) => s.action === "drag-app" && s.target === id);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
  });

  // ── Scroll watching, for "swipe up until you can see X" ────────────────────
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const watchScroll = useCallback(() => {
    const box = scrollRef.current?.getBoundingClientRect();
    if (!box) return;
    tryStep((s) => {
      if (s.action !== "scroll-to" || !s.target) return false;
      const el = scrollRef.current?.querySelector(`[data-phone-row="${CSS.escape(s.target)}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= box.top && r.bottom <= box.bottom + 1;
    });
  }, [tryStep]);

  // ── Pinch, on the open photo ───────────────────────────────────────────────
  const onPinch = useCallback(
    (dir: "in" | "out") => {
      setZoom((z) => {
        const next = Math.min(3, Math.max(1, dir === "out" ? z * 1.35 : z / 1.35));
        if (next > 1.2) setZoomedIn(true);
        return next;
      });
      // Zooming back out only counts once the learner has zoomed in first —
      // otherwise a stray pinch on an unzoomed photo ticks the step for free.
      tryStep((s) => s.action === "pinch-photo" && s.dir === dir && (dir === "out" || zoomedIn));
    },
    [tryStep, zoomedIn],
  );
  const pinch = usePinch(onPinch);

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Banner
        lesson={lesson}
        stepIndex={stepIndex}
        total={lesson.steps.length}
        step={step}
        done={done}
        flash={flash}
        objectives={objectives}
        completedCount={completed.size}
        isAssessment={isAssessment}
        onHint={onHint}
      />

      {/* The device. A bezel on a big screen so it reads as a phone; edge to edge
          on an actual phone, where a picture of a phone inside a phone is absurd. */}
      <div className="flex min-h-0 flex-1 justify-center bg-gray-100 p-0 dark:bg-[#0b1016] sm:p-4">
        <div
          data-phone-screen
          className="relative flex min-h-0 w-full max-w-[400px] flex-col overflow-hidden bg-black sm:rounded-[2.25rem] sm:border-[6px] sm:border-gray-900 sm:shadow-2xl"
        >
          {/* ── Status bar. Also the handle for Quick Settings. ── */}
          <div
            {...topSwipe.props}
            data-phone-statusbar
            className={`flex shrink-0 touch-none select-none items-center justify-between bg-[#101820] px-4 py-1.5 text-xs font-medium text-white ${hl(
              (s) => s.action === "open-quick-settings",
            )}`}
          >
            <span className="tabular-nums">{clock}</span>
            <span className="flex items-center gap-1.5">
              {toggles.wifi && <WifiIcon size={13} aria-hidden />}
              <span className="tabular-nums">82%</span>
              <Battery />
            </span>
          </div>

          {/* ── The screen ── */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
            {screen === "home" && renderHome()}
            {screen === "messages" && renderMessages()}
            {screen === "photos" && renderPhotos()}
            {screen === "camera" && renderCamera()}
            {screen === "notes" && renderNotes()}
            {screen === "settings" && renderSettings()}
            {screen === "weather" && renderWeather()}

            {quick && renderQuickSettings()}
            {menuFor && renderAppMenu(menuFor)}
            {permission && renderPermission()}

            {nudge && (
              <div className="absolute inset-x-3 bottom-3 z-40 animate-slide-up rounded-xl bg-[#101820] px-4 py-3 text-sm text-white shadow-xl">
                {nudge}
              </div>
            )}

            {done && (
              // Solid green-800, not a translucent green-700: at 90% over whatever
              // the app happened to be showing, the smaller line came out at 3.99:1.
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-green-800 text-center animate-fade-in">
                <div className="px-6">
                  <CheckIcon size={56} className="mx-auto text-white" aria-hidden />
                  <p className="mt-3 text-xl font-bold text-white">Done</p>
                  <p className="mt-1 text-sm text-white">{lesson.goal}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── The bar at the bottom. Swipe it up to go home. ── */}
          <div
            {...homeSwipe.props}
            data-phone-homebar
            aria-label="Slide up to go home"
            className={`flex shrink-0 touch-none select-none items-center justify-center bg-[#101820] py-2 ${hl(
              (s) => s.action === "go-home",
            )}`}
          >
            <span className="h-1.5 w-28 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Screens ────────────────────────────────────────────────────────────────

  function renderHome() {
    const tile = (id: AppId, inDock: boolean) => {
      const { name, Icon, tile: bg } = APPS[id];
      return (
        <AppIcon
          key={id}
          id={id}
          name={name}
          Icon={Icon}
          bg={bg}
          wiggle={wiggle}
          dim={dragging?.id === id}
          ring={hl((s) => (s.action === "open-app" || s.action === "long-press-app") && s.target === id)}
          onOpen={() => openApp(id)}
          onHold={() => {
            if (wiggle) return;
            setMenuFor(id);
            tryStep((s) => s.action === "long-press-app" && s.target === id);
          }}
          drag={dragHandlers(id)}
          compact={inDock}
        />
      );
    };

    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-sky-200 via-indigo-200 to-indigo-300">
        <div className="flex-1 overflow-y-auto px-4 pt-6">
          <div className="grid grid-cols-4 gap-x-3 gap-y-6">{grid.map((id) => tile(id, false))}</div>
          {wiggle && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                data-phone-control="done-arranging"
                onClick={() => {
                  setWiggle(false);
                  tryStep((s) => s.action === "done-arranging");
                }}
                className={`rounded-full bg-white px-8 py-2.5 text-base font-bold text-gray-900 shadow-lg ${hl(
                  (s) => s.action === "done-arranging",
                )}`}
              >
                Done
              </button>
            </div>
          )}
          <p className="mt-6 text-center text-xs font-medium text-indigo-900/70">
            {wiggle ? "Drag an app where you want it, then tap Done" : "Tap an app to open it"}
          </p>
        </div>

        <div
          ref={dockRef}
          data-phone-dock
          className={`m-3 grid grid-cols-4 gap-3 rounded-3xl bg-white/45 p-3 backdrop-blur ${
            wiggle ? "ring-2 ring-dashed ring-indigo-900/40" : ""
          } ${hl((s) => s.action === "drag-app")}`}
        >
          {dock.map((id) => tile(id, true))}
        </div>

        {dragging && (
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-90"
            style={{ left: dragging.x, top: dragging.y }}
          >
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-2xl ${APPS[dragging.id].tile}`}>
              {(() => {
                const I = APPS[dragging.id].Icon;
                return <I size={28} aria-hidden />;
              })()}
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderAppMenu(id: AppId) {
    const act = (item: string) => {
      setMenuFor(null);
      tryStep((s) => s.action === "app-menu" && s.target === item);
      if (item === "Move apps around") return setWiggle(true);
      if (item === "New note") {
        openApp("notes");
        setKeyboard(true);
        return;
      }
      if (item === "New message") return openApp("messages");
      if (item === "Take a photo") return openApp("camera");
      if (item === "Show the newest photo") {
        openApp("photos");
        setPhoto(photos[0].id);
        return;
      }
      if (item === "Go straight to Wi-Fi") {
        openApp("settings");
        setSection("wifi");
      }
    };

    return (
      <div className="absolute inset-0 z-30 bg-black/30" onClick={() => setMenuFor(null)}>
        <div
          className="absolute inset-x-8 top-1/3 rounded-2xl bg-white p-1.5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="border-b border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
            {APPS[id].name}
          </p>
          {APP_MENU[id].map((item) => (
            <button
              key={item}
              type="button"
              data-phone-menu={item}
              onClick={() => act(item)}
              className={`block w-full rounded-lg px-4 py-3.5 text-left text-base text-gray-900 active:bg-gray-100 ${hl(
                (s) => s.action === "app-menu" && s.target === item,
              )}`}
            >
              {item}
            </button>
          ))}
          {/* Inside the card, on white. It used to sit on the dimmed backdrop as
              white-on-gray at 2.1:1 — the one line telling a stuck learner how to
              get out of a menu they did not mean to open. */}
          <p className="mt-1 border-t border-gray-300 px-4 pb-1 pt-2 text-center text-xs text-gray-700">
            Tap anywhere else to close this
          </p>
        </div>
      </div>
    );
  }

  function renderQuickSettings() {
    const Toggle = ({ id, label }: { id: string; label: string }) => (
      <button
        type="button"
        data-phone-quick={id}
        aria-pressed={!!toggles[id]}
        onClick={() => {
          setToggles((t) => ({ ...t, [id]: !t[id] }));
          tryStep((s) => s.action === "quick-toggle" && s.target === id);
        }}
        className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-xs font-semibold ${
          toggles[id] ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
        } ${hl((s) => s.action === "quick-toggle" && s.target === id)}`}
      >
        <span className="text-base">{toggles[id] ? "On" : "Off"}</span>
        {label}
      </button>
    );

    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-[#101820]/95 backdrop-blur animate-slide-down">
        <div {...quickSwipe.props} className="flex-1 touch-none overflow-y-auto p-4">
          <p className="mb-3 text-sm font-semibold text-gray-200">Quick Settings</p>
          <div className="grid grid-cols-4 gap-2">
            <Toggle id="wifi" label="Wi-Fi" />
            <Toggle id="bluetooth" label="Bluetooth" />
            <Toggle id="flashlight" label="Torch" />
            <Toggle id="dnd" label="Quiet" />
          </div>

          <Slider
            id="brightness"
            label="Brightness"
            value={sliders.brightness}
            ring={hl((s) => s.action === "quick-slider" && s.target === "brightness")}
            dark
            onValue={(v) => {
              setSliders((sl) => ({ ...sl, brightness: v }));
              tryStep((s) => s.action === "quick-slider" && s.target === "brightness" && v >= (s.min ?? 0) && v <= (s.max ?? 100));
            }}
          />

          <div className="mt-5 rounded-2xl bg-gray-800 p-4 text-sm text-gray-100">
            <p className="font-semibold">Battery: 82 percent</p>
            <p className="mt-1 text-gray-300">About 14 hours left at the way you have been using it.</p>
          </div>
        </div>
        <div
          {...quickSwipe.props}
          data-phone-quickclose
          className={`flex shrink-0 touch-none items-center justify-center gap-2 py-3 text-xs text-gray-300 ${hl(
            (s) => s.action === "close-quick-settings",
          )}`}
        >
          <span className="h-1.5 w-24 rounded-full bg-white/70" />
        </div>
        <p className="pb-3 text-center text-xs text-gray-400">Slide this bar upward to close</p>
      </div>
    );
  }

  function renderPermission() {
    const answer = (allow: boolean) => {
      if (allow && lesson.steps.some((s) => s.action === "permission" && s.value === "deny")) {
        nudgeOnce("A notepad has no honest use for where you are standing. Try Don't Allow.");
        return;
      }
      setPermission(false);
      tryStep((s) => s.action === "permission" && s.value === (allow ? "allow" : "deny"));
    };

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
        <div className="w-full rounded-2xl bg-white p-5 text-center shadow-2xl">
          <p className="text-base font-bold text-gray-900">Allow Notes to use your location?</p>
          <p className="mt-2 text-sm text-gray-700">
            Notes would like to know where you are, even when you are not using it.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-phone-control="permission-deny"
              onClick={() => answer(false)}
              className={`rounded-xl bg-blue-600 py-3 text-base font-bold text-white ${hl(
                (s) => s.action === "permission" && s.value === "deny",
              )}`}
            >
              Don&apos;t Allow
            </button>
            <button
              type="button"
              data-phone-control="permission-allow"
              onClick={() => answer(true)}
              className={`rounded-xl border-2 border-gray-500 py-3 text-base font-semibold text-gray-800 ${hl(
                (s) => s.action === "permission" && s.value === "allow",
              )}`}
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMessages() {
    if (thread) {
      const t = threads.find((x) => x.id === thread);
      if (!t) return null;
      return (
        <div className="flex h-full flex-col">
          <AppBar
            title={t.who}
            onBack={() => {
              setThread(null);
              setKeyboard(false);
              tryStep((s) => s.action === "back");
            }}
          />
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
            {t.messages.map((m, i) => (
              <div key={i} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[15px] ${
                    m.from === "me" ? "bg-blue-600 text-white" : "bg-white text-gray-900 shadow-sm"
                  }`}
                >
                  {m.photo ? (
                    <Image
                      src={m.photo}
                      alt="The photo you sent"
                      width={200}
                      height={140}
                      className="h-auto w-40 rounded-lg"
                    />
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}

            {t.scam && (
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <button
                  type="button"
                  data-phone-control="scam-link"
                  onClick={() =>
                    onResult(
                      false,
                      "You tapped the link. On a real phone that page would now be asking for your bank details, and it would look exactly like your bank's. Nothing bad happened here — but this is why the answer is never to tap it, not even to look.",
                    )
                  }
                  className="text-[15px] font-medium text-blue-700 underline"
                >
                  http://secure-verify-account.example/login
                </button>
                <button
                  type="button"
                  data-phone-control="report-junk"
                  onClick={() => {
                    setThreads((all) => all.filter((x) => x.id !== t.id));
                    setThread(null);
                    tryStep((s) => s.action === "report-junk");
                  }}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-base font-bold text-white ${hl(
                    (s) => s.action === "report-junk",
                  )}`}
                >
                  <WarningIcon size={18} aria-hidden />
                  Report Junk
                </button>
              </div>
            )}
          </div>

          {attached && (
            <div className="flex items-center gap-2 border-t border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
              <ImageIcon size={16} aria-hidden />
              {attached} ready to send
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-gray-300 bg-white p-2">
            <button
              type="button"
              data-phone-control="attach"
              aria-label="Add a picture"
              onClick={() => setAttachPicker(true)}
              className={`shrink-0 rounded-full bg-gray-200 p-2.5 text-gray-800 ${hl(
                (s) => s.action === "attach-photo" && !attached,
              )}`}
            >
              <PlusIcon size={18} aria-hidden />
            </button>
            <button
              type="button"
              data-phone-control="composer"
              onClick={focusEditor}
              className={`min-w-0 flex-1 truncate rounded-full border-2 border-gray-500 px-3.5 py-2.5 text-left text-[15px] ${
                draft ? "text-gray-900" : "text-gray-600"
              } ${hl((s) => s.action === "tap-editor")}`}
            >
              {draft || "Message"}
            </button>
            <button
              type="button"
              data-phone-control="send"
              aria-label="Send"
              disabled={!draft && !attached}
              onClick={() => {
                setThreads((all) =>
                  all.map((x) =>
                    x.id === t.id
                      ? {
                          ...x,
                          messages: [
                            ...x.messages,
                            ...(attached ? [{ from: "me" as const, text: "", photo: photos.find((p) => p.label === attached)?.src }] : []),
                            ...(draft ? [{ from: "me" as const, text: draft }] : []),
                          ],
                        }
                      : x,
                  ),
                );
                setDraft("");
                setAttached(null);
                setKeyboard(false);
                tryStep((s) => s.action === "send-message");
              }}
              className={`shrink-0 rounded-full bg-blue-600 p-2.5 text-white disabled:bg-gray-400 ${hl(
                (s) => s.action === "send-message",
              )}`}
            >
              <SendIcon size={18} aria-hidden />
            </button>
          </div>

          {attachPicker && (
            <Sheet title="Send a picture" onClose={() => setAttachPicker(false)}>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    data-phone-photo={p.label}
                    onClick={() => {
                      setAttached(p.label);
                      setAttachPicker(false);
                      tryStep((s) => s.action === "attach-photo" && (!s.target || s.target === p.label));
                    }}
                    className={`overflow-hidden rounded-xl ${hl((s) => s.action === "attach-photo" && s.target === p.label)}`}
                  >
                    <Image src={p.src} alt={p.label} width={160} height={160} className="h-20 w-full object-cover" />
                    <span className="block truncate px-1 py-1 text-[11px] text-gray-700">{p.label}</span>
                  </button>
                ))}
              </div>
            </Sheet>
          )}

          {keyboard && (
            <PhoneKeyboard
              layout={layout}
              shift={shift}
              draft={draft}
              onKey={onKey}
              onBackspace={onBackspace}
              onShift={() => {
                setShift((v) => !v);
                tryStep((s) => s.action === "shift-key");
              }}
              onLayout={(l) => {
                setLayout(l);
                if (l === "numbers") tryStep((s) => s.action === "numbers-key");
                if (l === "emoji") tryStep((s) => s.action === "emoji-key");
              }}
              onSuggestion={onSuggestion}
              onEmoji={onEmojiPick}
              highlight={keyboardHighlight}
              highlightWord={step?.action === "tap-suggestion" ? step.value : undefined}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <AppBar title="Messages" />
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => (
            <MessageRow
              key={t.id}
              t={t}
              open={swiped === t.id}
              ring={hl((s) => (s.action === "open-thread" || s.action === "swipe-row") && s.target === t.id)}
              deleteRing={hl((s) => s.action === "delete-row" && s.target === t.id)}
              onOpen={() => {
                setThread(t.id);
                setSwiped(null);
                tryStep((s) => s.action === "open-thread" && s.target === t.id);
              }}
              onSwipe={() => {
                setSwiped(t.id);
                tryStep((s) => s.action === "swipe-row" && s.target === t.id);
              }}
              onClose={() => setSwiped(null)}
              onDelete={() => {
                setThreads((all) => all.filter((x) => x.id !== t.id));
                setSwiped(null);
                tryStep((s) => s.action === "delete-row" && s.target === t.id);
              }}
            />
          ))}
          {threads.length === 0 && (
            <p className="p-8 text-center text-gray-600">No messages. That is what an empty inbox looks like.</p>
          )}
        </div>
      </div>
    );
  }

  function renderPhotos() {
    if (photo) {
      const p = photos.find((x) => x.id === photo);
      if (!p) return null;
      return (
        <div className="flex h-full flex-col bg-black">
          <AppBar
            dark
            title={p.label}
            onBack={() => {
              setPhoto(null);
              setZoom(1);
              tryStep((s) => s.action === "back");
            }}
          />
          <div
            ref={pinch.ref}
            {...pinch.handlers}
            data-phone-photoview
            className={`flex flex-1 touch-none items-center justify-center overflow-hidden ${hl((s) => s.action === "pinch-photo")}`}
          >
            <Image
              src={p.src}
              alt={p.label}
              width={800}
              height={600}
              className="max-h-full w-auto max-w-full transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
          <p className="bg-black py-1 text-center text-xs text-gray-300">
            {zoom > 1.05 ? `Zoomed in ${zoom.toFixed(1)} times` : "Spread two fingers to zoom in (on a computer: hold Ctrl and scroll)"}
          </p>
          <div className="flex shrink-0 justify-around border-t border-gray-700 bg-[#101820] py-2.5">
            <IconButton
              label="Share"
              testId="share"
              ring={hl((s) => s.action === "share-photo")}
              onPress={() => setSharePicker(true)}
            >
              <ShareIcon size={20} aria-hidden />
            </IconButton>
            <IconButton
              label="Delete"
              testId="delete-photo"
              ring={hl((s) => s.action === "delete-photo" && s.target === p.label)}
              onPress={() => {
                setPhotos((all) => all.filter((x) => x.id !== p.id));
                setPhoto(null);
                tryStep((s) => s.action === "delete-photo" && (!s.target || s.target === p.label));
              }}
            >
              <TrashIcon size={20} aria-hidden />
            </IconButton>
          </div>

          {sharePicker && (
            <Sheet title="Send this photo to" onClose={() => setSharePicker(false)}>
              {THREADS.filter((t) => !t.junk && !t.scam).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-phone-contact={t.who}
                  onClick={() => {
                    setSharePicker(false);
                    nudgeOnce(`Sent to ${t.who}.`);
                    tryStep((s) => s.action === "share-photo" && (!s.target || s.target === t.who));
                  }}
                  className={`block w-full border-b border-gray-200 px-2 py-3.5 text-left text-base text-gray-900 last:border-0 ${hl(
                    (s) => s.action === "share-photo" && s.target === t.who,
                  )}`}
                >
                  {t.who}
                </button>
              ))}
            </Sheet>
          )}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <AppBar title="Photos" />
        <div className="grid flex-1 grid-cols-3 gap-1 overflow-y-auto p-1">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              data-phone-photo={p.label}
              onClick={() => {
                setPhoto(p.id);
                setZoom(1);
                setZoomedIn(false);
                tryStep((s) => s.action === "open-photo" && s.target === p.label);
              }}
              className={`relative overflow-hidden rounded-md ${hl((s) => s.action === "open-photo" && s.target === p.label)}`}
            >
              <Image src={p.src} alt={p.label} width={200} height={200} className="h-24 w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-left text-[10px] text-white">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderCamera() {
    return (
      <div className="relative flex h-full flex-col bg-black">
        <Image
          src={CAMERA_SHOT.src}
          alt="What the camera is pointed at: mountains at dawn"
          width={800}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover opacity-95"
        />
        {flash1 && <div className="absolute inset-0 z-20 bg-white animate-fade-in" />}
        <div className="relative z-10 mt-auto flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 to-transparent pb-6 pt-16">
          <button
            type="button"
            data-phone-control="shutter"
            aria-label="Take the photo"
            onClick={() => {
              setFlash1(true);
              setTimeout(() => setFlash1(false), 220);
              setPhotos((all) => (all.some((p) => p.id === CAMERA_SHOT.id) ? all : [CAMERA_SHOT, ...all]));
              nudgeOnce("Saved. It is in Photos now — nothing else to do.");
              tryStep((s) => s.action === "take-photo");
            }}
            className={`h-[72px] w-[72px] rounded-full border-4 border-white bg-white/30 active:bg-white/60 ${hl(
              (s) => s.action === "take-photo",
            )}`}
          />
        </div>
      </div>
    );
  }

  function renderNotes() {
    return (
      <div className="flex h-full flex-col">
        <AppBar title="Notes" />
        <button
          type="button"
          data-phone-control="note"
          onClick={focusEditor}
          // `flex flex-col items-start` because a <button> centres its content
          // both ways by default, and a note whose first word floats in the middle
          // of the page does not look like anywhere you would write.
          className={`flex flex-1 flex-col items-start overflow-y-auto p-4 text-left text-[17px] leading-relaxed text-gray-900 ${hl(
            (s) => s.action === "tap-editor",
          )}`}
        >
          {draft || <span className="text-gray-600">Tap here and the keyboard will come up.</span>}
          {keyboard && <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-blue-700 align-middle" />}
        </button>
        {keyboard && (
          <PhoneKeyboard
            layout={layout}
            shift={shift}
            draft={draft}
            onKey={onKey}
            onBackspace={onBackspace}
            onShift={() => {
              setShift((v) => !v);
              tryStep((s) => s.action === "shift-key");
            }}
            onLayout={(l) => {
              setLayout(l);
              if (l === "numbers") tryStep((s) => s.action === "numbers-key");
              if (l === "emoji") tryStep((s) => s.action === "emoji-key");
            }}
            onSuggestion={onSuggestion}
            onEmoji={onEmojiPick}
            highlight={keyboardHighlight}
            highlightWord={step?.action === "tap-suggestion" ? step.value : undefined}
          />
        )}
      </div>
    );
  }

  function renderSettings() {
    if (section === "wifi") {
      return (
        <SettingsPanel title="Wi-Fi" onBack={backToSettings}>
          <p className="px-4 py-2 text-sm text-gray-700">Networks within reach:</p>
          {WIFI_NETWORKS.map((n) => (
            <button
              key={n.name}
              type="button"
              data-phone-row={n.name}
              onClick={() => {
                setJoined(n.name);
                nudgeOnce(
                  n.name === "Free Airport WiFi"
                    ? "Joined — but a network named like this one, with no password, is exactly the sort criminals set up. Ask the staff which is theirs."
                    : `Joined ${n.name}. Your phone will rejoin it by itself from now on.`,
                );
                tryStep((s) => s.action === "join-wifi" && s.target === n.name);
              }}
              className={`flex w-full items-center justify-between border-b border-gray-200 px-4 py-3.5 text-left ${hl(
                (s) => s.action === "join-wifi" && s.target === n.name,
              )}`}
            >
              <span className="flex items-center gap-2 text-base text-gray-900">
                {n.name}
                {n.locked && <LockIcon size={14} className="text-gray-600" aria-hidden />}
              </span>
              {joined === n.name ? (
                <CheckIcon size={18} className="text-green-700" aria-hidden />
              ) : (
                <WifiIcon size={16} className="text-gray-600" aria-hidden />
              )}
            </button>
          ))}
        </SettingsPanel>
      );
    }

    if (section === "display") {
      return (
        <SettingsPanel title="Display" onBack={backToSettings}>
          <div className="p-4">
            <Slider
              id="brightness"
              label="Brightness"
              value={sliders.brightness}
              ring={hl((s) => s.action === "slider" && s.target === "brightness")}
              onValue={(v) => {
                setSliders((sl) => ({ ...sl, brightness: v }));
                tryStep((s) => s.action === "slider" && s.target === "brightness" && v >= (s.min ?? 0) && v <= (s.max ?? 100));
              }}
            />
            <Slider
              id="text-size"
              label="Text size"
              value={sliders["text-size"]}
              ring={hl((s) => s.action === "slider" && s.target === "text-size")}
              onValue={(v) => {
                setSliders((sl) => ({ ...sl, "text-size": v }));
                tryStep((s) => s.action === "slider" && s.target === "text-size" && v >= (s.min ?? 0) && v <= (s.max ?? 100));
              }}
            />
            {/* Live proof the slider did something, which is the whole lesson. */}
            <p
              className="mt-6 rounded-xl border-2 border-gray-500 p-4 text-gray-900"
              style={{ fontSize: `${13 + sliders["text-size"] * 0.09}px` }}
            >
              This is how your messages will look at that size.
            </p>
          </div>
        </SettingsPanel>
      );
    }

    if (section === "about") {
      return (
        <SettingsPanel title="About this phone" onBack={backToSettings}>
          <Info label="Name" value="My Phone" />
          <Info label="Storage" value="64 GB, about half of it free" />
          <Info label="Battery health" value="Good" />
          <Info label="Software" value="Up to date" />
          <Info label="Wi-Fi" value={joined ?? "Not connected"} />
        </SettingsPanel>
      );
    }

    if (section && TOGGLE_PANELS[section]) {
      return (
        <SettingsPanel title={SETTINGS_ROWS.find((r) => r.id === section)?.label ?? "Settings"} onBack={backToSettings}>
          {TOGGLE_PANELS[section].map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3.5">
              <span>
                <span className="block text-base text-gray-900">{t.label}</span>
                <span className="block text-sm text-gray-700">{t.note}</span>
              </span>
              <Switch
                id={t.id}
                on={!!toggles[t.id]}
                ring={hl((s) => s.action === "toggle" && s.target === t.id)}
                onPress={() => {
                  setToggles((all) => ({ ...all, [t.id]: !all[t.id] }));
                  tryStep((s) => s.action === "toggle" && s.target === t.id);
                }}
              />
            </div>
          ))}
        </SettingsPanel>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <AppBar title="Settings" />
        <div ref={scrollRef} onScroll={watchScroll} className="flex-1 overflow-y-auto">
          {SETTINGS_ROWS.map((r) => (
            <button
              key={r.id}
              type="button"
              data-phone-row={r.label}
              data-phone-section={r.id}
              onClick={() => {
                setSection(r.id);
                tryStep((s) => s.action === "open-section" && s.target === r.id);
              }}
              className={`flex w-full items-center justify-between border-b border-gray-200 px-4 py-3.5 text-left text-base text-gray-900 active:bg-gray-100 ${hl(
                (s) => (s.action === "open-section" && s.target === r.id) || (s.action === "scroll-to" && s.target === r.label),
              )}`}
            >
              {r.label}
              <span className="text-sm text-gray-600">
                {r.id === "wifi" ? joined ?? "Not connected" : ""}
                {r.id === "bluetooth" ? (toggles.bluetooth ? "On" : "Off") : ""}
                {" ›"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function backToSettings() {
    setSection(null);
    tryStep((s) => s.action === "back");
  }

  function renderWeather() {
    const days = ["Today", "Tomorrow", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return (
      <div className="flex h-full flex-col">
        <AppBar title="Weather" />
        <div className="flex-1 overflow-y-auto">
          <div className="bg-sky-700 px-4 py-8 text-center text-white">
            <p className="text-6xl font-light tabular-nums">18°</p>
            <p className="mt-1 text-lg">Cloudy, brightening later</p>
          </div>
          {days.map((d, i) => (
            <div key={d} className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
              <span className="text-base text-gray-900">{d}</span>
              <span className="tabular-nums text-base text-gray-700">{16 + ((i * 3) % 7)}°</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function Banner({
  lesson,
  stepIndex,
  total,
  step,
  done,
  flash,
  objectives,
  completedCount,
  isAssessment,
  onHint,
}: {
  lesson: PhoneLesson;
  stepIndex: number;
  total: number;
  step?: PhoneStep;
  done: boolean;
  flash: boolean;
  objectives?: Array<{ label: string; done: boolean }>;
  completedCount: number;
  isAssessment: boolean;
  onHint?: () => void;
}) {
  const [openList, setOpenList] = useState(false);
  return (
    <div className="shrink-0 bg-[#1d2733] px-4 py-3 text-white">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
          {isAssessment ? `Objectives: ${completedCount} of ${total} done` : `Step ${Math.min(stepIndex + 1, total)} of ${total}`}
        </p>
        {onHint && (
          <button type="button" onClick={onHint} className="shrink-0 text-xs font-semibold text-yellow-300 underline">
            Hint
          </button>
        )}
      </div>
      <p className={`mt-1 text-[15px] leading-snug ${flash ? "text-green-300" : ""}`}>
        {done ? lesson.goal : isAssessment ? "Do each of these, in any order." : step?.say ?? lesson.goal}
      </p>
      {isAssessment && objectives && (
        <>
          <button
            type="button"
            onClick={() => setOpenList((v) => !v)}
            className="mt-2 text-xs font-semibold text-gray-300 underline"
          >
            {openList ? "Hide the list" : "Show the list"}
          </button>
          {openList && (
            <ul className="mt-2 space-y-1 text-sm">
              {objectives.map((o) => (
                <li key={o.label} className={o.done ? "text-green-300 line-through" : "text-gray-100"}>
                  {o.done ? "✓ " : "• "}
                  {o.label}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-green-400 transition-all duration-300"
          style={{ width: `${((isAssessment ? completedCount : stepIndex) / Math.max(1, total)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function AppBar({ title, onBack, dark }: { title: string; onBack?: () => void; dark?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 border-b px-2 py-2.5 ${
        dark ? "border-gray-700 bg-[#101820] text-white" : "border-gray-300 bg-gray-100 text-gray-900"
      }`}
    >
      {onBack && (
        <button
          type="button"
          data-phone-control="back"
          aria-label="Back"
          onClick={onBack}
          className="rounded-lg p-1.5 active:bg-black/10"
        >
          <ArrowLeftIcon size={20} aria-hidden />
        </button>
      )}
      <p className="truncate text-base font-semibold">{title}</p>
    </div>
  );
}

function SettingsPanel({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <AppBar title={title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
      <span className="text-base text-gray-900">{label}</span>
      <span className="text-base text-gray-700">{value}</span>
    </div>
  );
}

function Switch({ id, on, onPress, ring }: { id: string; on: boolean; onPress: () => void; ring: string }) {
  return (
    <button
      type="button"
      data-phone-toggle={id}
      role="switch"
      aria-checked={on}
      onClick={onPress}
      className={`h-8 w-14 shrink-0 rounded-full p-1 transition-colors ${on ? "bg-green-700" : "bg-gray-500"} ${ring}`}
    >
      <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${on ? "translate-x-6" : ""}`} />
    </button>
  );
}

/**
 * A slider wide enough for a finger. Tapping anywhere on the track jumps there,
 * which is the behavior somebody with an unsteady hand needs — dragging a small
 * thumb the length of the screen is the version that defeats them.
 */
function Slider({
  id,
  label,
  value,
  onValue,
  ring,
  dark,
}: {
  id: string;
  label: string;
  value: number;
  onValue: (v: number) => void;
  ring: string;
  dark?: boolean;
}) {
  const drag = useSliderDrag(onValue);
  return (
    <div className="mt-5">
      <div className={`mb-1.5 flex justify-between text-sm font-semibold ${dark ? "text-gray-100" : "text-gray-900"}`}>
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div
        {...drag}
        data-phone-slider={id}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onValue(Math.min(100, value + 5));
          if (e.key === "ArrowLeft") onValue(Math.max(0, value - 5));
        }}
        className={`h-10 w-full touch-none rounded-full p-[13px] ${dark ? "bg-gray-700" : "bg-gray-300"} ${ring}`}
      >
        <div className="relative h-3.5 -translate-y-[7px] rounded-full bg-blue-600" style={{ width: `${value}%` }}>
          <span className="absolute -right-3 -top-1.5 h-6 w-6 rounded-full border-2 border-blue-700 bg-white shadow" />
        </div>
      </div>
    </div>
  );
}

function Battery() {
  return (
    <svg width="22" height="11" viewBox="0 0 22 11" aria-hidden className="shrink-0">
      <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" fill="none" stroke="currentColor" />
      <rect x="2" y="2" width="13" height="7" rx="1" fill="currentColor" />
      <rect x="20" y="3.5" width="2" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

function IconButton({
  label,
  testId,
  onPress,
  ring,
  children,
}: {
  label: string;
  testId: string;
  onPress: () => void;
  ring: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-phone-control={testId}
      onClick={onPress}
      className={`flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 text-xs text-white active:bg-white/10 ${ring}`}
    >
      {children}
      {label}
    </button>
  );
}

/** A panel that slides up from the bottom — the phone's version of a dialog. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[70%] overflow-y-auto rounded-t-2xl bg-white p-3 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">{title}</p>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-blue-700 underline">
            Cancel
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * One app on the home screen. It has to answer to three different gestures — tap
 * to open, hold for the menu, and drag while the screen is wiggling — so all
 * three sets of handlers live on the same element and take care not to fight:
 * the long-press hook cancels itself once the finger has moved, which is what
 * lets a drag start from the same press.
 */
function AppIcon({
  id,
  name,
  Icon,
  bg,
  onOpen,
  onHold,
  drag,
  wiggle,
  dim,
  ring,
  compact,
}: {
  id: string;
  name: string;
  Icon: typeof ChatIcon;
  bg: string;
  onOpen: () => void;
  onHold: () => void;
  drag: { onPointerDown: (e: React.PointerEvent) => void };
  wiggle: boolean;
  dim: boolean;
  ring: string;
  compact?: boolean;
}) {
  const hold = useLongPress(onHold);
  return (
    <button
      type="button"
      data-phone-app={id}
      onClick={() => {
        // A long press that already fired owns this gesture — see `consumeClick`.
        if (hold.consumeClick()) return;
        onOpen();
      }}
      onPointerDown={(e) => {
        hold.props.onPointerDown(e);
        drag.onPointerDown(e);
      }}
      onContextMenu={hold.props.onContextMenu}
      className={`flex touch-none select-none flex-col items-center gap-1 ${dim ? "opacity-30" : ""} ${
        wiggle ? "animate-pop-attention" : ""
      }`}
    >
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ${bg} ${ring}`}>
        <Icon size={28} aria-hidden />
      </span>
      {!compact && <span className="max-w-full truncate text-[11px] font-medium text-indigo-950">{name}</span>}
    </button>
  );
}

/**
 * A conversation row that can be slid sideways.
 *
 * `touch-action: pan-y` is the load-bearing detail: it hands vertical drags back
 * to the browser so the list still scrolls normally, while horizontal ones come
 * here. Set to `none` the list stops scrolling; left unset, the browser claims
 * the horizontal drag too and the row never moves.
 */
function MessageRow({
  t,
  open,
  onOpen,
  onSwipe,
  onClose,
  onDelete,
  ring,
  deleteRing,
}: {
  t: Thread;
  open: boolean;
  onOpen: () => void;
  onSwipe: () => void;
  onClose: () => void;
  onDelete: () => void;
  ring: string;
  deleteRing: string;
}) {
  const [offset, setOffset] = useState(0);
  const swipe = useSwipe(
    ({ dir }) => {
      setOffset(0);
      if (dir === "left") onSwipe();
      if (dir === "right") onClose();
    },
    { axis: "x", threshold: 40, onMove: (dx) => setOffset(Math.min(0, Math.max(-96, dx))) },
  );

  return (
    <div className="relative overflow-hidden border-b border-gray-200">
      <button
        type="button"
        data-phone-delete={t.id}
        onClick={onDelete}
        className={`absolute inset-y-0 right-0 w-24 bg-red-700 text-base font-bold text-white ${deleteRing}`}
      >
        Delete
      </button>
      <div
        {...swipe.props}
        data-phone-thread={t.id}
        style={{ transform: `translateX(${open ? -96 : offset}px)` }}
        className={`relative touch-pan-y bg-white transition-transform duration-150 ${ring}`}
      >
        <button
          type="button"
          onClick={() => {
            // A swipe that just happened owns this gesture — see `consumeClick`.
            if (swipe.consumeClick()) return;
            onOpen();
          }}
          className="block w-full px-4 py-3 text-left"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-semibold text-gray-900">{t.who}</span>
            <span className="shrink-0 text-xs text-gray-600">{t.when}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {(t.junk || t.scam) && <BellIcon size={13} className="shrink-0 text-amber-700" aria-hidden />}
            <span className="truncate text-sm text-gray-700">{t.preview}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
