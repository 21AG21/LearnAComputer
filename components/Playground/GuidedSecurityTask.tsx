"use client";

import { useState, type ReactNode } from "react";
import { useIsPhone } from "./SimFormFactor";
import SimulatorFrame from "./SimulatorFrame";
import { useStepRunner, type SimMode } from "./useStepRunner";
import { KeyIcon, FishingIcon, ShieldIcon, CheckCircleIcon, XCircleIcon, LinkIcon, MailIcon, FingerprintIcon } from "./Icons";

export type GuidedSecurityStep = {
  say: string;
  action:
    | "type-password" | "type-username" | "type-login-password"
    | "login" | "use-passkey" | "forgot-link" | "open-reset-email" | "click-reset-link"
    | "enter-2fa-code" | "verify-2fa" | "inspect-link" | "mark-safe"
    | "mark-dangerous" | "toggle-setting" | "go-to-section";
  target?: string;
  value?: string;
  minStrength?: number;
};

interface GuidedSecurityTaskProps {
  goal: string;
  steps: GuidedSecurityStep[];
  mode?: SimMode;
  hint?: string;
  /** Mirrors the lesson's `chrome`, so the phishing section can present links the way they really arrive. */
  chrome?: "browser" | "settings" | "mail" | "messages" | "bare";
  onResult: (success: boolean) => void;
}

type Section = "password-tester" | "login" | "2fa" | "phishing" | "privacy";

interface PhishingItem {
  url: string;
  safe: boolean;
  reason: string;
  /** Who it claims to be from. */
  from: string;
  /** Subject line in Mail; ignored in Messages, where texts have no subject. */
  subject: string;
  when: string;
  /** The message body, with {link} marking where the link sits in the sentence. */
  body: string;
}

const PHISHING_LINK_DATA: Record<string, PhishingItem> = {
  "Verify your account": {
    url: "bank-secure-login.fakesite.ru", safe: false,
    reason: "The URL ends in .fakesite.ru — real banks use their own domain, not a random Russian site.",
    from: "First National Bank Security", subject: "Unusual activity — action required", when: "8:04 am",
    body: "We detected a sign-in from a new device. Your account will be locked in 24 hours unless you confirm it was you. {link}",
  },
  "View your order": {
    url: "amazon.com/orders", safe: true,
    reason: "This goes to amazon.com — the real Amazon website.",
    from: "Amazon", subject: "Your order has shipped", when: "Yesterday",
    body: "Good news — order #38291 is on its way and should arrive tomorrow. {link}",
  },
  "Free WiFi Login": {
    url: "http://free-wifi-portal.net", safe: false,
    reason: "This uses http:// (not secure) and goes to an unknown site that could steal your info.",
    from: "+1 (555) 0142", subject: "Free WiFi", when: "Just now",
    body: "You are near a free hotspot! Sign in here to get online: {link}",
  },
  "First National Bank Login": {
    url: "https://firstbank.example/login", safe: true,
    reason: "This goes to firstbank.example — your bank's own address, over https.",
    from: "First National Bank", subject: "Your monthly statement is ready", when: "Mon",
    body: "Your February statement is available. Sign in to view it: {link}",
  },
  "Complete Your Purchase": {
    url: "https://shop.example/checkout", safe: true,
    reason: "This goes to shop.example — a legitimate checkout page.",
    from: "Shop", subject: "You left something in your basket", when: "3h ago",
    body: "Your basket is still saved. Pick up where you left off: {link}",
  },
  "Claim 90% Discount NOW": {
    url: "http://deals-4u-cheap.xyz/buy", safe: false,
    reason: "Suspicious domain deals-4u-cheap.xyz, uses http://, and the \"90% discount NOW\" is a classic scam tactic.",
    from: "DEALS4U", subject: "90% OFF — TODAY ONLY!!!", when: "6:12 am",
    body: "Congratulations!!! You have been selected for a 90% discount on everything. Offer ends in one hour. {link}",
  },
  "Enter Card Details": {
    url: "http://sh0p-deals.xyz/pay", safe: false,
    reason: "The URL uses a zero instead of 'o' in 'sh0p' — scammers misspell real sites to trick you.",
    from: "Sh0p Deals", subject: "Payment failed — update your card", when: "11:47 pm",
    body: "We could not process your payment. Re-enter your card to avoid cancellation. {link}",
  },
};

