"use client";

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

export default function AppBody({ id }: { id: AppBodyId }) {
  switch (id) {
    case "messages": return <MessagingApp />;
    case "browser": return <BrowserApp />;
    case "mail": return <MailApp />;
    case "settings": return <SettingsApp />;
    case "notes": return <NotesApp />;
    case "photos": return <PhotosApp />;
    case "app-market": return <AppMarketApp />;
    case "calendar": return <CalendarApp initialView="calendar" />;
    case "reminders": return <CalendarApp initialView="reminders" />;
    case "files":
      return <FilesApp showHeader={false} onClose={() => {}} onMinimize={() => {}} />;
  }
}
