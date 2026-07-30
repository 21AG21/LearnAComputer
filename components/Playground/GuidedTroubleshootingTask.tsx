"use client";

import { useState, useEffect } from "react";
import SimulatorFrame from "./SimulatorFrame";
import Dock from "./Dock";
import { useStepRunner, type SimMode } from "./useStepRunner";
import { GlobeIcon, MailIcon, GearIcon } from "./Icons";
import { DesktopMenuBar, wallpaper } from "./DesktopChrome";
import DraggableWindow from "./Desktop/DraggableWindow";
import AppBody, { type AppBodyId } from "./Desktop/AppBody";
import SettingsApp from "./Desktop/SettingsApp";
import BrowserSimulator from "./BrowserSimulator";
import GuidedEmailTask from "./GuidedEmailTask";

/** The bank's reset message, in the real Mail app's Inbox. */
const PR_RESET_SUBJECT = "Reset your password";
const PR_RESET_EMAIL = {
  id: "pr-bank-reset",
  from: "First National Bank",
  subject: PR_RESET_SUBJECT,
  date: "Just now",
  body:
    "We received a request to reset the password for your account. Use the button below within one hour.\n\n" +
    "If this was not you, you can ignore this message — your password has not changed.",
  actionLabel: "Reset my password",
};

/** The dock keys apps by label ("App Market"); AppBody keys them by id ("app-market"). */
function toAppBodyId(label: string): AppBodyId {
  return label.trim().toLowerCase().replace(/\s+/g, "-") as AppBodyId;
}

export type GuidedTroubleshootingStep = {
  say: string;
  action:
    | "read-error" | "click-frozen" | "open-force-quit" | "force-quit" | "restart-app"
    | "open-wifi-panel" | "toggle-wifi" | "reconnect-wifi" | "forget-network"
    | "copy-code" | "open-browser" | "paste-code" | "submit-support"
    | "dismiss-error" | "open-settings" | "click-restart" | "confirm-restart"
    | "type-in-app"
    | "open-app-market" | "go-to-my-apps" | "delete-broken-app" | "go-to-store-tab" | "reinstall-app"
    | "join-network" | "captive-portal-continue" | "open-settings-privacy" | "toggle-privacy-tracking"
    | "click-forgot-link" | "open-mail-from-dock" | "open-reset-email" | "click-reset-link"
    | "type-new-password" | "confirm-login";
  target?: string;
  value?: string;
};

interface Props {
  goal: string;
  scenario: string;
  steps: GuidedTroubleshootingStep[];
  mode?: SimMode;
  hint?: string;
  onResult: (success: boolean) => void;
}

type View = "desktop" | "force-quit" | "app-market";

interface FrozenApp {
  name: string;
  frozen: boolean;
  closed: boolean;
}

function inferScenarioMode(steps: GuidedTroubleshootingStep[]):
  "frozen" | "wifi" | "error-code" | "error-restart" | "app-reinstall" | "public-wifi" | "password-reset" {
  if (steps.some((s) => s.action === "join-network" || s.action === "captive-portal-continue")) return "public-wifi";
  if (steps.some((s) => s.action === "click-forgot-link" || s.action === "open-mail-from-dock")) return "password-reset";
  if (steps.some((s) => s.action === "force-quit" || s.action === "click-frozen")) return "frozen";
  if (steps.some((s) => s.action === "copy-code" || s.action === "paste-code")) return "error-code";
  if (steps.some((s) => s.action === "dismiss-error" || s.action === "click-restart")) return "error-restart";
  if (steps.some((s) => s.action === "open-app-market" || s.action === "reinstall-app")) return "app-reinstall";
  return "wifi";
}

const NETWORKS = ["CoolKids Network", "Neighbor's WiFi", "Coffee Shop"];
/** The café network the public-wifi scenario joins, alongside two you have no password for. */
const PUBLIC_GUEST_NETWORK = "Coffee Shop Free WiFi";
const PUBLIC_NETWORKS = [PUBLIC_GUEST_NETWORK, "CoffeeShop-Staff", "Neighbor 5G"];

const ALL_DOCK_APPS = [
  { id: "Messages", label: "Messages" },
  { id: "Browser",  label: "Browser"  },
  { id: "Files",    label: "Files"    },
  { id: "Mail",     label: "Mail"     },
  { id: "Settings", label: "Settings" },
  { id: "Photos",   label: "Photos"   },
  { id: "App Market", label: "App Market" },
  { id: "Calendar", label: "Calendar" },
  { id: "Reminders", label: "Reminders" },
  { id: "Notes",    label: "Notes"    },
];