function passwordStrength(pw: string): { label: string; level: number; color: string } {
  if (!pw) return { label: "—", level: 0, color: "bg-gray-200" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Very Weak", level: 1, color: "bg-red-500" };
  if (score === 2) return { label: "Weak", level: 2, color: "bg-orange-400" };
  if (score === 3) return { label: "Fair", level: 3, color: "bg-yellow-400" };
  if (score === 4) return { label: "Strong", level: 4, color: "bg-green-400" };
  return { label: "Very Strong", level: 5, color: "bg-green-600" };
}

function LoggedInPanel({ username, method, onSignOut }: { username: string; method: string; onSignOut: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 sim-dark:text-green-400 mx-auto mb-4">
          <CheckCircleIcon size={36} />
        </div>
        <h3 className="font-bold text-xl mb-1">Signed In</h3>
        <p className="text-sm text-gray-500 mb-1">{username || "drdigital@example.com"}</p>
        <p className="text-xs text-gray-500 sim-dark:text-gray-400 mb-6">Signed in with {method}</p>
        <div className="bg-gray-50 border rounded-xl p-4 text-left mb-6 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Account</span>
            <span className="font-medium">Dr. Digital</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium">Free</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Security</span>
            <span className="text-green-700 sim-dark:text-green-400 font-medium">Protected</span>
          </div>
        </div>
        <button onClick={onSignOut} className="w-full py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function GuidedSecurityTask({ goal, steps, mode, hint, chrome = "browser", onResult }: GuidedSecurityTaskProps) {
  const [loggedIn, setLoggedIn] = useState<{ username: string; method: string } | null>(null);
  const isPhone = useIsPhone();

  function inferSection(s: GuidedSecurityStep | undefined): Section {
    if (!s) return "password-tester";
    if (s.action === "go-to-section") return (s.target as Section) ?? "password-tester";
    if (s.action === "type-password") return "password-tester";
    if (s.action === "type-username" || s.action === "type-login-password" || s.action === "login" || s.action === "use-passkey" || s.action === "forgot-link") return "login";
    if (s.action === "inspect-link" || s.action === "mark-safe" || s.action === "mark-dangerous") return "phishing";
    if (s.action === "toggle-setting") return "privacy";
    return "password-tester";
  }
  const [section, setSection] = useState<Section>(inferSection(steps[0]));

  const [passwordInput, setPasswordInput] = useState("");
  const [username, setUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [passkeyScanning, setPasskeyScanning] = useState(false);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [resetView, setResetView] = useState<"none" | "sent" | "email" | "new-password">("none");

  // Any link the lesson asks about — whether to inspect it or to judge it — belongs on the list.
  const phishingLinks = [
    ...new Set(
      steps
        .filter((s) => ["inspect-link", "mark-safe", "mark-dangerous"].includes(s.action) && s.target)
        .map((s) => s.target as string),
    ),
  ];
  const [inspectedLink, setInspectedLink] = useState<string | null>(null);
  const [linkVerdicts, setLinkVerdicts] = useState<Record<string, "safe" | "dangerous">>({});
  const [wrongAnswer, setWrongAnswer] = useState<{ link: string; picked: string; reason: string } | null>(null);

  const [privacySettings, setPrivacySettings] = useState<Record<string, boolean>>({
    "Location": true,
    "Camera": true,
    "Microphone": true,
    "Ad Tracking": true,
    "Cookies": true,
  });

  const { step, stepIndex, finished, done, flash, tryStep, wants, objectives } =
    useStepRunner({ steps, mode, onResult });

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "go-to-section": return kind === "section-btn" && name === step.target;
      case "type-password": return kind === "pw-input";
      case "type-username": return kind === "username-input";
      case "type-login-password": return kind === "login-pw-input";
      case "login": return kind === "login-btn";
      case "use-passkey": return kind === "passkey-btn";
      case "forgot-link": return kind === "forgot-link";
      case "open-reset-email": return kind === "reset-email";
      case "click-reset-link": return kind === "reset-link";
      case "enter-2fa-code": return kind === "twofa-input";
      case "verify-2fa": return kind === "verify-btn";
      case "inspect-link": return kind === "link-reveal" && name === step.target;
      case "mark-safe":
      case "mark-dangerous":
        if (kind === "link-reveal") return openMessage !== step.target && name === step.target;
        if (kind === "inline-link") return openMessage === step.target && inspectedLink !== step.target;
        return inspectedLink === step.target && kind === (step.action === "mark-safe" ? "safe-btn" : "danger-btn");
      case "toggle-setting": return kind === "privacy-toggle" && name === step.target;
      default: return false;
    }
  }

  const pulse = "animate-ring-pulse";

  const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
    { id: "password-tester", label: "Passwords", icon: <KeyIcon size={14} /> },
    { id: "login", label: "Login", icon: <KeyIcon size={14} /> },
    { id: "phishing", label: "Phishing", icon: <FishingIcon size={14} /> },
    { id: "privacy", label: "Privacy", icon: <ShieldIcon size={14} /> },
  ];

  function handleGoToSection(target: Section) {
    setSection(target);
    if (target === "2fa") return;
    tryStep((s) => s.action === "go-to-section" && s.target === target);
  }

  function handleTypePassword(val: string) {
    setPasswordInput(val);
    tryStep((s) => {
      if (s.action !== "type-password") return false;
      if (s.minStrength !== undefined) return passwordStrength(val).level >= s.minStrength;
      return !!s.value && val === s.value;
    });
  }

  function handleLogin() {
    // 2FA is not reachable from the section tabs — signing in is what routes you there.
    if (steps.some((s) => s.action === "enter-2fa-code" || s.action === "verify-2fa")) {
      setSection("2fa");
    } else {
      setLoggedIn({ username, method: "password" });
    }
    tryStep((s) => s.action === "login");
  }

  function handlePasskey() {
    if (passkeyScanning || !wants((s) => s.action === "use-passkey")) return;
    setPasskeyScanning(true);
    setTimeout(() => {
      setPasskeyScanning(false);
      setPasskeyDone(true);
      setLoggedIn({ username, method: "passkey" });
      tryStep((s) => s.action === "use-passkey");
    }, 1800);
  }

  function handleForgotLink() {
    if (!wants((s) => s.action === "forgot-link")) return;
    setResetView("sent");
    tryStep((s) => s.action === "forgot-link");
  }

  function handleOpenResetEmail() {
    if (!wants((s) => s.action === "open-reset-email")) return;
    setResetView("email");
    tryStep((s) => s.action === "open-reset-email");
  }

  function handleClickResetLink() {
    if (!wants((s) => s.action === "click-reset-link")) return;
    setResetView("new-password");
    setLoginPassword("");
    tryStep((s) => s.action === "click-reset-link");
  }

  function handleVerify2fa() {
    if (wants((s) => s.action === "verify-2fa")) {
      setLoggedIn({ username, method: "password + verification code" });
      tryStep((s) => s.action === "verify-2fa");
    }
  }

  /** Mail and Messages present the links as what they are; every other chrome keeps the plain list. */
  const isThread = chrome === "messages";
  const [openMessage, setOpenMessage] = useState<string | null>(null);

  function handleOpenMessage(linkText: string) {
    setOpenMessage(linkText);
    setInspectedLink(null);
    setWrongAnswer(null);
    tryStep((s) => s.action === "inspect-link" && s.target === linkText);
  }

  function handleInspectLink(linkText: string) {
    setInspectedLink(linkText);
    setWrongAnswer(null);
    tryStep((s) => s.action === "inspect-link" && s.target === linkText);
  }

  function handleVerdict(verdict: "safe" | "dangerous") {
    if (!inspectedLink) return;
    const data = PHISHING_LINK_DATA[inspectedLink];
    const correct = data?.safe ? "safe" : "dangerous";

    if (verdict === correct) {
      setLinkVerdicts((prev) => ({ ...prev, [inspectedLink]: verdict }));
      setWrongAnswer(null);
      setInspectedLink(null);
      const action = verdict === "safe" ? "mark-safe" : "mark-dangerous";
      tryStep((s) => s.action === action && s.target === inspectedLink);
    } else {
      setWrongAnswer({ link: inspectedLink, picked: verdict, reason: data?.reason ?? "Look at the URL carefully." });
    }
  }

  function handleToggleSetting(name: string) {
    setPrivacySettings((prev) => ({ ...prev, [name]: !prev[name] }));
    const newVal = !privacySettings[name];
    tryStep((s) => s.action === "toggle-setting" && s.target === name && (s.value === undefined || newVal === (s.value === "on")));
  }

  const strength = passwordStrength(passwordInput);

  // Derive the 2FA code from the step data
  const twoFaStep = steps.find((s) => s.action === "enter-2fa-code");
  const twoFaExpectedCode = twoFaStep?.value ?? "482913";

  if (section === "2fa") {
    return (
      <SimulatorFrame
        appName="Security"
        stepIndex={stepIndex}
        totalSteps={steps.length}
        instruction={step?.say} currentStep={step}
        done={done}
        goal={goal}
        flash={flash}
        objectives={objectives}
        hint={hint}
      >
        <div className="flex-1 flex items-center justify-center p-4 gap-6">
          {/* Phone illustration (12.3 rebuild) */}
          <div className="w-44 flex-shrink-0">
            <div className="bg-gray-900 rounded-[2rem] shadow-xl overflow-hidden" style={{ aspectRatio: "9/19.5" }}>
              {/* Status bar */}
              <div className="flex items-center justify-between px-4 pt-2 pb-1 bg-gray-900">
                <span className="text-[9px] text-gray-300 font-semibold">9:41</span>
                <div className="w-12 h-3 bg-gray-800 rounded-full" />
                <div className="flex items-center gap-0.5">
                  <div className="w-0.5 h-1.5 bg-gray-300 rounded-sm" />
                  <div className="w-0.5 h-2 bg-gray-300 rounded-sm" />
                  <div className="w-0.5 h-2.5 bg-gray-300 rounded-sm" />
                  <div className="w-0.5 h-3 bg-gray-300 rounded-sm" />
                  <div className="ml-1 flex items-center gap-px">
                    <div className="w-3.5 h-2 rounded-sm border border-gray-300 p-px flex items-center">
                      <div className="h-full w-3/4 bg-green-400 rounded-sm" />
                    </div>
                  </div>
                </div>
              </div>
              {/* App header */}
              <div className="bg-gray-100 px-3 pt-2 pb-1.5">
                <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider">Messages</p>
              </div>
              {/* Message thread */}
              <div className="bg-white flex-1 p-3 space-y-2">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] text-gray-500 sim-dark:text-gray-400 mb-0.5 ml-1">ExampleBank</span>
                  <div className="bg-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                    <p className="text-[10px] text-gray-700 leading-tight">Your verification code is:</p>
                    <p className="text-[22px] font-black text-blue-700 tracking-widest leading-tight mt-0.5 font-mono">{twoFaExpectedCode}</p>
                    <p className="text-[8px] text-gray-500 sim-dark:text-gray-400 leading-tight mt-1">Valid for 10 minutes. Never share this code.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Code entry */}
          <div className="flex-1 max-w-xs text-center">
            <h3 className="font-bold text-lg mb-1">Enter Your Code</h3>
            <p className="text-sm text-gray-500 mb-4">Type the 6-digit code from your phone.</p>
            <input
              value={twoFaCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTwoFaCode(val);
                tryStep((s) => s.action === "enter-2fa-code" && val === twoFaExpectedCode);
              }}
              placeholder="000000"
              maxLength={6}
              className={`w-full text-center text-2xl tracking-widest px-4 py-3 border-2 rounded-xl outline-none font-mono mb-4 ${hl("twofa-input") ? pulse : ""}`}
            />
            <button
              onClick={handleVerify2fa}
              className={`w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all ${hl("verify-btn") ? pulse : ""}`}
            >
              Verify
            </button>
          </div>
        </div>
      </SimulatorFrame>
    );
  }

  return (
    <SimulatorFrame
      appName="Security"
      stepIndex={stepIndex}
      totalSteps={steps.length}
      instruction={step?.say} currentStep={step}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
    >
      {/* Section tabs */}
      <div className="flex border-b flex-shrink-0 overflow-x-auto">
        {SECTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleGoToSection(id)}
            className={`flex-1 py-2 text-xs font-medium whitespace-nowrap transition-all ${
              section === id ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
            } ${hl("section-btn", id) ? pulse : ""}`}
          >
            <span className="inline-flex items-center gap-1">{icon} {label}</span>
          </button>
        ))}
      </div>

      {/* Password Tester — live meter, no "Check" button */}
      {section === "password-tester" && (
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="font-bold text-base mb-1">Password Strength Tester</h3>
          <p className="text-xs text-gray-500 mb-4">Type a password to see how strong it is. The meter updates instantly.</p>
          <input
            value={passwordInput}
            onChange={(e) => handleTypePassword(e.target.value)}
            type="text"
            placeholder="Type a password..."
            className={`w-full px-4 py-3 border-2 border-gray-500 rounded-xl text-sm outline-none focus:border-blue-600 mb-3 font-mono ${hl("pw-input") ? pulse : ""}`}
          />
          {/* Strength meter — always visible while typing */}
          {passwordInput && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.level / 5) * 100}%` }} />
                </div>
                <span className={`text-xs font-bold ${strength.level >= 4 ? "text-green-700 sim-dark:text-green-400" : strength.level >= 3 ? "text-yellow-600" : "text-red-700 sim-dark:text-red-400"}`}>{strength.label}</span>
              </div>
              {/* Criteria checklist — always visible */}
              <div className={`p-4 rounded-xl border ${strength.level >= 4 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <p className="font-semibold text-sm mb-2">{strength.level >= 4 ? "Great password!" : "Make it stronger:"}</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="inline-flex items-center gap-1">{passwordInput.length >= 12 ? <CheckCircleIcon size={14} className="text-green-500" /> : <XCircleIcon size={14} className="text-red-400" />} At least 12 characters ({passwordInput.length} used)</li>
                  <li className="inline-flex items-center gap-1">{/[A-Z]/.test(passwordInput) ? <CheckCircleIcon size={14} className="text-green-500" /> : <XCircleIcon size={14} className="text-red-400" />} Uppercase letters</li>
                  <li className="inline-flex items-center gap-1">{/[0-9]/.test(passwordInput) ? <CheckCircleIcon size={14} className="text-green-500" /> : <XCircleIcon size={14} className="text-red-400" />} Numbers</li>
                  <li className="inline-flex items-center gap-1">{/[^A-Za-z0-9]/.test(passwordInput) ? <CheckCircleIcon size={14} className="text-green-500" /> : <XCircleIcon size={14} className="text-red-400" />} Symbols (!@#$...)</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* Login — includes forgot-password, passkey, and logged-in flows */}
      {section === "login" && loggedIn && (
        <LoggedInPanel
          username={loggedIn.username}
          method={loggedIn.method}
          onSignOut={() => { setLoggedIn(null); setUsername(""); setLoginPassword(""); setPasskeyDone(false); setResetView("none"); }}
        />
      )}
      {section === "login" && !loggedIn && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-5">
          {resetView === "none" && (
            <div className="w-full max-w-xs">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 sim-dark:text-blue-400 mx-auto mb-4"><KeyIcon size={28} /></div>
              <h3 className="font-bold text-lg text-center mb-4">Sign In</h3>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  { const v = e.target.value.toLowerCase(); tryStep((s) => s.action === "type-username" && v.includes((s.value ?? "").toLowerCase())); }
                }}
                placeholder="Email address"
                className={`w-full px-4 py-3 border border-gray-500 rounded-xl text-sm outline-none focus:border-blue-600 mb-3 ${hl("username-input") ? pulse : ""}`}
              />
              <input
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  tryStep((s) => s.action === "type-login-password" && e.target.value === s.value);
                }}
                type="password"
                placeholder="Password"
                className={`w-full px-4 py-3 border border-gray-500 rounded-xl text-sm outline-none focus:border-blue-600 mb-4 ${hl("login-pw-input") ? pulse : ""}`}
              />
              <button
                onClick={handleLogin}
                className={`w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all ${hl("login-btn") ? pulse : ""}`}
              >
                Log In
              </button>
              {steps.some((s) => s.action === "forgot-link") && (
                <button onClick={handleForgotLink} className={`w-full text-center text-sm text-blue-700 sim-dark:text-blue-400 hover:underline mt-3 ${hl("forgot-link") ? pulse + " rounded px-2 py-1" : ""}`}>
                  Forgot password?
                </button>
              )}
              {steps.some((s) => s.action === "use-passkey") && (
                <>
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-xs text-gray-500 sim-dark:text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-300" />
                  </div>
                  {passkeyDone ? (
                    <div className="text-center py-3 bg-green-50 border border-green-200 rounded-xl">
                      <span className="text-green-700 sim-dark:text-green-400 font-semibold">Signed in with passkey</span>
                    </div>
                  ) : passkeyScanning ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full border-4 border-blue-400 flex items-center justify-center animate-pulse text-blue-700 sim-dark:text-blue-400">
                        <FingerprintIcon size={32} />
                      </div>
                      <p className="text-sm text-blue-600 font-medium animate-pulse">Scanning fingerprint...</p>
                    </div>
                  ) : (
                    <button
                      onClick={handlePasskey}
                      className={`w-full py-3 border-2 border-gray-500 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all ${hl("passkey-btn") ? pulse : ""}`}
                    >
                      <FingerprintIcon size={20} />
                      <span className="font-medium text-sm">Sign in with Passkey</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {resetView === "sent" && (
            <div className="w-full max-w-xs text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-500 mx-auto mb-4"><MailIcon size={28} /></div>
              <h3 className="font-bold text-lg mb-2">Check Your Email</h3>
              <p className="text-sm text-gray-500 mb-6">We sent a password reset link to <strong>{username || "your email"}</strong>.</p>
              <button onClick={handleOpenResetEmail} className={`w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all ${hl("reset-email") ? pulse : ""}`}>
                Open Mail
              </button>
            </div>
          )}
          {resetView === "email" && (
            <div className="w-full max-w-sm">
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-2">
                  <MailIcon size={18} />
                  <span className="font-medium text-sm">Inbox</span>
                </div>
                <div className="p-4">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <p className="text-xs text-gray-500 sim-dark:text-gray-400 mb-1">From: no-reply@examplebank.com</p>
                    <p className="font-semibold text-sm mb-2">Reset Your Password</p>
                    <p className="text-sm text-gray-600 mb-4">Hi! You requested a password reset. Click the button below to choose a new password. This link expires in 1 hour.</p>
                    <button onClick={handleClickResetLink} className={`w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all text-sm ${hl("reset-link") ? pulse : ""}`}>
                      Reset My Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {resetView === "new-password" && (
            <div className="w-full max-w-xs">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 sim-dark:text-blue-400 mx-auto mb-4"><KeyIcon size={28} /></div>
              <h3 className="font-bold text-lg text-center mb-2">Create New Password</h3>
              <p className="text-sm text-gray-500 text-center mb-4">Choose a strong new password for your account.</p>
              <input
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  tryStep((s) => s.action === "type-login-password" && e.target.value === s.value);
                }}
                type="password"
                placeholder="New password"
                className={`w-full px-4 py-3 border border-gray-500 rounded-xl text-sm outline-none focus:border-blue-600 mb-4 ${hl("login-pw-input") ? pulse : ""}`}
              />
              <button onClick={handleLogin} className={`w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all ${hl("login-btn") ? pulse : ""}`}>
                Save & Log In
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phishing Inspector — with wrong-answer feedback */}
      {section === "phishing" && (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Message list — an inbox in Mail, a text thread in Messages */}
          <div className={`${isThread ? "w-40" : "w-56"} shrink-0 border-r overflow-y-auto bg-gray-50`}>
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 border-b bg-white">
              {isThread ? "Messages" : "Inbox"}
            </p>
            {phishingLinks.map((linkText) => {
              const item = PHISHING_LINK_DATA[linkText];
              const verdict = linkVerdicts[linkText];
              return (
                <button
                  key={linkText}
                  onClick={() => handleOpenMessage(linkText)}
                  className={`w-full text-left px-3 py-2 border-b transition-colors ${
                    openMessage === linkText ? "bg-blue-100" : "hover:bg-gray-100"
                  } ${hl("link-reveal", linkText) ? pulse : ""}`}
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold truncate flex-1">{item?.from}</span>
                    {verdict === "safe" && <CheckCircleIcon size={12} className="text-green-500 shrink-0" />}
                    {verdict === "dangerous" && <XCircleIcon size={12} className="text-red-700 sim-dark:text-red-400 shrink-0" />}
                  </div>
                  {!isThread && <p className="text-xs text-gray-600 truncate">{item?.subject}</p>}
                  <p className="text-[10px] text-gray-600 sim-dark:text-gray-400">{item?.when}</p>
                </button>
              );
            })}
            {phishingLinks.length === 0 && (
              <p className="text-sm text-gray-500 sim-dark:text-gray-400 text-center py-8 px-2">No messages in this activity.</p>
            )}
          </div>

          {/* Reading pane */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {!openMessage ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-sm text-gray-500 sim-dark:text-gray-400">
                  {isThread ? "Pick a conversation to read it." : "Pick a message to read it."}
                </p>
              </div>
            ) : (() => {
              const item = PHISHING_LINK_DATA[openMessage]!;
              const verdict = linkVerdicts[openMessage];
              const isWrong = wrongAnswer?.link === openMessage;
              const revealed = inspectedLink === openMessage || !!verdict;
              const [before, after] = item.body.split("{link}");
              return (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {!isThread && <h3 className="font-bold text-base mb-0.5">{item.subject}</h3>}
                    <p className="text-xs text-gray-500 mb-3">From {item.from} · {item.when}</p>
                    <div className={isThread ? "bg-gray-100 rounded-2xl rounded-tl-sm p-3 max-w-sm" : ""}>
                      <p className="text-sm leading-relaxed">
                        {before}
                        <button
                          // Hover and keyboard focus reveal the address — the real,
                          // safe technique. Click reveals too (so nobody is stuck and
                          // free-play/keyboard both work), but the copy below teaches
                          // hover/long-press, never "clicking a suspect link is safe".
                          onClick={() => handleInspectLink(openMessage)}
                          onMouseEnter={() => handleInspectLink(openMessage)}
                          onFocus={() => handleInspectLink(openMessage)}
                          title={isPhone ? "Tap to preview where it goes — without opening it" : "Rest your mouse here to preview where it goes — without opening it"}
                          className={`text-blue-600 underline break-all hover:text-blue-800 rounded ${
                            !revealed && hl("inline-link", openMessage) ? pulse : ""
                          }`}
                        >
                          {openMessage}
                        </button>
                        {after}
                      </p>
                    </div>
                  </div>

                  {/* Link preview bar — the real URL, the way a mail client shows it */}
                  <div className="shrink-0 border-t bg-gray-50 p-3">
                    {!revealed ? (
                      <p className="text-xs text-gray-500">
                        {isPhone
                          ? "Tap the link above to preview where it really goes — without opening it. On a real phone, never open a link in a message you are unsure of."
                          : "Rest your mouse on the link above to preview where it really goes — without opening it. On a real computer, never click a link in a message you are unsure of."}
                      </p>
                    ) : (
                      <>
                        <div className="bg-white border rounded px-2 py-1 text-xs font-mono text-gray-700 mb-2 truncate inline-flex items-center gap-1 max-w-full">
                          <LinkIcon size={12} className="shrink-0" /> <span className="truncate">{item.url}</span>
                        </div>
                        {verdict ? (
                          <div>
                            <span className="text-sm inline-flex items-center gap-1">
                              {verdict === "safe"
                                ? <><CheckCircleIcon size={14} className="text-green-500" /> Safe</>
                                : <><XCircleIcon size={14} className="text-red-700 sim-dark:text-red-400" /> Dangerous</>}
                            </span>
                            <p className="text-xs text-gray-600 mt-1">{item.reason}</p>
                          </div>
                        ) : (
                          <>
                            {isWrong && (
                              <div className="bg-red-100 border border-red-200 rounded-lg p-2 mb-2">
                                <p className="text-xs text-red-700 font-medium">Not quite — try again!</p>
                                <p className="text-xs text-red-700 sim-dark:text-red-400 mt-1">{wrongAnswer.reason}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => handleVerdict("safe")} className={`flex-1 py-1.5 text-xs bg-green-700 text-white rounded-lg hover:bg-green-800 inline-flex items-center justify-center gap-1 ${hl("safe-btn") ? pulse : ""}`}><CheckCircleIcon size={12} /> Safe</button>
                              <button onClick={() => handleVerdict("dangerous")} className={`flex-1 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center justify-center gap-1 ${hl("danger-btn") ? pulse : ""}`}><XCircleIcon size={12} /> Dangerous</button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Privacy Settings */}
      {section === "privacy" && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-bold text-base mb-1">Privacy Settings</h3>
          <p className="text-xs text-gray-500 mb-4">Control what information apps can access.</p>
          <div className="flex flex-col gap-2">
            {Object.entries(privacySettings).map(([name, val]) => (
              <div key={name} className={`flex items-center justify-between p-3 border rounded-xl ${hl("privacy-toggle", name) ? pulse : ""}`}>
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-gray-500 sim-dark:text-gray-400">{val ? "On — apps can access this" : "Off — access blocked"}</p>
                </div>
                <button
                  onClick={() => handleToggleSetting(name)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? "bg-blue-500" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${val ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </SimulatorFrame>
  );
}
