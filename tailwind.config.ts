import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: "class",
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
          // A dark navy edge (3-5px) rings the yellow so the "act here" cue clears
          // WCAG 1.4.11's 3:1 non-text floor against a white surface — yellow-400
          // alone is ~1.4:1 and a cataract/low-vision learner could miss the one
          // signal the whole lesson depends on. The yellow stays the identity.
          "0%, 100%": { boxShadow: "0 0 0 3px rgba(250,204,21,1), 0 0 0 5px rgba(23,37,84,0.95), 0 0 0 9px rgba(250,204,21,0)" },
          "50%":       { boxShadow: "0 0 0 3px rgba(250,204,21,1), 0 0 0 5px rgba(23,37,84,0.95), 0 0 0 13px rgba(250,204,21,0.45)" },
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
        "loading-bar": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
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
        /**
         * The phone's own motion.
         *
         * A phone animates everything, and a beginner reads that motion as
         * cause and effect: the app grew out of the icon I pressed, so I pressed
         * the right thing. Instant swaps leave them unsure anything happened,
         * which on this course reads as "it is broken" rather than "it is fast".
         *
         * `app-open` grows from roughly where a home-screen icon sits rather
         * than from dead centre, which is what makes it feel like the icon
         * opened rather than a page appeared.
         */
        "app-open": {
          "0%":   { opacity: "0", transform: "scale(0.72)" },
          "60%":  { opacity: "1" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "app-close": {
          "0%":   { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.72)" },
        },
        /** A screen pushed in from the right, and popped back out to it. */
        "screen-push": {
          "0%":   { opacity: "0.4", transform: "translateX(28%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        /** A sheet coming up from the bottom edge, the way a phone offers choices. */
        "sheet-up": {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
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
        "loading-bar": "loading-bar 0.9s ease-in-out infinite",
        "dock-bounce": "dock-bounce 0.5s cubic-bezier(0.36,0.07,0.19,0.97) 1",
        "app-open": "app-open 0.26s cubic-bezier(0.2,0.8,0.2,1) both",
        "app-close": "app-close 0.2s cubic-bezier(0.4,0,1,1) both",
        "screen-push": "screen-push 0.24s cubic-bezier(0.2,0.8,0.2,1) both",
        "sheet-up": "sheet-up 0.24s cubic-bezier(0.2,0.8,0.2,1) both",
      },
    },
  },
  plugins: [
    /**
     * `sim-dark:` — dark mode *inside the simulated computer*, which is a different
     * thing from `dark:` and must not be confused with it.
     *
     * `dark:` follows the learner's own browser and the site's theme toggle. The
     * practice desktop has its own Dark Mode switch in its own Settings app, and
     * Unit 9 teaches the learner to flip it. The two are independent in both
     * directions: a learner reading the site in light mode can put the practice
     * computer in dark mode, and someone reading in dark mode still gets a light
     * practice computer until they change that setting themselves. Anything else
     * and the lesson's own toggle appears to do nothing.
     *
     * So this cannot be Tailwind's `dark:`, and the sim root cannot just carry the
     * `dark` class: `html.dark` is an ancestor of everything, and the class
     * strategy has no way to switch dark back off for a subtree.
     *
     * Kept additive on purpose. Every use is a `sim-dark:` class *added* beside the
     * light one, never a replacement, so the light-mode stylesheet is byte-identical
     * to before and the reskin cannot regress the 99% of the course that never
     * touches this setting.
     */
    plugin(({ addVariant }) => {
      /**
       * Both halves are needed. `.sim-dark &` covers descendants, which is almost
       * everything — but `.sim-dark` also lands on the desktop root itself, and a
       * descendant selector does not match the element carrying the class. So
       * `FakeDesktop`'s own root had `text-gray-900 sim-dark:text-gray-100`, only
       * the first of those ever applied, and every app that inherited its text
       * color drew gray-900 words on a gray-900 window: invisible. `&.sim-dark`
       * matches the element itself and fixes it. Found by `simdark-check`, which
       * caught the bug in this very plumbing before it shipped.
       */
      addVariant("sim-dark", ["&.sim-dark", ".sim-dark &"]);
    }),
  ],
};

export default config;
