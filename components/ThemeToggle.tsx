"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/Playground/Icons";

export const THEME_KEY = "lac-theme";

/**
 * The inline script that runs before paint. Without it the page renders light
 * and then flips, which is worse than having no dark mode at all.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem("${THEME_KEY}");
var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
}catch(e){}})();`;

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing with storage blocked — the toggle still works for this page.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    >
      {/* Until the effect runs we do not know the theme; render the sun so the button never jumps. */}
      {ready && dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}
