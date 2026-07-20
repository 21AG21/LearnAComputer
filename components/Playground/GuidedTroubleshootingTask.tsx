"use client";

import { useState, useEffect, type ReactNode } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { GlobeIcon, MailIcon, GearIcon, CameraIcon, NoteIcon, SmartphoneIcon } from "./Icons";

export type GuidedTroubleshootingStep = {
  say: string;
  action:
    | "read-error" | "click-frozen" | "open-force-quit" | "force-quit" | "restart-app"
    | "open-wifi-panel" | "toggle-wifi" | "reconnect-wifi" | "forget-network"
    | "copy-code" | "open-browser" | "paste-code" | "submit-support";
  target?: string;
  value?: string;
};

interface Props {
  goal: string;
  scenario: string;
  steps: GuidedTroubleshootingStep[];
  onResult: (success: boolean) => void;
}

type View = "desktop" | "force-quit" | "browser-support";

interface FrozenApp {
  name: string;
  frozen: boolean;
  closed: boolean;
}

function inferMode(steps: GuidedTroubleshootingStep[]): "frozen" | "wifi" | "error-code" {
  if (steps.some((s) => s.action === "force-quit" || s.action === "click-frozen")) return "frozen";
  if (steps.some((s) => s.action === "copy-code" || s.action === "paste-code")) return "error-code";
  return "wifi";
}

const NETWORKS = ["CoolKids Network", "Neighbor's WiFi", "Coffee Shop"];

