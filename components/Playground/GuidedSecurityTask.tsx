"use client";

import { useState } from "react";

export type GuidedSecurityStep = {
  say: string;
  action:
    | "type-password" | "check-strength" | "type-username" | "type-login-password"
    | "login" | "enter-2fa-code" | "verify-2fa" | "inspect-link" | "mark-safe"
    | "mark-dangerous" | "toggle-setting" | "go-to-section";
  target?: string;
  value?: string;
};

interface GuidedSecurityTaskProps {
  goal: string;
  steps: GuidedSecurityStep[];
  onResult: (success: boolean) => void;
}

type Section = "password-tester" | "login" | "2fa" | "phishing" | "privacy";

const PHISHING_LINK_DATA: Record<string, { url: string; safe: boolean }> = {
  "Verify your account": { url: "bank-secure-login.fakesite.ru", safe: false },
  "View your order": { url: "amazon.com/orders", safe: true },
  "Free WiFi Login": { url: "http://free-wifi-portal.net", safe: false },
  "Bank of America Login": { url: "https://bankofamerica.com/login", safe: true },
  "Complete Your Purchase": { url: "https://shop.example/checkout", safe: true },
  "Complete Purchase": { url: "https://shop.example/checkout", safe: true },
  "Claim 90% Discount NOW": { url: "http://deals-4u-cheap.xyz/buy", safe: false },
  "Enter Card Details": { url: "http://sh0p-deals.xyz/pay", safe: false },
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

  // Determine initial section from first go-to-section step, or default
  const firstSection = (steps.find((s) => s.action === "go-to-section")?.target as Section) ?? "password-tester";
  const [section, setSection] = useState<Section>(firstSection);

  // Password tester
  const [passwordInput, setPasswordInput] = useState("");
  const [strengthChecked, setStrengthChecked] = useState(false);

  // Login
  const [username, setUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginAttempted, setLoginAttempted] = useState(false);

  // 2FA
  const [twoFaCode, setTwoFaCode] = useState("");

  // Phishing
  const phishingLinks = steps.filter((s) => s.action === "inspect-link" && s.target).map((s) => s.target as string);
  const [inspectedLink, setInspectedLink] = useState<string | null>(null);
  const [linkVerdicts, setLinkVerdicts] = useState<Record<string, "safe" | "dangerous">>({});

  // Privacy settings
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
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
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
      case "check-strength": return kind === "check-btn";
      case "type-username": return kind === "username-input";
      case "type-login-password": return kind === "login-pw-input";
      case "login": return kind === "login-btn";
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

  const SECTIONS: { id: Section; label: string; icon: string }[] = [
    { id: "password-tester", label: "Passwords", icon: "🔐" },
    { id: "login", label: "Login", icon: "🔑" },
    { id: "phishing", label: "Phishing", icon: "🎣" },
    { id: "privacy", label: "Privacy", icon: "🛡️" },
  ];

  function handleGoToSection(s: Section) {
    setSection(s);
    if (s === "2fa") return; // handled internally
    if (step?.action === "go-to-section" && step.target === s) completeStep();
  }

  function handleCheckStrength() {
    setStrengthChecked(true);
    if (step?.action === "check-strength") completeStep();
  }

  function handleTypePassword(val: string) {
    setPasswordInput(val);
    setStrengthChecked(false);
    if (step?.action === "type-password") {
      // just typing, don't complete yet — wait for the value to match
      if (val === step.value) completeStep();
    }
  }

  function handleLogin() {
    setLoginAttempted(true);
    const nextStep = steps[stepIndex + 1];
    if (nextStep?.action === "enter-2fa-code") {
      setSection("2fa");
    }
    if (step?.action === "login") completeStep();
  }

  function handleVerify2fa() {
    if (step?.action === "verify-2fa") completeStep();
  }

  function handleInspectLink(linkText: string) {
    setInspectedLink(linkText);
    if (step?.action === "inspect-link" && step.target === linkText) completeStep();
  }

  function handleVerdict(verdict: "safe" | "dangerous") {
    if (!inspectedLink) return;
    setLinkVerdicts((prev) => ({ ...prev, [inspectedLink]: verdict }));
    setInspectedLink(null);
    if (verdict === "safe" && step?.action === "mark-safe") completeStep();
    if (verdict === "dangerous" && step?.action === "mark-dangerous") completeStep();
  }

  function handleToggleSetting(name: string) {
    setPrivacySettings((prev) => ({ ...prev, [name]: !prev[name] }));
    if (step?.action === "toggle-setting" && step.target === name) {
      const targetVal = step.value === "on";
      const newVal = !privacySettings[name];
      if (newVal === targetVal) completeStep();
      else if (step.value === undefined) completeStep(); // no value constraint
    }
  }

  const strength = passwordStrength(passwordInput);

  const BannerAndDone = () => (
    <>
      {!finished && step && (
        <div className="bg-gray-900 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-gray-400">Step {stepIndex + 1} of {steps.length}</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(stepIndex / steps.length) * 100}%` }} />
            </div>
          </div>
          <p className="text-sm text-gray-200">{step.say}</p>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/95">
          <p className="text-5xl mb-3">✅</p>
          <p className="text-xl font-bold text-green-700 text-center px-4">DONE — {goal}</p>
        </div>
      )}
    </>
  );

  // 2FA section shown after login
  if (section === "2fa") {
    return (
      <div className="h-full flex flex-col bg-white relative">
        <BannerAndDone />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xs text-center">
            <p className="text-4xl mb-3">📱</p>
            <h3 className="font-bold text-lg mb-1">Check Your Phone</h3>
            <p className="text-sm text-gray-500 mb-6">We sent a 6-digit code to your phone. Enter it below to verify your identity.</p>
            <input
              value={twoFaCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTwoFaCode(val);
                if (step?.action === "enter-2fa-code" && val === step.value) completeStep();
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
        {flash && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"><span className="text-green-400 text-5xl animate-ping-once">✓</span></div>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      <BannerAndDone />

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
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Password Tester */}
      {section === "password-tester" && (
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="font-bold text-base mb-1">🔐 Password Strength Tester</h3>
          <p className="text-xs text-gray-500 mb-4">Type a password to see how strong it is.</p>
          <input
            value={passwordInput}
            onChange={(e) => handleTypePassword(e.target.value)}
            type="text"
            placeholder="Type a password..."
            className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none focus:border-blue-400 mb-3 font-mono ${hl("pw-input") ? pulse : ""}`}
          />
          {passwordInput && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${(strength.level / 5) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-600">{strength.label}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleCheckStrength}
            className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all ${hl("check-btn") ? pulse : ""}`}
          >
            Check Strength
          </button>
          {strengthChecked && passwordInput && (
            <div className={`mt-4 p-4 rounded-xl border ${strength.level >= 4 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
              <p className="font-semibold text-sm mb-2">{strength.level >= 4 ? "✅ Good password!" : "⚠️ Weak password"}</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>{passwordInput.length >= 12 ? "✅" : "❌"} At least 12 characters ({passwordInput.length} used)</li>
                <li>{/[A-Z]/.test(passwordInput) ? "✅" : "❌"} Uppercase letters</li>
                <li>{/[0-9]/.test(passwordInput) ? "✅" : "❌"} Numbers</li>
                <li>{/[^A-Za-z0-9]/.test(passwordInput) ? "✅" : "❌"} Symbols (!@#$...)</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Login */}
      {section === "login" && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-5">
          <div className="w-full max-w-xs">
            <p className="text-3xl text-center mb-4">🔑</p>
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
            {loginAttempted && (
              <p className="text-center text-xs text-gray-500 mt-3">📱 Sending verification code to your phone...</p>
            )}
          </div>
        </div>
      )}

      {/* Phishing Inspector */}
      {section === "phishing" && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-bold text-base mb-1">🎣 Phishing Inspector</h3>
          <p className="text-xs text-gray-500 mb-4">Click &quot;Reveal URL&quot; to see where a link really goes before clicking it.</p>
          <div className="flex flex-col gap-3">
            {phishingLinks.map((linkText) => {
              const data = PHISHING_LINK_DATA[linkText];
              const verdict = linkVerdicts[linkText];
              return (
                <div key={linkText} className={`p-3 border rounded-xl ${verdict === "safe" ? "border-green-300 bg-green-50" : verdict === "dangerous" ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                  <p className="text-sm font-medium text-blue-600 underline cursor-pointer mb-2">{linkText}</p>
                  {verdict ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{verdict === "safe" ? "✅ Safe" : "❌ Dangerous"}</span>
                      <span className="text-xs text-gray-500 font-mono truncate">{data?.url}</span>
                    </div>
                  ) : inspectedLink === linkText ? (
                    <div>
                      <div className="bg-white border rounded px-2 py-1 text-xs font-mono text-gray-700 mb-2 truncate">🔗 {data?.url}</div>
                      <div className="flex gap-2">
                        <button onClick={() => handleVerdict("safe")} className={`flex-1 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 ${hl("safe-btn") ? pulse : ""}`}>✅ Safe</button>
                        <button onClick={() => handleVerdict("dangerous")} className={`flex-1 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 ${hl("danger-btn") ? pulse : ""}`}>❌ Dangerous</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInspectLink(linkText)}
                      className={`w-full py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-all ${hl("link-reveal", linkText) ? pulse : ""}`}
                    >
                      🔍 Reveal URL
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
          <h3 className="font-bold text-base mb-1">🛡️ Privacy Settings</h3>
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

      {flash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-5xl animate-ping-once">✓</span>
        </div>
      )}
    </div>
  );
}
