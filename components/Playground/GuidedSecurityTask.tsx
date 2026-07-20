"use client";

import { useState, useRef, type ReactNode } from "react";
import SimulatorFrame from "./SimulatorFrame";
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
  onResult: (success: boolean) => void;
}

type Section = "password-tester" | "login" | "2fa" | "phishing" | "privacy";

const PHISHING_LINK_DATA: Record<string, { url: string; safe: boolean; reason: string }> = {
  "Verify your account": { url: "bank-secure-login.fakesite.ru", safe: false, reason: "The URL ends in .fakesite.ru — real banks use their own domain, not a random Russian site." },
  "View your order": { url: "amazon.com/orders", safe: true, reason: "This goes to amazon.com — the real Amazon website." },
  "Free WiFi Login": { url: "http://free-wifi-portal.net", safe: false, reason: "This uses http:// (not secure) and goes to an unknown site that could steal your info." },
  "Bank of America Login": { url: "https://bankofamerica.com/login", safe: true, reason: "This goes to the real Bank of America website with https://." },
  "Complete Your Purchase": { url: "https://shop.example/checkout", safe: true, reason: "This goes to shop.example — a legitimate checkout page." },
  "Complete Purchase": { url: "https://shop.example/checkout", safe: true, reason: "This goes to shop.example — a legitimate checkout page." },
  "Claim 90% Discount NOW": { url: "http://deals-4u-cheap.xyz/buy", safe: false, reason: "Suspicious domain deals-4u-cheap.xyz, uses http://, and the \"90% discount NOW\" is a classic scam tactic." },
  "Enter Card Details": { url: "http://sh0p-deals.xyz/pay", safe: false, reason: "The URL uses a zero instead of 'o' in 'sh0p' — scammers misspell real sites to trick you." },
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

export default function GuidedSecurityTask({ goal, steps, onResult }: GuidedSecurityTaskProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

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

  const phishingLinks = steps.filter((s) => s.action === "inspect-link" && s.target).map((s) => s.target as string);
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

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  function completeStep() {
    if (completedRef.current) return;
    completedRef.current = true;
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      completedRef.current = false;
    }, 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
  }

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
      case "mark-safe": return kind === "safe-btn";
      case "mark-dangerous": return kind === "danger-btn";
      case "toggle-setting": return kind === "privacy-toggle" && name === step.target;
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
    { id: "password-tester", label: "Passwords", icon: <KeyIcon size={14} /> },
    { id: "login", label: "Login", icon: <KeyIcon size={14} /> },
    { id: "phishing", label: "Phishing", icon: <FishingIcon size={14} /> },
    { id: "privacy", label: "Privacy", icon: <ShieldIcon size={14} /> },
  ];

  function handleGoToSection(s: Section) {
    setSection(s);
    if (s === "2fa") return;
    if (step?.action === "go-to-section" && step.target === s) completeStep();
  }

  function handleTypePassword(val: string) {
    setPasswordInput(val);
    if (step?.action !== "type-password") return;
    if (step.minStrength !== undefined) {
      if (passwordStrength(val).level >= step.minStrength) completeStep();
    } else if (step.value) {
      if (val === step.value) completeStep();
    }
  }

  function handleLogin() {
    const nextStep = steps[stepIndex + 1];
    if (nextStep?.action === "enter-2fa-code") {
      setSection("2fa");
    }
    if (step?.action === "login") completeStep();
  }

  function handlePasskey() {
    if (step?.action !== "use-passkey" || passkeyScanning) return;
    setPasskeyScanning(true);
    setTimeout(() => {
      setPasskeyScanning(false);
      setPasskeyDone(true);
      completeStep();
    }, 1800);
  }

  function handleForgotLink() {
    if (step?.action !== "forgot-link") return;
    setResetView("sent");
    completeStep();
  }

  function handleOpenResetEmail() {
    if (step?.action !== "open-reset-email") return;
    setResetView("email");
    completeStep();
  }

  function handleClickResetLink() {
    if (step?.action !== "click-reset-link") return;
    setResetView("new-password");
    setLoginPassword("");
    completeStep();
  }

  function handleVerify2fa() {
    if (step?.action === "verify-2fa") completeStep();
  }

  function handleInspectLink(linkText: string) {
    setInspectedLink(linkText);
    setWrongAnswer(null);
    if (step?.action === "inspect-link" && step.target === linkText) completeStep();
  }

  function handleVerdict(verdict: "safe" | "dangerous") {
    if (!inspectedLink) return;
    const data = PHISHING_LINK_DATA[inspectedLink];
    const correct = data?.safe ? "safe" : "dangerous";

    if (verdict === correct) {
      setLinkVerdicts((prev) => ({ ...prev, [inspectedLink]: verdict }));
      setWrongAnswer(null);
      setInspectedLink(null);
      if (verdict === "safe" && step?.action === "mark-safe") completeStep();
      if (verdict === "dangerous" && step?.action === "mark-dangerous") completeStep();
    } else {
      setWrongAnswer({ link: inspectedLink, picked: verdict, reason: data?.reason ?? "Look at the URL carefully." });
    }
  }

  function handleToggleSetting(name: string) {
    setPrivacySettings((prev) => ({ ...prev, [name]: !prev[name] }));
    if (step?.action === "toggle-setting" && step.target === name) {
      const targetVal = step.value === "on";
      const newVal = !privacySettings[name];
      if (newVal === targetVal) completeStep();
      else if (step.value === undefined) completeStep();
    }
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
        instruction={step?.say ?? ""}
        done={done}
        goal={goal}
        flash={flash}
      >
        <div className="flex-1 flex items-center justify-center p-4 gap-6">
          {/* Phone illustration */}
          <div className="w-40 flex-shrink-0">
            <div className="bg-gray-900 rounded-3xl p-1.5 shadow-lg">
              <div className="bg-gray-900 rounded-t-2xl pt-3 pb-1 flex justify-center">
                <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
              </div>
              <div className="bg-white rounded-b-2xl p-3 min-h-[140px]">
                <p className="text-[10px] text-gray-400 mb-2">Text Message</p>
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <p className="text-[10px] text-gray-600 mb-1">ExampleBank:</p>
                  <p className="text-[10px] text-gray-700">Your verification code is:</p>
                  <p className="text-xl font-bold text-blue-600 tracking-widest mt-1">{twoFaExpectedCode}</p>
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
                if (step?.action === "enter-2fa-code" && val === twoFaExpectedCode) completeStep();
              }}
              placeholder="000000"
              maxLength={6}
              className={`w-full text-center text-2xl tracking-widest px-4 py-3 border-2 rounded-xl outline-none font-mono mb-4 ${hl("twofa-input") ? pulse : ""}`}
            />
            <button
              onClick={handleVerify2fa}
              className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all ${hl("verify-btn") ? pulse : ""}`}
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
      instruction={step?.say ?? ""}
      done={done}
      goal={goal}
      flash={flash}
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
            className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none focus:border-blue-400 mb-3 font-mono ${hl("pw-input") ? pulse : ""}`}
          />
          {/* Strength meter — always visible while typing */}
          {passwordInput && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.level / 5) * 100}%` }} />
                </div>
                <span className={`text-xs font-bold ${strength.level >= 4 ? "text-green-600" : strength.level >= 3 ? "text-yellow-600" : "text-red-500"}`}>{strength.label}</span>
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

      {/* Login — includes forgot-password and passkey flows */}
      {section === "login" && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-5">
          {resetView === "none" && (
            <div className="w-full max-w-xs">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mx-auto mb-4"><KeyIcon size={28} /></div>
              <h3 className="font-bold text-lg text-center mb-4">Sign In</h3>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (step?.action === "type-username" && e.target.value.toLowerCase().includes((step.value ?? "").toLowerCase())) completeStep();
                }}
                placeholder="Email address"
                className={`w-full px-4 py-3 border rounded-xl text-sm outline-none focus:border-blue-400 mb-3 ${hl("username-input") ? pulse : ""}`}
              />
              <input
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (step?.action === "type-login-password" && e.target.value === step.value) completeStep();
                }}
                type="password"
                placeholder="Password"
                className={`w-full px-4 py-3 border rounded-xl text-sm outline-none focus:border-blue-400 mb-4 ${hl("login-pw-input") ? pulse : ""}`}
              />
              <button
                onClick={handleLogin}
                className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all ${hl("login-btn") ? pulse : ""}`}
              >
                Log In
              </button>
              {steps.some((s) => s.action === "forgot-link") && (
                <button onClick={handleForgotLink} className={`w-full text-center text-sm text-blue-500 hover:underline mt-3 ${hl("forgot-link") ? pulse + " rounded px-2 py-1" : ""}`}>
                  Forgot password?
                </button>
              )}
              {steps.some((s) => s.action === "use-passkey") && (
                <>
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-300" />
                  </div>
                  {passkeyDone ? (
                    <div className="text-center py-3 bg-green-50 border border-green-200 rounded-xl">
                      <span className="text-green-600 font-semibold">Signed in with passkey</span>
                    </div>
                  ) : passkeyScanning ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full border-4 border-blue-400 flex items-center justify-center animate-pulse text-blue-500">
                        <FingerprintIcon size={32} />
                      </div>
                      <p className="text-sm text-blue-600 font-medium animate-pulse">Scanning fingerprint...</p>
                    </div>
                  ) : (
                    <button
                      onClick={handlePasskey}
                      className={`w-full py-3 border-2 border-gray-300 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all ${hl("passkey-btn") ? pulse : ""}`}
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
              <button onClick={handleOpenResetEmail} className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all ${hl("reset-email") ? pulse : ""}`}>
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
                    <p className="text-xs text-gray-400 mb-1">From: no-reply@examplebank.com</p>
                    <p className="font-semibold text-sm mb-2">Reset Your Password</p>
                    <p className="text-sm text-gray-600 mb-4">Hi! You requested a password reset. Click the button below to choose a new password. This link expires in 1 hour.</p>
                    <button onClick={handleClickResetLink} className={`w-full py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all text-sm ${hl("reset-link") ? pulse : ""}`}>
                      Reset My Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {resetView === "new-password" && (
            <div className="w-full max-w-xs">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mx-auto mb-4"><KeyIcon size={28} /></div>
              <h3 className="font-bold text-lg text-center mb-2">Create New Password</h3>
              <p className="text-sm text-gray-500 text-center mb-4">Choose a strong new password for your account.</p>
              <input
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (step?.action === "type-login-password" && e.target.value === step.value) completeStep();
                }}
                type="password"
                placeholder="New password"
                className={`w-full px-4 py-3 border rounded-xl text-sm outline-none focus:border-blue-400 mb-4 ${hl("login-pw-input") ? pulse : ""}`}
              />
              <button onClick={handleLogin} className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all ${hl("login-btn") ? pulse : ""}`}>
                Save & Log In
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phishing Inspector — with wrong-answer feedback */}
      {section === "phishing" && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-bold text-base mb-1">Phishing Inspector</h3>
          <p className="text-xs text-gray-500 mb-4">Click &quot;Reveal URL&quot; to see where a link really goes, then decide if it&apos;s safe.</p>
          <div className="flex flex-col gap-3">
            {phishingLinks.map((linkText) => {
              const data = PHISHING_LINK_DATA[linkText];
              const verdict = linkVerdicts[linkText];
              const isWrong = wrongAnswer?.link === linkText;
              return (
                <div key={linkText} className={`p-3 border rounded-xl transition-all ${
                  verdict === "safe" ? "border-green-300 bg-green-50" :
                  verdict === "dangerous" ? "border-red-300 bg-red-50" :
                  isWrong ? "border-red-400 bg-red-50 animate-[shake_0.4s_ease-in-out]" :
                  "border-gray-200"
                }`}>
                  <p className="text-sm font-medium text-blue-600 underline cursor-pointer mb-2">{linkText}</p>
                  {verdict ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm inline-flex items-center gap-1">{verdict === "safe" ? <><CheckCircleIcon size={14} className="text-green-500" /> Safe</> : <><XCircleIcon size={14} className="text-red-500" /> Dangerous</>}</span>
                        <span className="text-xs text-gray-500 font-mono truncate">{data?.url}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{data?.reason}</p>
                    </div>
                  ) : inspectedLink === linkText ? (
                    <div>
                      <div className="bg-white border rounded px-2 py-1 text-xs font-mono text-gray-700 mb-2 truncate inline-flex items-center gap-1"><LinkIcon size={12} /> {data?.url}</div>
                      {isWrong && (
                        <div className="bg-red-100 border border-red-200 rounded-lg p-2 mb-2">
                          <p className="text-xs text-red-700 font-medium">Not quite — try again!</p>
                          <p className="text-xs text-red-600 mt-1">{wrongAnswer.reason}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleVerdict("safe")} className={`flex-1 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 inline-flex items-center justify-center gap-1 ${hl("safe-btn") ? pulse : ""}`}><CheckCircleIcon size={12} /> Safe</button>
                        <button onClick={() => handleVerdict("dangerous")} className={`flex-1 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 inline-flex items-center justify-center gap-1 ${hl("danger-btn") ? pulse : ""}`}><XCircleIcon size={12} /> Dangerous</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInspectLink(linkText)}
                      className={`w-full py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-all ${hl("link-reveal", linkText) ? pulse : ""}`}
                    >
                      Reveal URL
                    </button>
                  )}
                </div>
              );
            })}
            {phishingLinks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No phishing links in this activity.</p>
            )}
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
                  <p className="text-xs text-gray-400">{val ? "On — apps can access this" : "Off — access blocked"}</p>
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