export default function GuidedTroubleshootingTask({ goal, scenario, steps, onResult }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  const mode = inferMode(steps);

  const [view, setView] = useState<View>("desktop");
  const [frozenApps, setFrozenApps] = useState<FrozenApp[]>(() => {
    if (mode !== "frozen") return [];
    const target = steps.find((s) => s.action === "force-quit")?.target ?? "Notes";
    return [{ name: target, frozen: true, closed: false }];
  });
  const [clickedFrozen, setClickedFrozen] = useState(false);
  const [wifiPanelOpen, setWifiPanelOpen] = useState(false);
  const [wifiOn, setWifiOn] = useState(() => mode === "wifi" ? false : true);
  const [connectedNetwork, setConnectedNetwork] = useState<string | null>(() => mode === "wifi" ? null : "CoolKids Network");
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

  const [time, setTime] = useState("11:15 am");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  const step = steps[stepIndex];

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
    if (done || !step) return false;
    switch (step.action) {
      case "read-error": return kind === "error-dismiss";
      case "click-frozen": return kind === "frozen-window";
      case "open-force-quit": return kind === "system-menu";
      case "force-quit": return kind === "fq-btn" && name === step.target;
      case "restart-app": return kind === "dock-app" && name === step.target;
      case "open-wifi-panel": return kind === "wifi-icon";
      case "toggle-wifi": return kind === "wifi-toggle";
      case "reconnect-wifi": return kind === "reconnect-btn";
      case "forget-network": return kind === "forget-btn" && name === step.target;
      case "copy-code": return kind === "copy-btn";
      case "open-browser": return kind === "dock-app" && name === "Browser";
      case "paste-code": return kind === "paste-input";
      case "submit-support": return kind === "submit-btn";
      default: return false;
    }
  }

  const pulse = "ring-2 ring-yellow-400 animate-pulse";
  const frozenTarget = frozenApps.find((a) => a.frozen && !a.closed);

  function handleClickFrozen() {
    setClickedFrozen(true);
    if (step?.action === "click-frozen") completeStep();
  }

  function handleOpenForceQuit() {
    setView("force-quit");
    if (step?.action === "open-force-quit") completeStep();
  }

  function handleForceQuit(name: string) {
    setFrozenApps((prev) => prev.map((a) => a.name === name ? { ...a, closed: true, frozen: false } : a));
    setView("desktop");
    if (step?.action === "force-quit" && step.target === name) completeStep();
  }

  function handleRestartApp(name: string) {
    if (mode === "error-code") {
      setAppReopened(true);
    } else {
      setFrozenApps((prev) => prev.map((a) => a.name === name ? { ...a, closed: false, frozen: false } : a));
    }
    if (step?.action === "restart-app" && step.target === name) completeStep();
  }

  function handleOpenWifiPanel() {
    setWifiPanelOpen(true);
    if (step?.action === "open-wifi-panel") completeStep();
  }

  function handleToggleWifi() {
    const newVal = !wifiOn;
    setWifiOn(newVal);
    if (!newVal) setConnectedNetwork(null);
    if (step?.action === "toggle-wifi") completeStep();
  }

  function handleReconnect(network: string) {
    if (searchingNetwork) return;
    setSearchingNetwork(network);
    setTimeout(() => {
      setConnectedNetwork(network === "CoolKids Network" ? network : null);
      setSearchingNetwork(null);
      if (step?.action === "reconnect-wifi" && network === "CoolKids Network") completeStep();
    }, 1500);
  }

  function handleForgetNetwork(name: string) {
    setForgottenNetworks((prev) => [...prev, name]);
    if (connectedNetwork === name) setConnectedNetwork(null);
    if (step?.action === "forget-network" && step.target === name) completeStep();
  }

  function handleDismissError() {
    setErrorDismissed(true);
    if (step?.action === "read-error") completeStep();
  }

  function handleCopyCode() {
    setCodeCopied(true);
    if (step?.action === "copy-code") completeStep();
  }

  function handleOpenBrowser() {
    setView("browser-support");
    if (step?.action === "open-browser") completeStep();
  }

  function handlePasteCode() {
    setPastedCode(errorCode);
    if (step?.action === "paste-code") completeStep();
  }

  function handleSubmitSupport() {
    setSupportSubmitted(true);
    if (step?.action === "submit-support") completeStep();
  }

  const dockApps = (() => {
    if (mode === "error-code") return [{ id: "Photos", label: "Photos" }, { id: "Browser", label: "Browser" }, { id: "Notes", label: "Notes" }];
    if (mode === "wifi") return [{ id: "Browser", label: "Browser" }, { id: "Mail", label: "Mail" }, { id: "Settings", label: "Settings" }];
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
              {view === "browser-support" ? "Browser" : view === "force-quit" ? "Force Quit" : "Desktop"}
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
                {NETWORKS.filter((n) => !forgottenNetworks.includes(n)).map((network) => (
                  <div key={network} className={`flex items-center justify-between p-2 rounded-lg text-xs ${connectedNetwork === network ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}>
                    <span className="flex items-center gap-1.5">
                      {connectedNetwork === network && <span className="text-blue-500">&#10003;</span>}
                      {searchingNetwork === network && <span className="animate-spin text-gray-400">&#9696;</span>}
                      {network}
                    </span>
                    <div className="flex gap-1">
                      {connectedNetwork !== network && !searchingNetwork && (
                        <button
                          onClick={() => handleReconnect(network)}
                          className={`px-1.5 py-0.5 bg-blue-500 text-white rounded text-[10px] ${hl("reconnect-btn") ? pulse : ""}`}
                        >
                          Join
                        </button>
                      )}
                      <button
                        onClick={() => handleForgetNetwork(network)}
                        className={`px-1.5 py-0.5 text-gray-500 hover:text-red-500 text-[10px] ${hl("forget-btn", network) ? pulse : ""}`}
                      >
                        Forget
                      </button>
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
        </div>

        {/* Dock */}
        <div className="h-14 shrink-0 flex items-center justify-center gap-3 bg-white/80 backdrop-blur border-t border-gray-200 px-4">
          {dockApps.map((app) => {
            const isTarget = hl("dock-app", app.id);
            const appIconMap: Record<string, ReactNode> = {
              Browser: <GlobeIcon size={24} />, Mail: <MailIcon size={24} />, Settings: <GearIcon size={24} />,
              Photos: <CameraIcon size={24} />, Notes: <NoteIcon size={24} />,
            };
            const appIcon = appIconMap[app.id] ?? <SmartphoneIcon size={24} />;
            return (
              <button
                key={app.id}
                onClick={() => {
                  if (step?.action === "open-browser" && app.id === "Browser") {
                    handleOpenBrowser();
                  } else {
                    handleRestartApp(app.id);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all hover:bg-gray-100 ${isTarget ? pulse : ""}`}
                aria-label={app.label}
              >
                <span className="text-gray-600">{appIcon}</span>
                <span className="text-[10px] text-gray-500">{app.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SimulatorFrame>
  );
}
