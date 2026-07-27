"use client";

import { useState, useEffect } from "react";
import SimulatorFrame from "./SimulatorFrame";
import Dock from "./Dock";
import { useStepRunner, type SimMode } from "./useStepRunner";
import { GlobeIcon, MailIcon, GearIcon } from "./Icons";

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

type View = "desktop" | "force-quit" | "browser-support" | "app-market";

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
const PUBLIC_NETWORKS = ["Coffee Shop Free WiFi", "CoffeeShop-Staff", "Neighbour 5G"];

export default function GuidedTroubleshootingTask({ goal, scenario, steps, mode: simMode, hint, onResult }: Props) {

  const mode = inferScenarioMode(steps);

  const [view, setView] = useState<View>("desktop");
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
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [trackingOn, setTrackingOn] = useState(true);

  // password-reset state
  const [prStage, setPrStage] = useState<"login" | "sent" | "mail" | "email" | "reset" | "done">("login");
  const [prApp, setPrApp] = useState<"browser" | "mail">("browser");
  const [prPassword, setPrPassword] = useState("");
  const [forgottenNetworks, setForgottenNetworks] = useState<string[]>([]);
  const [searchingNetwork, setSearchingNetwork] = useState<string | null>(null);

  const [errorCode, setErrorCode] = useState(() => {
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
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
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
    setFrozenApps((prev) => prev.map((a) => a.name === name ? { ...a, closed: true, frozen: false } : a));
    setView("desktop");
    tryStep((s) => s.action === "force-quit" && s.target === name);
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
    setSearchingNetwork(network);
    setTimeout(() => {
      setSearchingNetwork(null);
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

  function handleToggleTracking() {
    setTrackingOn((v) => !v);
    tryStep((s) => s.action === "toggle-privacy-tracking");
  }

  function handleForgotPasswordLink() {
    setPrStage("sent");
    tryStep((s) => s.action === "click-forgot-link");
  }

  function handleOpenMailFromDock() {
    setPrApp("mail");
    setPrStage("mail");
    tryStep((s) => s.action === "open-mail-from-dock");
  }

  function handleOpenPrResetEmail() {
    setPrStage("email");
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
    setSearchingNetwork(network);
    setTimeout(() => {
      setConnectedNetwork(network === "CoolKids Network" ? network : null);
      setSearchingNetwork(null);
      tryStep((s) => s.action === "reconnect-wifi" && network === "CoolKids Network");
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
    setView("browser-support");
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

  const dockApps = (() => {
    if (mode === "error-restart") return [{ id: "Settings", label: "Settings" }];
    if (mode === "error-code") return [{ id: "Photos", label: "Photos" }, { id: "Browser", label: "Browser" }, { id: "Notes", label: "Notes" }];
    if (mode === "wifi") return [{ id: "Browser", label: "Browser" }, { id: "Mail", label: "Mail" }, { id: "Settings", label: "Settings" }];
    if (mode === "public-wifi") return [{ id: "Browser", label: "Browser" }, { id: "Settings", label: "Settings" }];
    if (mode === "password-reset") return [{ id: "Browser", label: "Browser" }, { id: "Mail", label: "Mail" }];
    if (mode === "app-reinstall") {
      const market = { id: "App Market", label: "App Market" };
      if (arAppDeleted && !arAppInstalled) return [market];
      return [{ id: arBrokenTarget, label: arBrokenTarget }, market];
    }
    const frozen = frozenTarget?.name ?? "Notes";
    const base = [{ id: "Browser", label: "Browser" }, { id: "Mail", label: "Mail" }];
    if (base.some((a) => a.id === frozen)) return base;
    return [{ id: frozen, label: frozen }, ...base];
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
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
        {/* Menu Bar */}
        <div className="h-8 shrink-0 flex items-center justify-between px-3 bg-white border-b border-gray-200 text-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenForceQuit}
              className={`font-semibold text-gray-700 hover:text-gray-900 ${hl("system-menu") ? pulse + " rounded px-1" : ""}`}
              title="System menu"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4 inline" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
            </button>
            <span className="text-gray-500 font-medium text-xs">
              {view === "browser-support" ? "Browser" : view === "force-quit" ? "Force Quit" : view === "app-market" ? "App Market" : "Desktop"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button
              onClick={handleOpenWifiPanel}
              className={`${hl("wifi-icon") ? pulse + " rounded px-1" : ""}`}
              title="WiFi"
            >
              {wifiOn && connectedNetwork ? (
                <svg viewBox="0 0 20 16" className="w-5 h-4" fill="currentColor"><path d="M10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4.3a5 5 0 017 0l-1 1.1a3.3 3.3 0 00-5 0l-1-1.1zm-2.8-2.8a8.3 8.3 0 0112.6 0l-1 1a7 7 0 00-10.6 0l-1-1z"/></svg>
              ) : (
                <svg viewBox="0 0 20 16" className="w-5 h-4" fill="currentColor" opacity={0.3}><path d="M10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4.3a5 5 0 017 0l-1 1.1a3.3 3.3 0 00-5 0l-1-1.1zm-2.8-2.8a8.3 8.3 0 0112.6 0l-1 1a7 7 0 00-10.6 0l-1-1z"/><line x1="2" y1="2" x2="18" y2="14" stroke="currentColor" strokeWidth="2"/></svg>
              )}
            </button>
            <span>{time}</span>
          </div>
        </div>

        {/* WiFi Panel Dropdown */}
        {wifiPanelOpen && (
          <div className="absolute top-8 right-3 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">WiFi</span>
              <button
                onClick={handleToggleWifi}
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
                      {connectedNetwork === network && <span className="text-blue-500">&#10003;</span>}
                      {searchingNetwork === network && <span className="animate-spin text-gray-400">&#9696;</span>}
                      {network}
                    </span>
                    <div className="flex gap-1">
                      {connectedNetwork !== network && !searchingNetwork && (
                        <button
                          onClick={() => (mode === "public-wifi" ? handleJoinNetwork(network) : handleReconnect(network))}
                          className={`px-1.5 py-0.5 bg-blue-500 text-white rounded text-[10px] ${
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
                {forgottenNetworks.includes("CoolKids Network") && !connectedNetwork && (
                  <button
                    onClick={() => handleReconnect("CoolKids Network")}
                    className={`w-full py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${hl("reconnect-btn") ? pulse : ""}`}
                  >
                    Reconnect to CoolKids Network
                  </button>
                )}
              </div>
            )}
            {!wifiOn && <p className="text-xs text-gray-400 text-center py-2">WiFi is off</p>}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative">
          {/* Error Dialog Overlay */}
          {mode === "error-code" && !errorDismissed && (
            <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs">
                <div className="text-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-red-500" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
                </div>
                <h3 className="font-bold text-base text-center mb-1">{errorApp} can&apos;t open</h3>
                <p className="text-xs text-gray-500 text-center mb-3">An unexpected error occurred.</p>
                <div className={`flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2 mb-3 ${hl("copy-btn") ? pulse : ""}`}>
                  <code className="text-sm font-mono font-bold text-red-600 select-all">{errorCode}</code>
                  <button
                    onClick={handleCopyCode}
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded font-medium"
                  >
                    {codeCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={handleDismissError}
                  className={`w-full py-2 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 ${hl("error-dismiss") ? pulse : ""}`}
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
                        {app.frozen && <span className="text-xs text-red-500 ml-1.5">(Not Responding)</span>}
                      </span>
                      <button
                        onClick={() => handleForceQuit(app.name)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg ${app.frozen ? "bg-red-500 text-white hover:bg-red-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"} ${hl("fq-btn", app.name) ? pulse : ""}`}
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

          {/* Browser Support Page */}
          {view === "browser-support" && (
            <div className="h-full flex flex-col bg-white">
              <div className="bg-gray-100 border-b px-3 py-2 flex items-center gap-2">
                <div className="flex-1 bg-white border rounded-lg px-3 py-1.5 text-xs text-gray-500">
                  support.example/help
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <h2 className="text-base font-bold mb-1">Computer Support</h2>
                <p className="text-xs text-gray-500 mb-4">Paste your error code below and we&apos;ll help you fix it.</p>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Error code</label>
                  <div className="flex gap-2">
                    <input
                      value={pastedCode}
                      readOnly
                      placeholder="Paste error code here..."
                      className={`flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50 ${hl("paste-input") ? pulse : ""}`}
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
                    className={`w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 ${hl("submit-btn") ? pulse : ""}`}
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
          )}

          {/* Desktop View - Frozen App Window */}
          {/* Public WiFi — browser goes offline → café portal → online, then Settings ▸ Privacy */}
          {view === "desktop" && mode === "public-wifi" && !privacyOpen && (
            <div className="p-4">
              {portalStage === "offline" && (
                <div className="py-10 text-center">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 005 8.26m2.28 4.14a7 7 0 019.5 0M8.53 16.11a3.5 3.5 0 014.95 0M12 20h.01"/>
                  </svg>
                  <p className="text-sm font-medium text-gray-500 mb-1">You are not connected to the internet</p>
                  <p className="text-xs text-gray-400">There is a café network nearby. The WiFi icon is in the bar above.</p>
                </div>
              )}

              {portalStage === "portal" && (
                <div className="max-w-md mx-auto border-2 border-gray-200 rounded-xl overflow-hidden">
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
                  <p className="text-sm font-medium text-green-600 mb-1">Connected to Coffee Shop Free WiFi</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    You are online — but this is somebody else&apos;s network. Tighten your privacy settings before you browse.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Public WiFi — the Privacy settings page */}
          {view === "desktop" && mode === "public-wifi" && privacyOpen && (
            <div className="p-4">
              <div className="max-w-md mx-auto border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-100 border-b-2 border-gray-200 px-4 py-2 flex items-center gap-2">
                  <GearIcon size={16} />
                  <span className="font-bold text-sm">Settings</span>
                  <span className="text-xs text-gray-500">/ Privacy</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold">Allow websites to track me across sites</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        On a network you do not control, turn this off.
                      </p>
                    </div>
                    <button
                      onClick={handleToggleTracking}
                      role="switch"
                      aria-checked={trackingOn}
                      aria-label="Allow websites to track me across sites"
                      className={`shrink-0 w-12 h-7 rounded-full transition-colors ${trackingOn ? "bg-blue-500" : "bg-gray-300"} ${hl("privacy-toggle") ? pulse : ""}`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${trackingOn ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  {!trackingOn && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 mt-3">
                      Tracking is off. Sites can still see what you visit on their own pages, but they can no longer follow
                      you from one site to the next.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Password reset — browser login ▸ Mail ▸ back to the browser */}
          {view === "desktop" && mode === "password-reset" && (
            <div className="p-4">
              {prApp === "mail" ? (
                <div className="max-w-md mx-auto border-2 border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 border-b-2 border-gray-200 px-4 py-2 flex items-center gap-2">
                    <MailIcon size={16} />
                    <span className="font-bold text-sm">Mail</span>
                    <span className="text-xs text-gray-500">/ Inbox</span>
                  </div>
                  {prStage === "mail" ? (
                    <button
                      onClick={handleOpenPrResetEmail}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${hl("reset-email-row") ? pulse : ""}`}
                    >
                      <p className="text-sm font-semibold">First National Bank</p>
                      <p className="text-xs text-gray-600">Reset your password</p>
                      <p className="text-[10px] text-gray-400">Just now</p>
                    </button>
                  ) : (
                    <div className="p-4">
                      <h3 className="font-bold text-sm mb-0.5">Reset your password</h3>
                      <p className="text-xs text-gray-500 mb-3">From First National Bank · Just now</p>
                      <p className="text-sm mb-4">
                        We received a request to reset the password for your account. Use the button below within one hour.
                        If this was not you, you can ignore this message.
                      </p>
                      <button
                        onClick={handleClickPrResetLink}
                        className={`px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 ${hl("reset-email-link") ? pulse : ""}`}
                      >
                        Reset my password
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-sm mx-auto border-2 border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 border-b-2 border-gray-200 px-4 py-2 flex items-center gap-2">
                    <GlobeIcon size={16} />
                    <span className="font-mono text-xs text-gray-600">firstbank.example</span>
                  </div>
                  <div className="p-4">
                    {prStage === "login" && (
                      <>
                        <h3 className="font-bold text-base mb-3 text-center">Sign in</h3>
                        <input readOnly value="you@example.com" aria-label="Email" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 bg-gray-50" />
                        <input readOnly type="password" value="......" aria-label="Password" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 bg-gray-50" />
                        <p className="text-xs text-red-600 mb-3">That password is not right.</p>
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
                        <MailIcon size={32} className="mx-auto text-blue-500 mb-2" />
                        <p className="text-sm font-semibold mb-1">Check your email</p>
                        <p className="text-xs text-gray-500">
                          We sent a reset link to you@example.com. Open the Mail app in the dock below to read it.
                        </p>
                      </div>
                    )}
                    {prStage === "reset" && (
                      <>
                        <h3 className="font-bold text-base mb-1 text-center">Choose a new password</h3>
                        <p className="text-[10px] text-gray-400 font-mono mb-3 text-center truncate">firstbank.example/reset?token=abc123</p>
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
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2 text-2xl">&#10003;</div>
                        <p className="text-sm font-semibold mb-0.5">Signed in as you@example.com</p>
                        <p className="text-xs text-gray-500">First National Bank · Personal account</p>
                        <p className="text-xs text-gray-400 mt-2">Your new password is saved. Keep it in a password manager.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "desktop" && mode === "frozen" && (
            <div className="p-4">
              {frozenTarget && !frozenTarget.closed && (
                <div
                  onClick={handleClickFrozen}
                  className={`bg-white rounded-xl shadow-lg border overflow-hidden max-w-sm mx-auto cursor-pointer ${hl("frozen-window") ? pulse : ""}`}
                >
                  <div className="bg-gray-100 border-b px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">{frozenTarget.name} (Not Responding)</span>
                    <span className="text-xs text-red-500 animate-spin">&#9696;</span>
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
                  <p className="text-xs text-gray-400 mt-1">Click {frozenTarget.name} in the dock below to reopen it.</p>
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
                    <p className="text-xs text-green-600 mt-3">{frozenTarget?.name} is working normally again.</p>
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
                  <p className="text-xs text-gray-400">Click the WiFi icon in the menu bar to fix this.</p>
                </div>
              ) : (
                <div className="py-8">
                  <svg viewBox="0 0 20 16" className="w-16 h-12 mx-auto text-blue-500 mb-3" fill="currentColor">
                    <path d="M10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4.3a5 5 0 017 0l-1 1.1a3.3 3.3 0 00-5 0l-1-1.1zm-2.8-2.8a8.3 8.3 0 0112.6 0l-1 1a7 7 0 00-10.6 0l-1-1z"/>
                  </svg>
                  <p className="text-sm font-medium text-green-600 mb-1">Connected to {connectedNetwork}</p>
                  <p className="text-xs text-gray-400">Your internet is working.</p>
                </div>
              )}
            </div>
          )}

          {/* Desktop View - Error Code Mode (after error dismissed) */}
          {view === "desktop" && mode === "error-code" && errorDismissed && !appReopened && (
            <div className="p-4 text-center py-8">
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
              <p className="text-sm text-gray-600 mb-1">{errorApp} crashed with error <code className="font-mono font-bold text-red-600">{errorCode}</code></p>
              {codeCopied && <p className="text-xs text-green-600">Error code copied to clipboard.</p>}
            </div>
          )}
          {view === "desktop" && mode === "error-code" && appReopened && (
            <div className="p-4 text-center py-8">
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
              <p className="text-sm text-green-600 font-medium">{errorApp} is working again!</p>
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
                  <p className="text-xs text-green-600 mb-2">{frozenApps[0]?.name ?? "Notes"} is working normally again.</p>
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
                    className={`w-full h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${hl("notes-input") ? pulse : ""}`}
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
                  <p className="text-xs text-gray-400 mt-1">Open App Market from the dock to fix it.</p>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
                  <p className="text-sm font-medium text-green-700">{arBrokenTarget} is working again!</p>
                  <p className="text-xs text-gray-400 mt-1">The fresh install fixed the problem.</p>
                </>
              )}
            </div>
          )}

          {/* App-Reinstall mode — App Market panel */}
          {view === "app-market" && mode === "app-reinstall" && (
            <div className="h-full flex flex-col bg-white">
              <div className="bg-gray-100 border-b px-4 py-2.5 flex items-center">
                <button onClick={() => setView("desktop")} className="text-gray-400 hover:text-gray-600 mr-2 text-lg">&larr;</button>
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
                          <span className="text-xs text-red-500 block">Not working</span>
                        </div>
                      </div>
                      <button
                        onClick={handleDeleteBrokenApp}
                        className={`px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium ${hl("delete-app-btn") ? pulse : ""}`}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6">No apps installed. Go to Store to reinstall.</p>
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
                        className={`px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium ${hl("install-btn") ? pulse : ""}`}
                      >
                        Install
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-semibold">Installed ✓</span>
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
                  className={`w-full py-2 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 ${hl("er-dismiss") ? pulse : ""}`}
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

          {/* Error-Restart: Settings panel */}
          {mode === "error-restart" && erSettingsOpen && !erRestarting && !erRestarted && (
            <div className="h-full bg-white">
              <div className="bg-gray-100 border-b px-4 py-2.5 flex items-center">
                <button onClick={() => setErSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 mr-2">&larr;</button>
                <span className="text-sm font-semibold text-gray-700">Settings</span>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">About</h3>
                <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 text-sm">
                  <div className="flex justify-between px-4 py-2.5 text-gray-500"><span>Computer Name</span><span>My Computer</span></div>
                  <div className="flex justify-between px-4 py-2.5 text-gray-500"><span>Software Version</span><span>14.2.1</span></div>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 pt-2">System</h3>
                <div className="bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  <button
                    onClick={handleErClickRestart}
                    className={`w-full flex items-center justify-between px-4 py-3 text-amber-600 font-medium hover:bg-amber-50 rounded-xl ${hl("restart-btn") ? pulse : ""}`}
                  >
                    <span>Restart</span>
                    <span>&rsaquo;</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 px-1">Restarting will close all open apps and reload your computer.</p>
              </div>
            </div>
          )}

          {/* Error-Restart: confirm dialog */}
          {mode === "error-restart" && erRestartConfirm && (
            <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs text-center">
                <h3 className="font-bold text-base mb-1">Restart your computer?</h3>
                <p className="text-xs text-gray-500 mb-4">All unsaved work will be lost.</p>
                <div className="flex gap-2">
                  <button onClick={() => setErRestartConfirm(false)} className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={handleErConfirmRestart}
                    className={`flex-1 py-2 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 ${hl("confirm-btn") ? pulse : ""}`}
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
              <p className="text-xs text-gray-400 mt-1">The error is gone.</p>
            </div>
          )}
        </div>

        {/* Dock */}
        <div className="shrink-0 flex items-center justify-center px-4 py-2">
          <Dock
            size="sm"
            items={dockApps.map((app) => ({
              id: app.id,
              label: app.label,
              highlighted: hl("dock-app", app.id),
            }))}
            onOpen={(id) => {
              if (mode === "public-wifi" && id === "Settings") {
                handleOpenSettingsPrivacy();
              } else if (mode === "public-wifi" && id === "Browser") {
                setPrivacyOpen(false);
              } else if (mode === "password-reset" && id === "Mail") {
                handleOpenMailFromDock();
              } else if (mode === "password-reset" && id === "Browser") {
                setPrApp("browser");
              } else if (mode === "app-reinstall" && id === "App Market") {
                handleOpenAppMarket();
              } else if (step?.action === "open-browser" && id === "Browser") {
                handleOpenBrowser();
              } else if (mode === "error-restart" && id === "Settings") {
                handleErOpenSettings();
              } else {
                handleRestartApp(id);
              }
            }}
          />
        </div>
      </div>
    </SimulatorFrame>
  );
}