export default function GuidedTroubleshootingTask({ goal, steps, mode: simMode, hint, onResult }: Props) {

  const mode = inferScenarioMode(steps);

  const [view, setView] = useState<View>("desktop");
  /** An app opened from the dock that this scenario has no script for — free play. */
  const [freeApp, setFreeApp] = useState<AppBodyId | null>(null);
  const [frozenApps, setFrozenApps] = useState<FrozenApp[]>(() => {
    if (mode !== "frozen") return [];
    const target = steps.find((s) => s.action === "force-quit")?.target ?? "Notes";
    return [{ name: target, frozen: true, closed: false }];
  });
  const [clickedFrozen, setClickedFrozen] = useState(false);
  const [wifiPanelOpen, setWifiPanelOpen] = useState(false);
  const [wifiOn, setWifiOn] = useState(() => mode !== "wifi");
  const [connectedNetwork, setConnectedNetwork] = useState<string | null>(
    () => (mode === "wifi" || mode === "public-wifi" ? null : "CoolKids Network"),
  );

  // public-wifi state
  const [portalStage, setPortalStage] = useState<"offline" | "portal" | "online">("offline");
  /** The café portal's browser window. Closing it is recoverable from the dock. */
  const [portalWinOpen, setPortalWinOpen] = useState(true);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // password-reset state. `prStage` is the *bank site's* stage only — the Mail
  // half is the real Mail app now and owns its own reading state.
  const [prStage, setPrStage] = useState<"login" | "sent" | "reset" | "done">("login");
  const [prApp, setPrApp] = useState<"browser" | "mail" | null>("browser");
  const [prPassword, setPrPassword] = useState("");
  const [forgottenNetworks, setForgottenNetworks] = useState<string[]>([]);
  const [searchingNetwork, setSearchingNetwork] = useState<string | null>(null);
  /** Why the last Join did not work. Shown in the WiFi panel. */
  const [networkError, setNetworkError] = useState<string | null>(null);

  const [errorCode] = useState(() => {
    const s = steps.find((s) => s.action === "copy-code");
    return s?.value ?? "PX-4402";
  });
  const [errorApp] = useState(() => {
    const s = steps.find((s) => s.action === "restart-app");
    return s?.target ?? "Photos";
  });
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [pastedCode, setPastedCode] = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  /** The support site's browser window. Not a `view` — the desktop stays behind it. */
  const [supportOpen, setSupportOpen] = useState(false);
  const [appReopened, setAppReopened] = useState(false);

  // error-restart state
  const [erSystemError, setErSystemError] = useState(() => mode === "error-restart");
  const [erSettingsOpen, setErSettingsOpen] = useState(false);
  const [erRestartConfirm, setErRestartConfirm] = useState(false);
  const [erRestarting, setErRestarting] = useState(false);
  const [erRestarted, setErRestarted] = useState(false);

  // frozen + type-in-app state
  const [frozenAppReopened, setFrozenAppReopened] = useState(false);
  const [typedInApp, setTypedInApp] = useState("");
  const [appTyped, setAppTyped] = useState(false);

  // app-reinstall state
  const [arMarketTab, setArMarketTab] = useState<"my-apps" | "store">("my-apps");
  const [arAppDeleted, setArAppDeleted] = useState(false);
  const [arAppInstalled, setArAppInstalled] = useState(false);
  const [arBrowserFresh, setArBrowserFresh] = useState(false);
  const arBrokenTarget = steps.find((s) => s.action === "delete-broken-app")?.target ?? "Browser";

  const [time, setTime] = useState("11:15 am");
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!("getBattery" in navigator)) return;
    (navigator as unknown as { getBattery: () => Promise<{ level: number }> }).getBattery().then((b) => {
      setBatteryPct(Math.round(b.level * 100));
    }).catch(() => {});
  }, []);

  const { step, stepIndex, done, flash, tryStep, objectives } =
    useStepRunner({ steps, mode: simMode, onResult });

  function hl(kind: string, name?: string): boolean {
    if (done || !step) return false;
    switch (step.action) {
      case "read-error": return kind === "error-dismiss";
      case "click-frozen": return kind === "frozen-window";
      case "open-force-quit": return kind === "system-menu";
      case "force-quit": return kind === "fq-btn" && name === step.target;
      case "restart-app": return kind === "dock-app" && name === step.target;
      case "open-wifi-panel": return kind === "wifi-icon";
      case "join-network": return kind === "network-row" && name === step.target;
      case "captive-portal-continue": return kind === "portal-continue";
      case "open-settings-privacy": return kind === "dock-app" && name === "Settings";
      case "toggle-privacy-tracking": return kind === "privacy-toggle";
      case "click-forgot-link": return kind === "forgot-link";
      case "open-mail-from-dock": return kind === "dock-app" && name === "Mail";
      case "open-reset-email": return kind === "reset-email-row";
      case "click-reset-link": return kind === "reset-email-link";
      case "type-new-password": return kind === "new-password-input";
      case "confirm-login": return kind === "confirm-login-btn";
      case "toggle-wifi": return kind === "wifi-toggle";
      case "reconnect-wifi": return kind === "reconnect-btn";
      case "forget-network": return kind === "forget-btn" && name === step.target;
      case "copy-code": return kind === "copy-btn";
      case "open-browser": return kind === "dock-app" && name === "Browser";
      case "paste-code": return kind === "paste-input";
      case "submit-support": return kind === "submit-btn";
      case "dismiss-error": return kind === "er-dismiss";
      case "open-settings": return kind === "dock-app" && name === "Settings";
      case "click-restart": return kind === "restart-btn";
      case "confirm-restart": return kind === "confirm-btn";
      case "type-in-app": return kind === "notes-input";
      case "open-app-market": return kind === "dock-app" && name === "App Market";
      case "go-to-my-apps": return kind === "my-apps-tab";
      case "delete-broken-app": return kind === "delete-app-btn";
      case "go-to-store-tab": return kind === "store-tab";
      case "reinstall-app": return kind === "install-btn";
      default: return false;
    }
  }

  const pulse = "ring-2 ring-yellow-400 animate-pulse";
  const frozenTarget = frozenApps.find((a) => a.frozen && !a.closed);

  function handleClickFrozen() {
    setClickedFrozen(true);
    tryStep((s) => s.action === "click-frozen");
  }

  function handleOpenForceQuit() {
    setView("force-quit");
    tryStep((s) => s.action === "open-force-quit");
  }

  function handleForceQuit(name: string) {
    const wasFrozen = frozenApps.find((a) => a.name === name)?.frozen;
    setFrozenApps((prev) => prev.map((a) => a.name === name ? { ...a, closed: true, frozen: false } : a));
    setView("desktop");
    // Force-quitting the frozen app IS working out which app is stuck — without
    // this, a learner who reads "(Not Responding)" in the dialog and kills the
    // app first can never complete the identify objective: the window is gone.
    if (wasFrozen) tryStep((s) => s.action === "click-frozen");
    tryStep((s) => s.action === "force-quit" && s.target === name);
  }

  /**
   * True when reopening this app is the thing the lesson is asking for right now.
   * Without the guard, clicking Photos on step 1 of the error-code lesson jumped
   * straight to "Photos is working again" while the banner still said to copy the
   * error code — the scenario resolved itself before the learner had done anything.
   */
  function wantsRestart(name: string): boolean {
    if (!step) return true; // assessment mode, or free play after the lesson is done
    return step.action === "restart-app" && (step.target ?? "") === name;
  }

  function handleRestartApp(name: string) {
    if (mode === "error-code") {
      setAppReopened(true);
    } else if (mode === "app-reinstall") {
      setArBrowserFresh(true);
      setView("desktop");
    } else {
      setFrozenApps((prev) => prev.map((a) => a.name === name ? { ...a, closed: false, frozen: false } : a));
      setFrozenAppReopened(true);
    }
    tryStep((s) => s.action === "restart-app" && s.target === name);
  }

  function handleOpenAppMarket() {
    setView("app-market");
    setArMarketTab("my-apps");
    tryStep((s) => s.action === "open-app-market");
  }
  function handleGoToMyApps() {
    setArMarketTab("my-apps");
    tryStep((s) => s.action === "go-to-my-apps");
  }
  function handleDeleteBrokenApp() {
    setArAppDeleted(true);
    tryStep((s) => s.action === "delete-broken-app");
  }
  function handleGoToStoreTab() {
    setArMarketTab("store");
    tryStep((s) => s.action === "go-to-store-tab");
  }
  function handleReinstallApp() {
    setArAppInstalled(true);
    tryStep((s) => s.action === "reinstall-app");
  }

  function handleJoinNetwork(network: string) {
    if (searchingNetwork) return;
    setNetworkError(null);
    setSearchingNetwork(network);
    setTimeout(() => {
      setSearchingNetwork(null);
      // Only the guest network lets a stranger on. The other two spin and then refuse,
      // and they say why — a Join button that quietly does nothing teaches nothing.
      if (network !== PUBLIC_GUEST_NETWORK) {
        setNetworkError(`${network} needs a password you do not have. Try the guest network.`);
        return;
      }
      setConnectedNetwork(network);
      setWifiPanelOpen(false);
      // A café network drops you on its sign-in page rather than straight onto the web.
      setPortalStage("portal");
      tryStep((s) => s.action === "join-network" && s.target === network);
    }, 1500);
  }

  function handlePortalContinue() {
    setPortalStage("online");
    tryStep((s) => s.action === "captive-portal-continue");
  }

  function handleOpenSettingsPrivacy() {
    setPrivacyOpen(true);
    tryStep((s) => s.action === "open-settings-privacy");
  }

  function handleToggleTracking(value: boolean) {
    // SettingsApp owns the switch's own state; the step says turn it off, so
    // switching it back on must not count.
    if (!value) tryStep((s) => s.action === "toggle-privacy-tracking");
  }

  function handleForgotPasswordLink() {
    setPrStage("sent");
    tryStep((s) => s.action === "click-forgot-link");
  }

  function handleOpenMailFromDock() {
    setPrApp("mail");
    tryStep((s) => s.action === "open-mail-from-dock");
  }

  function handleOpenPrResetEmail() {
    tryStep((s) => s.action === "open-reset-email");
  }

  function handleClickPrResetLink() {
    // The link hands you back to the browser, exactly as it does on a real machine.
    setPrApp("browser");
    setPrStage("reset");
    tryStep((s) => s.action === "click-reset-link");
  }

  function handleTypeNewPassword(value: string) {
    setPrPassword(value);
    tryStep((s) => s.action === "type-new-password" && (!s.value || value === s.value));
  }

  function handleConfirmLogin() {
    setPrStage("done");
    tryStep((s) => s.action === "confirm-login");
  }

  function handleOpenWifiPanel() {
    setWifiPanelOpen(true);
    tryStep((s) => s.action === "open-wifi-panel");
  }

  function handleToggleWifi() {
    const newVal = !wifiOn;
    setWifiOn(newVal);
    if (!newVal) setConnectedNetwork(null);
    tryStep((s) => s.action === "toggle-wifi");
  }

  function handleReconnect(network: string) {
    if (searchingNetwork) return;
    setNetworkError(null);
    setSearchingNetwork(network);
    setTimeout(() => {
      const isHome = network === "CoolKids Network";
      setConnectedNetwork(isHome ? network : null);
      setSearchingNetwork(null);
      if (!isHome) setNetworkError(`${network} is not your network — you do not have its password.`);
      tryStep((s) => s.action === "reconnect-wifi" && isHome);
    }, 1500);
  }

  function handleForgetNetwork(name: string) {
    setForgottenNetworks((prev) => [...prev, name]);
    if (connectedNetwork === name) setConnectedNetwork(null);
    tryStep((s) => s.action === "forget-network" && s.target === name);
  }

  function handleDismissError() {
    setErrorDismissed(true);
    tryStep((s) => s.action === "read-error");
  }

  function handleCopyCode() {
    setCodeCopied(true);
    tryStep((s) => s.action === "copy-code");
  }

  function handleOpenBrowser() {
    setSupportOpen(true);
    tryStep((s) => s.action === "open-browser");
  }

  function handlePasteCode() {
    setPastedCode(errorCode);
    tryStep((s) => s.action === "paste-code");
  }

  function handleSubmitSupport() {
    setSupportSubmitted(true);
    tryStep((s) => s.action === "submit-support");
  }

  function handleErDismiss() {
    setErSystemError(false);
    tryStep((s) => s.action === "dismiss-error");
  }

  function handleErOpenSettings() {
    setErSettingsOpen(true);
    tryStep((s) => s.action === "open-settings");
  }

  function handleErClickRestart() {
    setErRestartConfirm(true);
    tryStep((s) => s.action === "click-restart");
  }

  function handleErConfirmRestart() {
    setErRestartConfirm(false);
    setErRestarting(true);
    tryStep((s) => s.action === "confirm-restart");
    setTimeout(() => {
      setErRestarting(false);
      setErRestarted(true);
    }, 1500);
  }

  /**
   * The dock icons this scenario has its own answer for. Every other icon opens the
   * real app, exactly as it does everywhere else in the course — a dock where seven
   * of the ten icons did nothing at all was the "broken computer" feeling this unit
   * is supposed to be curing.
   */
  const scenarioIds = (() => {
    switch (mode) {
      case "error-restart": return new Set(["Settings"]);
      case "error-code": return new Set([errorApp, "Browser"]);
      case "public-wifi": return new Set(["Settings", "Browser"]);
      case "password-reset": return new Set(["Mail", "Browser"]);
      case "app-reinstall": return new Set([arBrokenTarget, "App Market"]);
      case "frozen": return new Set([frozenApps[0]?.name ?? "Notes"]);
      default: return new Set<string>();
    }
  })();

  return (
    <SimulatorFrame
      appName=""
      appIcon=""
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
      // This sim *is* the desktop, and the desktop draws its own menu bar. With the
      // frame's chrome on there were two stacked title bars — the upper one blank,
      // with close and minimize buttons that did nothing.
      chrome={false}
    >
      {/* h-full, not flex-1: with the frame's chrome off the parent is a plain block,
          and a flex-1 child of a block collapses to the height of its content. */}
      <div className="h-full flex flex-col overflow-hidden relative" style={{ background: wallpaper(false) }}>
        {/* Menu Bar */}
        <div className="relative shrink-0">
          <DesktopMenuBar
            title={view === "force-quit" ? "Force Quit" : view === "app-market" ? "App Market" : "Desktop"}
            leading={
              <button
                onClick={handleOpenForceQuit}
                className={`font-semibold text-gray-700 hover:text-gray-900 ${hl("system-menu") ? pulse + " rounded px-1" : ""}`}
                title="System menu"
                aria-label="System menu"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4 inline" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
              </button>
            }
            time={time}
            batteryPercent={batteryPct}
            openPanel={wifiPanelOpen ? "wifi" : null}
            onTogglePanel={(panel) => {
              if (panel === "wifi") {
                if (wifiPanelOpen) setWifiPanelOpen(false);
                else handleOpenWifiPanel();
              }
            }}
            highlight={hl("wifi-icon") ? "wifi" : null}
          />

        {/* WiFi Panel Dropdown */}
        {wifiPanelOpen && (
          <div className="absolute top-full right-2 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">WiFi</span>
              <button
                onClick={handleToggleWifi}
                aria-label={wifiOn ? "Turn WiFi off" : "Turn WiFi on"}
                aria-pressed={wifiOn}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wifiOn ? "bg-green-500" : "bg-gray-300"} ${hl("wifi-toggle") ? pulse : ""}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${wifiOn ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </button>
            </div>
            {wifiOn && (
              <div className="space-y-1.5">
                {(mode === "public-wifi" ? PUBLIC_NETWORKS : NETWORKS).filter((n) => !forgottenNetworks.includes(n)).map((network) => (
                  <div key={network} className={`flex items-center justify-between p-2 rounded-lg text-xs ${connectedNetwork === network ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}>
                    <span className="flex items-center gap-1.5">
                      {connectedNetwork === network && <span className="text-blue-700 sim-dark:text-blue-400">&#10003;</span>}
                      {searchingNetwork === network && <span className="animate-spin text-gray-500 sim-dark:text-gray-400">&#9696;</span>}
                      {network}
                    </span>
                    <div className="flex gap-1">
                      {connectedNetwork !== network && !searchingNetwork && (
                        <button
                          onClick={() => (mode === "public-wifi" ? handleJoinNetwork(network) : handleReconnect(network))}
                          className={`px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] ${
                            hl("reconnect-btn") || hl("network-row", network) ? pulse : ""
                          }`}
                        >
                          Join
                        </button>
                      )}
                      {mode !== "public-wifi" && (
                        <button
                          onClick={() => handleForgetNetwork(network)}
                          className={`px-1.5 py-0.5 text-gray-500 hover:text-red-500 text-[10px] ${hl("forget-btn", network) ? pulse : ""}`}
                        >
                          Forget
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {networkError && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
                    {networkError}
                  </p>
                )}
                {forgottenNetworks.includes("CoolKids Network") && !connectedNetwork && (
                  <button
                    onClick={() => handleReconnect("CoolKids Network")}
                    className={`w-full py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${hl("reconnect-btn") ? pulse : ""}`}
                  >
                    Reconnect to CoolKids Network
                  </button>
                )}
              </div>
            )}
            {!wifiOn && <p className="text-xs text-gray-500 sim-dark:text-gray-400 text-center py-2">WiFi is off</p>}
          </div>
        )}
        </div>{/* end menu bar container */}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative">
          {/* An app the scenario has no script for, opened from the dock. Same window,
              same app, same everything as every other dock in the course. */}
          {freeApp && (
            <DraggableWindow
              key={freeApp}
              title={ALL_DOCK_APPS.find((a) => toAppBodyId(a.id) === freeApp)?.label ?? "App"}
              initial={{ x: 24, y: 16, w: 520, h: 380 }}
              fit
              onClose={() => setFreeApp(null)}
              onMinimize={() => setFreeApp(null)}
            >
              <AppBody id={freeApp} />
            </DraggableWindow>
          )}
          {/* Error Dialog Overlay */}
          {mode === "error-code" && !errorDismissed && (
            <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs">
                <div className="text-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-red-700 sim-dark:text-red-400" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
                </div>
                <h3 className="font-bold text-base text-center mb-1">{errorApp} can&apos;t open</h3>
                <p className="text-xs text-gray-500 text-center mb-3">An unexpected error occurred.</p>
                <div className={`flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2 mb-3 ${hl("copy-btn") ? pulse : ""}`}>
                  <code className="text-sm font-mono font-bold text-red-700 sim-dark:text-red-300 select-all">{errorCode}</code>
                  <button
                    onClick={handleCopyCode}
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded font-medium"
                  >
                    {codeCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={handleDismissError}
                  className={`w-full py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 ${hl("error-dismiss") ? pulse : ""}`}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Force Quit Dialog */}
          {view === "force-quit" && (
            <div className="absolute inset-0 z-30 bg-black/30 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
                <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold">Force Quit Applications</span>
                  <button onClick={() => setView("desktop")} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
                </div>
                <div className="p-3 space-y-1.5">
                  {frozenApps.filter((a) => !a.closed).map((app) => (
                    <div key={app.name} className={`flex items-center justify-between p-2.5 rounded-lg ${app.frozen ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                      <span className="text-sm">
                        {app.name}
                        {app.frozen && <span className="text-xs text-red-700 sim-dark:text-red-400 ml-1.5">(Not Responding)</span>}
                      </span>
                      <button
                        onClick={() => handleForceQuit(app.name)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg ${app.frozen ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-600 hover:bg-gray-300"} ${hl("fq-btn", app.name) ? pulse : ""}`}
                      >
                        Force Quit
                      </button>
                    </div>
                  ))}
                  {frozenApps.every((a) => a.closed) && (
                    <p className="text-sm text-gray-500 text-center py-3">No apps to force quit.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* The support site, in the browser the rest of the course teaches. It used
              to swallow the whole desktop and wear a gray strip for an address bar —
              no tab, no lock icon, no window. Opening a browser does not make your
              desktop disappear, so it is a window now, over the crashed app. */}
          {view === "desktop" && supportOpen && (
            <DraggableWindow
              title="Browser"
              icon={<GlobeIcon size={16} />}
              initial={{ x: 12, y: 12, w: 520, h: 470 }}
              fit
              onClose={() => setSupportOpen(false)}
              onMinimize={() => setSupportOpen(false)}
            >
              <BrowserSimulator
                bezel={false}
                showControls={false}
                tabTitle="Computer Support"
                url="support.example/help"
                onExit={() => setSupportOpen(false)}
              >
                <div className="h-full overflow-y-auto bg-white">
                  <div className="p-4">
                    <h2 className="text-base font-bold mb-1">Computer Support</h2>
                    <p className="text-xs text-gray-500 mb-4">Paste your error code below and we&apos;ll help you fix it.</p>
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700 block mb-1">Error code</label>
                      <div className="flex gap-2">
                        <input
                          value={pastedCode}
                          readOnly
                          placeholder="Paste error code here..."
                          className={`flex-1 px-3 py-2 text-sm border border-gray-500 rounded-lg bg-gray-50 ${hl("paste-input") ? pulse : ""}`}
                        />
                        <button
                          onClick={handlePasteCode}
                          className={`px-3 py-2 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg font-medium ${hl("paste-input") ? pulse : ""}`}
                        >
                          Paste
                        </button>
                      </div>
                    </div>
                    {pastedCode && !supportSubmitted && (
                      <button
                        onClick={handleSubmitSupport}
                        className={`w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 ${hl("submit-btn") ? pulse : ""}`}
                      >
                        Submit
                      </button>
                    )}
                    {supportSubmitted && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm font-medium text-green-800 mb-1">Solution found!</p>
                        <p className="text-xs text-green-700">Error {errorCode}: This is usually a temporary problem. Try closing and reopening {errorApp} from your dock.</p>
                      </div>
                    )}
                  </div>
                </div>
              </BrowserSimulator>
            </DraggableWindow>
          )}

          {/* Public WiFi — the desktop is offline until a network is joined. */}
          {view === "desktop" && mode === "public-wifi" && !privacyOpen && portalStage === "offline" && (
            <div className="p-4 py-10 text-center">
              <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 005 8.26m2.28 4.14a7 7 0 019.5 0M8.53 16.11a3.5 3.5 0 014.95 0M12 20h.01"/>
              </svg>
              <p className="text-sm font-medium text-gray-500 mb-1">You are not connected to the internet</p>
              <p className="text-xs text-gray-500 sim-dark:text-gray-400">There is a café network nearby. The WiFi icon is in the bar above.</p>
            </div>
          )}

          {/* Closing the portal must not strand anybody — the dock brings it back. */}
          {view === "desktop" && mode === "public-wifi" && !privacyOpen && portalStage !== "offline" && !portalWinOpen && (
            <div className="p-4 text-center py-10">
              <p className="text-sm text-gray-600">Nothing is open.</p>
              <p className="text-xs text-gray-500 mt-1">Click Browser in the dock to bring the café&apos;s page back.</p>
            </div>
          )}

          {/* The café sign-in page is a web page, so it lives in the browser, in a
              window — not the bare card on the wallpaper it used to be. */}
          {view === "desktop" && mode === "public-wifi" && !privacyOpen && portalStage !== "offline" && portalWinOpen && (
            <DraggableWindow
              title="Browser"
              icon={<GlobeIcon size={16} />}
              // Taller than the other two: the portal card carries a header, a
              // field and a paragraph of advice above its Continue button, and
              // Continue is what the step rings.
              initial={{ x: 12, y: 12, w: 520, h: 560 }}
              fit
              onClose={() => setPortalWinOpen(false)}
              onMinimize={() => setPortalWinOpen(false)}
            >
              <BrowserSimulator
                bezel={false}
                showControls={false}
                tabTitle="The Corner Café"
                url={portalStage === "portal" ? "cornercafe.example/wifi" : "cornercafe.example/connected"}
                onExit={() => setPortalWinOpen(false)}
              >
                <div className="h-full overflow-y-auto bg-white">
                  {portalStage === "portal" && (
                    <div className="max-w-md mx-auto m-3 border-2 border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-amber-800 text-amber-50 px-4 py-3 text-center">
                        <p className="text-lg font-bold tracking-wide">The Corner Café</p>
                        <p className="text-xs text-amber-200">Guest WiFi sign-in</p>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-700 mb-3">Enter your email address to get online. It is free.</p>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Email address</label>
                        <input
                          readOnly
                          value="you@example.com"
                          aria-label="Email address"
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 bg-gray-50"
                        />
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                          <p className="text-xs text-blue-800">
                            This page wants your <strong>email</strong> — that is normal for café WiFi. It must never ask for a
                            password you use anywhere else. If it does, close the page and stay off that network.
                          </p>
                        </div>
                        <button
                          onClick={handlePortalContinue}
                          className={`w-full py-2 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-800 ${hl("portal-continue") ? pulse : ""}`}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {portalStage === "online" && (
                    <div className="py-10 text-center">
                      <svg viewBox="0 0 20 16" className="w-16 h-12 mx-auto text-green-500 mb-3" fill="currentColor">
                        <path d="M10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4.3a5 5 0 017 0l-1 1.1a3.3 3.3 0 00-5 0l-1-1.1zm-2.8-2.8a8.3 8.3 0 0112.6 0l-1 1a7 7 0 00-10.6 0l-1-1z"/>
                      </svg>
                      <p className="text-sm font-medium text-green-700 sim-dark:text-green-400 mb-1">Connected to Coffee Shop Free WiFi</p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto px-4">
                        You are online — but this is somebody else&apos;s network. Tighten your privacy settings before you browse.
                      </p>
                    </div>
                  )}
                </div>
              </BrowserSimulator>
            </DraggableWindow>
          )}

          {/* Public WiFi — Privacy, in the same Settings app Unit 9 teaches. This used to be
              a bespoke card with a toggle called "Allow websites to track me across sites";
              the real app calls it Cross-Site Tracking, and the lesson copy said neither. */}
          {view === "desktop" && mode === "public-wifi" && privacyOpen && (
            <DraggableWindow
              title="Settings"
              icon={<GearIcon size={16} />}
              initial={{ x: 24, y: 16, w: 560, h: 400 }}
              fit
              onClose={() => setPrivacyOpen(false)}
              onMinimize={() => setPrivacyOpen(false)}
            >
              <SettingsApp
                initialSection="privacy"
                highlightToggle={hl("privacy-toggle") ? "cross-site-tracking" : undefined}
                onToggle={(target, value) => {
                  if (target === "cross-site-tracking") handleToggleTracking(value);
                }}
              />
            </DraggableWindow>
          )}

          {/* Password reset — browser login ▸ Mail ▸ back to the browser.
              Both halves are the apps the rest of the course teaches: the real Mail
              app from the dock, and the same browser chrome Units 1 and 4 use, each
              in the standard window frame. This used to be two hand-drawn cards
              floating on the wallpaper, so the Mail icon opened one thing in Unit 6
              and something else entirely here. */}
          {view === "desktop" && mode === "password-reset" && prApp === null && (
            <div className="p-4 text-center py-10">
              <p className="text-sm text-gray-600">Nothing is open.</p>
              <p className="text-xs text-gray-500 mt-1">
                Click Browser in the dock to go back to the bank&apos;s sign-in page, or Mail to read your inbox.
              </p>
            </div>
          )}

          {view === "desktop" && mode === "password-reset" && prApp === "mail" && (
            <DraggableWindow
              title="Mail"
              icon={<MailIcon size={16} />}
              initial={{ x: 12, y: 12, w: 520, h: 470 }}
              fit
              onClose={() => setPrApp(null)}
              onMinimize={() => setPrApp(null)}
            >
              <GuidedEmailTask
                goal=""
                steps={[]}
                freePlay
                seedInbox={[PR_RESET_EMAIL]}
                highlightEmail={hl("reset-email-row") ? PR_RESET_SUBJECT : undefined}
                highlightEmailAction={hl("reset-email-link")}
                onOpenEmail={(subject) => { if (subject === PR_RESET_SUBJECT) handleOpenPrResetEmail(); }}
                onEmailAction={handleClickPrResetLink}
                onResult={() => {}}
              />
            </DraggableWindow>
          )}

          {view === "desktop" && mode === "password-reset" && prApp === "browser" && (
            <DraggableWindow
              title="Browser"
              icon={<GlobeIcon size={16} />}
              initial={{ x: 12, y: 12, w: 520, h: 470 }}
              fit
              onClose={() => setPrApp(null)}
              onMinimize={() => setPrApp(null)}
            >
              <BrowserSimulator
                bezel={false}
                showControls={false}
                tabTitle="First National Bank"
                url={prStage === "reset" ? "firstbank.example/reset?token=abc123" : "firstbank.example"}
                onExit={() => setPrApp(null)}
              >
                <div className="h-full overflow-y-auto bg-white">
                  <div className="max-w-sm mx-auto p-4">
                    {prStage === "login" && (
                      <>
                        <h3 className="font-bold text-base mb-3 text-center">Sign in</h3>
                        <input readOnly value="you@example.com" aria-label="Email" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 bg-gray-50" />
                        <input readOnly type="password" value="......" aria-label="Password" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 bg-gray-50" />
                        <p className="text-xs text-red-700 sim-dark:text-red-400 mb-3">That password is not right.</p>
                        <button
                          onClick={handleForgotPasswordLink}
                          className={`text-sm text-blue-600 underline rounded ${hl("forgot-link") ? pulse : ""}`}
                        >
                          Forgot password?
                        </button>
                      </>
                    )}
                    {prStage === "sent" && (
                      <div className="text-center py-4">
                        <MailIcon size={32} className="mx-auto text-blue-700 sim-dark:text-blue-400 mb-2" />
                        <p className="text-sm font-semibold mb-1">Check your email</p>
                        <p className="text-xs text-gray-600 sim-dark:text-gray-400">
                          We sent a reset link to you@example.com. Open the Mail app in the dock below to read it.
                        </p>
                      </div>
                    )}
                    {prStage === "reset" && (
                      <>
                        <h3 className="font-bold text-base mb-1 text-center">Choose a new password</h3>
                        {/* The address bar carries the reset URL now, so the page
                            does not have to spell it out a second time. */}
                        <p className="text-xs text-gray-500 mb-3 text-center">This link came from your email and works once.</p>
                        <input
                          value={prPassword}
                          onChange={(e) => handleTypeNewPassword(e.target.value)}
                          type="text"
                          aria-label="New password"
                          placeholder="New password"
                          className={`w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-blue-400 ${hl("new-password-input") ? pulse : ""}`}
                        />
                        <button
                          onClick={handleConfirmLogin}
                          disabled={!prPassword}
                          className={`w-full py-2 text-sm font-bold rounded-lg text-white ${prPassword ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-default"} ${hl("confirm-login-btn") ? pulse : ""}`}
                        >
                          Save &amp; sign in
                        </button>
                      </>
                    )}
                    {prStage === "done" && (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 sim-dark:text-green-400 flex items-center justify-center mx-auto mb-2 text-2xl">&#10003;</div>
                        <p className="text-sm font-semibold mb-0.5">Signed in as you@example.com</p>
                        <p className="text-xs text-gray-500">First National Bank · Personal account</p>
                        <p className="text-xs text-gray-500 sim-dark:text-gray-400 mt-2">Your new password is saved. Keep it in a password manager.</p>
                      </div>
                    )}
                  </div>
                </div>
              </BrowserSimulator>
            </DraggableWindow>
          )}

          {view === "desktop" && mode === "frozen" && (
            <div className="p-4">
              {frozenTarget && !frozenTarget.closed && (
                <div
                  onClick={handleClickFrozen}
                  className={`bg-white rounded-xl shadow-lg border overflow-hidden max-w-sm mx-auto cursor-pointer ${hl("frozen-window") ? pulse : ""}`}
                >
                  <div className="bg-gray-100 border-b px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 sim-dark:text-gray-300">{frozenTarget.name} (Not Responding)</span>
                    <span className="text-xs text-red-700 sim-dark:text-red-400 animate-spin">&#9696;</span>
                  </div>
                  <div className="p-6 opacity-40 select-none">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-5/6 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                  {clickedFrozen && (
                    <div className="bg-yellow-50 border-t border-yellow-200 px-3 py-2">
                      <p className="text-xs text-yellow-800">The app is not responding. It won&apos;t react to any clicks.</p>
                    </div>
                  )}
                </div>
              )}
              {frozenTarget?.closed && !appReopened && (
                <div className="text-center py-8">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
                  <p className="text-sm text-gray-600">{frozenTarget.name} has been force quit.</p>
                  <p className="text-xs text-gray-500 sim-dark:text-gray-400 mt-1">Click {frozenTarget.name} in the dock below to reopen it.</p>
                </div>
              )}
              {appReopened && (
                <div className="bg-white rounded-xl shadow-lg border overflow-hidden max-w-sm mx-auto">
                  <div className="bg-gray-100 border-b px-3 py-2">
                    <span className="text-sm font-medium">{frozenTarget?.name}</span>
                  </div>
                  <div className="p-6">
                    <div className="h-3 bg-gray-300 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-5/6" />
                    <p className="text-xs text-green-700 sim-dark:text-green-400 mt-3">{frozenTarget?.name} is working normally again.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop View - WiFi Mode */}
          {view === "desktop" && mode === "wifi" && (
            <div className="p-4 text-center">
              {!wifiOn || !connectedNetwork ? (
                <div className="py-8">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 005 8.26m2.28 4.14a7 7 0 019.5 0M8.53 16.11a3.5 3.5 0 014.95 0M12 20h.01"/>
                  </svg>
                  <p className="text-sm font-medium text-gray-500 mb-1">No Internet Connection</p>
                  <p className="text-xs text-gray-500 sim-dark:text-gray-400">Click the WiFi icon in the menu bar to fix this.</p>
                </div>
              ) : (
                <div className="py-8">
                  <svg viewBox="0 0 20 16" className="w-16 h-12 mx-auto text-blue-700 sim-dark:text-blue-400 mb-3" fill="currentColor">
                    <path d="M10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4.3a5 5 0 017 0l-1 1.1a3.3 3.3 0 00-5 0l-1-1.1zm-2.8-2.8a8.3 8.3 0 0112.6 0l-1 1a7 7 0 00-10.6 0l-1-1z"/>
                  </svg>
                  <p className="text-sm font-medium text-green-700 sim-dark:text-green-400 mb-1">Connected to {connectedNetwork}</p>
                  <p className="text-xs text-gray-500 sim-dark:text-gray-400">Your internet is working.</p>
                </div>
              )}
            </div>
          )}

          {/* Desktop View - Error Code Mode (after error dismissed) */}
          {view === "desktop" && mode === "error-code" && errorDismissed && !appReopened && (
            <div className="p-4 text-center py-8">
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
              <p className="text-sm text-gray-600 mb-1">{errorApp} crashed with error <code className="font-mono font-bold text-red-700 sim-dark:text-red-400">{errorCode}</code></p>
              {codeCopied && <p className="text-xs text-green-700 sim-dark:text-green-400">Error code copied to clipboard.</p>}
            </div>
          )}
          {view === "desktop" && mode === "error-code" && appReopened && (
            <div className="p-4 text-center py-8">
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
              <p className="text-sm text-green-700 sim-dark:text-green-400 font-medium">{errorApp} is working again!</p>
            </div>
          )}

          {/* Frozen mode — app reopened, type-in-app step */}
          {view === "desktop" && mode === "frozen" && frozenAppReopened && (
            <div className="p-4">
              <div className="bg-white rounded-xl shadow-lg border overflow-hidden max-w-sm mx-auto">
                <div className="bg-gray-100 border-b px-3 py-2">
                  <span className="text-sm font-medium">{frozenApps[0]?.name ?? "Notes"}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-green-700 sim-dark:text-green-400 mb-2">{frozenApps[0]?.name ?? "Notes"} is working normally again.</p>
                  <textarea
                    value={typedInApp}
                    onChange={(e) => {
                      setTypedInApp(e.target.value);
                      if (!appTyped && e.target.value.length > 0) {
                        setAppTyped(true);
                        tryStep((s) => s.action === "type-in-app");
                      }
                    }}
                    placeholder="Type something here..."
                    className={`w-full h-24 p-2 text-sm border border-gray-500 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${hl("notes-input") ? pulse : ""}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* App-Reinstall mode — broken app desktop */}
          {view === "desktop" && mode === "app-reinstall" && (
            <div className="p-4 text-center py-6">
              {!arBrowserFresh ? (
                <>
                  <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
                  <p className="text-sm font-medium text-gray-600">{arBrokenTarget} keeps crashing.</p>
                  <p className="text-xs text-gray-500 sim-dark:text-gray-400 mt-1">Open App Market from the dock to fix it.</p>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
                  <p className="text-sm font-medium text-green-700">{arBrokenTarget} is working again!</p>
                  <p className="text-xs text-gray-500 sim-dark:text-gray-400 mt-1">The fresh install fixed the problem.</p>
                </>
              )}
            </div>
          )}

          {/* App-Reinstall mode — App Market panel */}
          {view === "app-market" && mode === "app-reinstall" && (
            <div className="h-full flex flex-col bg-white">
              <div className="bg-gray-100 border-b px-4 py-2.5 flex items-center">
                <button onClick={() => setView("desktop")} className="text-gray-500 sim-dark:text-gray-400 hover:text-gray-600 mr-2 text-lg">&larr;</button>
                <span className="text-sm font-semibold text-gray-700">App Market</span>
              </div>
              <div className="flex border-b">
                <button
                  onClick={handleGoToMyApps}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${arMarketTab === "my-apps" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"} ${hl("my-apps-tab") ? pulse + " rounded" : ""}`}
                >
                  My Apps
                </button>
                <button
                  onClick={handleGoToStoreTab}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${arMarketTab === "store" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"} ${hl("store-tab") ? pulse + " rounded" : ""}`}
                >
                  Store
                </button>
              </div>
              {arMarketTab === "my-apps" && (
                <div className="p-3 flex-1">
                  {!arAppDeleted ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2">
                        <GlobeIcon size={20} />
                        <div>
                          <span className="text-sm font-medium">{arBrokenTarget}</span>
                          <span className="text-xs text-red-700 sim-dark:text-red-400 block">Not working</span>
                        </div>
                      </div>
                      <button
                        onClick={handleDeleteBrokenApp}
                        className={`px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium ${hl("delete-app-btn") ? pulse : ""}`}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 sim-dark:text-gray-400 text-center py-6">No apps installed. Go to Store to reinstall.</p>
                  )}
                </div>
              )}
              {arMarketTab === "store" && (
                <div className="p-3 flex-1">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <GlobeIcon size={20} />
                      <span className="text-sm font-medium">{arBrokenTarget}</span>
                    </div>
                    {!arAppInstalled ? (
                      <button
                        onClick={handleReinstallApp}
                        className={`px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium ${hl("install-btn") ? pulse : ""}`}
                      >
                        Install
                      </button>
                    ) : (
                      <span className="text-xs text-green-700 sim-dark:text-green-400 font-semibold">Installed ✓</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error-Restart: system error dialog */}
          {mode === "error-restart" && erSystemError && (
            <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs text-center">
                <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-amber-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
                <h3 className="font-bold text-base mb-1">Something went wrong</h3>
                <p className="text-xs text-gray-500 mb-4">Restarting your computer usually fixes this.</p>
                <button
                  onClick={handleErDismiss}
                  className={`w-full py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 ${hl("er-dismiss") ? pulse : ""}`}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Error-Restart: desktop after dismissal */}
          {mode === "error-restart" && !erSystemError && !erSettingsOpen && !erRestarting && !erRestarted && (
            <div className="p-4 text-center py-8">
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-amber-400 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
              <p className="text-sm text-gray-600">Open Settings from the dock to restart.</p>
            </div>
          )}

          {/* Error-Restart: the same Settings app again, opened on About where Restart lives. */}
          {mode === "error-restart" && erSettingsOpen && !erRestarting && !erRestarted && (
            <DraggableWindow
              title="Settings"
              icon={<GearIcon size={16} />}
              initial={{ x: 24, y: 16, w: 560, h: 400 }}
              fit
              onClose={() => setErSettingsOpen(false)}
              onMinimize={() => setErSettingsOpen(false)}
            >
              <SettingsApp
                initialSection="about"
                onRestart={handleErClickRestart}
                highlightRestart={hl("restart-btn")}
              />
            </DraggableWindow>
          )}

          {/* Error-Restart: confirm dialog */}
          {mode === "error-restart" && erRestartConfirm && (
            <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs text-center">
                <h3 className="font-bold text-base mb-1">Restart your computer?</h3>
                <p className="text-xs text-gray-500 mb-4">All unsaved work will be lost.</p>
                <div className="flex gap-2">
                  <button onClick={() => setErRestartConfirm(false)} className="flex-1 py-2 border border-gray-500 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={handleErConfirmRestart}
                    className={`flex-1 py-2 bg-amber-700 text-white font-medium rounded-xl hover:bg-amber-800 ${hl("confirm-btn") ? pulse : ""}`}
                  >
                    Restart
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error-Restart: black screen animation */}
          {mode === "error-restart" && erRestarting && (
            <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Error-Restart: back to desktop, error gone */}
          {mode === "error-restart" && erRestarted && (
            <div className="p-4 text-center py-8">
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
              <p className="text-sm font-medium text-green-700">Your computer restarted successfully.</p>
              <p className="text-xs text-gray-500 sim-dark:text-gray-400 mt-1">The error is gone.</p>
            </div>
          )}
        </div>

        {/* Dock */}
        <div className="shrink-0 flex items-center justify-center px-2 py-2">
          <Dock
            size="md"
            items={ALL_DOCK_APPS.map((app) => ({
              id: app.id,
              label: app.label,
              highlighted: hl("dock-app", app.id),
            }))}
            onOpen={(id) => {
              if (mode === "public-wifi" && id === "Settings") {
                handleOpenSettingsPrivacy();
              } else if (mode === "public-wifi" && id === "Browser") {
                setPrivacyOpen(false);
                setPortalWinOpen(true);
              } else if (mode === "password-reset" && id === "Mail") {
                handleOpenMailFromDock();
              } else if (mode === "password-reset" && id === "Browser") {
                setPrApp("browser");
              } else if (mode === "app-reinstall" && id === "App Market") {
                handleOpenAppMarket();
              } else if (mode === "error-code" && id === "Browser") {
                handleOpenBrowser();
              } else if (mode === "error-restart" && id === "Settings") {
                handleErOpenSettings();
              } else if (scenarioIds.has(id) && wantsRestart(id)) {
                handleRestartApp(id);
              } else {
                setFreeApp(toAppBodyId(id));
              }
            }}
          />
        </div>
      </div>
    </SimulatorFrame>
  );
}
