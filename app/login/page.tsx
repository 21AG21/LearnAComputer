"use client";

import { useState } from "react";
import Link from "next/link";
import DrDigitalAvatar from "@/components/DrDigitalAvatar";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage({ text: "Accounts aren't set up yet — use 'Continue without an account' for now.", ok: false });
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage({ text: error.message, ok: false });
        else setMessage({ text: "Signed in! Redirecting…", ok: true });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage({ text: error.message, ok: false });
        else setMessage({ text: "Account created! Check your email to confirm.", ok: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="border-2 border-black rounded-2xl bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col items-center mb-6 gap-3">
            <DrDigitalAvatar className="w-16 h-16" />
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {mode === "signin" ? "Welcome back!" : "Create an account"}
            </h1>
            <p className="text-sm text-gray-500 text-center">LearnAComputer</p>
          </div>

          {/* Accounts-not-active notice */}
          {!supabase && (
            <div className="mb-5 rounded-lg bg-gray-100 border border-gray-300 px-4 py-3 text-sm text-gray-600">
              Accounts aren&apos;t turned on yet. Your progress is saved on this device.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className={`text-sm rounded-lg px-3 py-2 ${message.ok ? "bg-green-50 text-green-700 border border-green-300" : "bg-red-50 text-red-700 border border-red-300"}`}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-base transition-colors"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Toggle mode */}
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>

          {/* Separator */}
          <div className="my-5 border-t border-gray-200" />

          {/* Continue without account */}
          <Link
            href="/lessons"
            className="block w-full text-center rounded-lg border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 text-base font-semibold text-gray-700 transition-colors"
          >
            Continue without an account →
          </Link>
        </div>
      </div>
    </main>
  );
}
