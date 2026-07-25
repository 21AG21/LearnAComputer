import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "window-open": {
          "0%": { opacity: "0", transform: "scale(0.85) translateY(12px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        // Minimize: the window shrinks and slides DOWN toward the dock/taskbar.
        "window-minimize": {
          "0%": { opacity: "1", transform: "scale(1) translateY(0)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "0", transform: "scale(0.18) translateY(140%)" },
        },
        // Close: the window collapses in place with a small twist — clearly not the
        // same motion as minimize, so the two actions look different.
        "window-close": {
          "0%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
          "100%": { opacity: "0", transform: "scale(0.4) rotate(-8deg)" },
        },
        "ping-once": {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
          "100%": { opacity: "0", transform: "scale(1.3)" },
        },
        "ring-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 4px rgba(250,204,21,1), 0 0 0 8px rgba(250,204,21,0)" },
          "50%":       { boxShadow: "0 0 0 4px rgba(250,204,21,1), 0 0 0 12px rgba(250,204,21,0.45)" },
        },
        "pop-attention": {
          "0%":   { transform: "scale(1)" },
          "40%":  { transform: "scale(1.12)" },
          "70%":  { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        },
        "lesson-in": {
          "0%":   { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "dock-bounce": {
          "0%":   { transform: "translateY(0)" },
          "30%":  { transform: "translateY(-14px)" },
          "55%":  { transform: "translateY(0)" },
          "72%":  { transform: "translateY(-7px)" },
          "85%":  { transform: "translateY(0)" },
          "93%":  { transform: "translateY(-3px)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-up-out": {
          "0%":   { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out both",
        "slide-down": "slide-down 0.2s ease-out both",
        "slide-up": "slide-up 0.2s ease-out both",
        "slide-up-out": "slide-up-out 0.16s ease-in both",
        "pop-in": "pop-in 0.15s ease-out both",
        "window-open": "window-open 0.24s ease-out both",
        "window-minimize": "window-minimize 0.32s ease-in both",
        "window-close": "window-close 0.18s ease-in both",
        "ring-pulse": "ring-pulse 1.4s ease-in-out infinite",
        "pop-attention": "pop-attention 0.35s ease-out 1",
        "lesson-in": "lesson-in 0.28s ease-out both",
        "dock-bounce": "dock-bounce 0.5s cubic-bezier(0.36,0.07,0.19,0.97) 1",
      },
    },
  },
  plugins: [],
};

export default config;
