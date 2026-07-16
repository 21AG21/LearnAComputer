"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import MessagingApp from "./Desktop/MessagingApp";
import BrowserApp from "./Desktop/BrowserApp";
import FilesApp from "./Desktop/FilesApp";
import MailApp from "./Desktop/MailApp";

export type DesktopAppId = "messages" | "browser" | "files" | "mail";

interface FakeDesktopProps {
  /** Notified whenever the learner opens an app — lets lessons set goals like "open the mail app". */
  onAppOpened?: (app: DesktopAppId) => void;
}

const APPS: { id: DesktopAppId; label: string; icon: string }[] = [
  { id: "messages", label: "Open the Messaging App", icon: "/playgrounds/icon-chat.png" },
  { id: "browser", label: "Open the Browser", icon: "/playgrounds/icon-globe.png" },
  { id: "files", label: "Open Files", icon: "/playgrounds/icon-folder.png" },
  { id: "mail", label: "Open the Mail App", icon: "/playgrounds/icon-mail.png" },
];

const APP_TITLES: Record<DesktopAppId, string> = {
  messages: "Messaging App",
  browser: "Browser",
  files: "Files",
  mail: "Mail App",
};

export default function FakeDesktop({ onAppOpened }: FakeDesktopProps) {
  const [activeApp, setActiveApp] = useState<DesktopAppId | null>(null);
  // Apps that are open-but-minimized (still running, not quit) — these show a green dot on the desktop.
  const [minimized, setMinimized] = useState<Set<DesktopAppId>>(new Set());
  // Bumping a key remounts (resets) an app after it's closed; minimizing keeps its state.
  const [appKeys, setAppKeys] = useState<Record<DesktopAppId, number>>({
    messages: 0,
    browser: 0,
    files: 0,
    mail: 0,
  });
  const [time, setTime] = useState("1:35 pm");

  useEffect(() => {
    function update() {
      setTime(
        new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase()
      );
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  function openApp(app: DesktopAppId) {
    setActiveApp(app);
    setMinimized((prev) => {
      if (!prev.has(app)) return prev;
      const next = new Set(prev);
      next.delete(app);
      return next;
    });
    onAppOpened?.(app);
  }

  function closeApp(app: DesktopAppId) {
    setAppKeys((prev) => ({ ...prev, [app]: prev[app] + 1 }));
    setMinimized((prev) => {
      if (!prev.has(app)) return prev;
      const next = new Set(prev);
      next.delete(app);
      return next;
    });
    setActiveApp(null);
  }

  function minimizeApp() {
    if (activeApp) setMinimized((prev) => new Set(prev).add(activeApp));
    setActiveApp(null);
  }

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      {/* Menu bar */}
      <div className="h-9 shrink-0 bg-white flex items-center justify-between px-4 text-lg font-semibold">
        <span>{activeApp ? APP_TITLES[activeApp] : "Desktop"}</span>
        <div className="flex items-center gap-3">
          <WifiIcon className="w-6 h-5" />
          <span className="flex items-center gap-1">
            <BatteryIcon className="w-8 h-4" />
            85%
          </span>
          <span suppressHydrationWarning>{time}</span>
        </div>
      </div>

      {/* Desktop */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, #f5b9b9 0%, #fadcdc 20%, #d9f1d9 38%, #c2e9c2 50%, #daf2da 62%, #ccd3f3 82%, #bdc7ef 100%)",
          }}
        />
        <div className="absolute bottom-8 left-8 flex gap-6">
          {APPS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => openApp(id)}
              aria-label={label}
              className="relative w-20 h-20"
            >
              <Image src={icon} alt="" fill sizes="80px" className="object-contain" />
              {minimized.has(id) && (
                <span
                  aria-label={`${APP_TITLES[id]} is still open`}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"
                />
              )}
            </button>
          ))}
        </div>

        {/* Apps — kept mounted while minimized so their state survives */}
        <div className={`absolute inset-0 ${activeApp === "messages" ? "" : "hidden"}`}>
          <MessagingApp key={appKeys.messages} onClose={() => closeApp("messages")} onMinimize={minimizeApp} />
        </div>
        <div className={`absolute inset-0 ${activeApp === "browser" ? "" : "hidden"}`}>
          <BrowserApp key={appKeys.browser} onClose={() => closeApp("browser")} onMinimize={minimizeApp} />
        </div>
        <div className={`absolute inset-0 ${activeApp === "files" ? "" : "hidden"}`}>
          <FilesApp key={appKeys.files} onClose={() => closeApp("files")} onMinimize={minimizeApp} />
        </div>
        <div className={`absolute inset-0 ${activeApp === "mail" ? "" : "hidden"}`}>
          <MailApp key={appKeys.mail} onClose={() => closeApp("mail")} onMinimize={minimizeApp} />
        </div>
      </div>
    </div>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 26" className={className} aria-hidden="true">
      <path d="M2 9 A20 20 0 0 1 30 9" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M7 14.5 A13 13 0 0 1 25 14.5" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 20 A7 7 0 0 1 20 20" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.2" fill="#111" />
    </svg>
  );
}

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true">
      <rect x="1" y="2" width="33" height="16" rx="4" fill="#111" />
      <rect x="35" y="7" width="4" height="6" rx="1.5" fill="#111" />
      <rect x="27" y="4" width="5" height="12" fill="#fff" />
    </svg>
  );
}

