"use client";

import type { ComponentProps } from "react";
import MessagingApp from "./MessagingApp";
import BrowserApp from "./BrowserApp";
import FilesApp from "./FilesApp";
import MailApp from "./MailApp";
import SettingsApp from "./SettingsApp";
import NotesApp from "./NotesApp";
import PhotosApp from "./PhotosApp";
import CalendarApp from "./CalendarApp";
import AppMarketApp from "./AppMarketApp";

/**
 * What is inside a window when you open an app from the dock.
 *
 * There used to be three answers to that question. `FakeDesktop` opened the real
 * app; `GuidedDesktopTask` opened a hand-drawn sketch of it — a browser showing
 * four lines of prose, a Photos app of coloured squares; `GuidedTroubleshootingTask`
 * opened nothing at all for seven of its ten icons. So the same icon, clicked in
 * three different lessons, gave three different computers.
 *
 * Every dock now renders from here.
 */
export type AppBodyId =
  | "messages" | "browser" | "files" | "mail" | "settings"
  | "photos" | "app-market" | "calendar" | "reminders" | "notes";

/**
 * Per-app overrides for the callers that need them — the desktop passes the
 * live WiFi state to the browser, lesson-specific highlights to Files, and the
 * guided-settings callbacks to Settings. Everything not named here gets the
 * same app every other dock gives you.
 */
export interface AppBodyExtras {
  browser?: Partial<ComponentProps<typeof BrowserApp>>;
  files?: Partial<ComponentProps<typeof FilesApp>>;
  settings?: Partial<ComponentProps<typeof SettingsApp>>;
}

export default function AppBody({ id, extras }: { id: AppBodyId; extras?: AppBodyExtras }) {
  switch (id) {
    case "messages": return <MessagingApp />;
    case "browser": return <BrowserApp {...extras?.browser} />;
    case "mail": return <MailApp />;
    case "settings": return <SettingsApp {...extras?.settings} />;
    case "notes": return <NotesApp />;
    case "photos": return <PhotosApp />;
    case "app-market": return <AppMarketApp />;
    case "calendar": return <CalendarApp initialView="calendar" />;
    case "reminders": return <CalendarApp initialView="reminders" />;
    case "files":
      return <FilesApp showHeader={false} onClose={() => {}} onMinimize={() => {}} {...extras?.files} />;
  }
}
