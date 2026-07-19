"use client";

import { useRef, useState } from "react";
import FakeDesktop from "./FakeDesktop";
import BrowserSimulator from "./BrowserSimulator";
import { checkTypeText } from "./TaskChecker";

interface DesktopBrowserScrollTaskProps {
  /** Kept for lesson-schema compatibility; the code is now randomized each attempt. */
  code?: string;
  onResult: (success: boolean) => void;
}

// Skips easily-confused characters (0/O, 1/I) so beginners can read it cleanly.
function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function DesktopBrowserScrollTask({ onResult }: DesktopBrowserScrollTaskProps) {
  const [code] = useState(randomCode);
  const [phase, setPhase] = useState<"desktop" | "browser">("desktop");
  const [scrolled, setScrolled] = useState(false);
  const [typed, setTyped] = useState("");
  const finished = useRef(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!scrolled && e.currentTarget.scrollTop > 80) setScrolled(true);
  }

  function handleType(value: string) {
    setTyped(value);
    if (!finished.current && checkTypeText(code, value, false)) {
      finished.current = true;
      onResult(true);
    }
  }

  if (phase === "browser") {
    return (
      <BrowserSimulator
        tabTitle="Fun Computer Facts"
        url="facts.example"
        onExit={() => {
          setPhase("desktop");
          setScrolled(false);
        }}
        bezel={false}
        showControls={false}
      >
        <div className="h-full overflow-y-auto" onScroll={handleScroll}>
          <div className="p-6 space-y-4 text-lg" style={{ minHeight: "calc(100% + 800px)" }}>
            <h1 className="text-2xl font-bold">Fun Computer Facts</h1>
            <p>
              Did you know that the first computer mouse was made of wood? Douglas Engelbart invented
              it in 1964. It was a simple wooden block with two metal wheels underneath.
            </p>
            <p>
              Computers process information using binary code — a language made up of only two
              symbols: 0 and 1. Every photo, song, and video on your device is stored as a long
              string of those two digits.
            </p>
            <p>
              The word &ldquo;bug&rdquo; in computer programming comes from 1947, when a real moth
              got stuck inside a Harvard computer and caused it to crash. The engineers taped the
              moth into their logbook and wrote &ldquo;First actual case of bug being found.&rdquo;
            </p>
            <p>
              A modern smartphone has more computing power than all of NASA&apos;s computers
              combined at the time of the Apollo 11 moon landing in 1969.
            </p>
            <p>
              The internet and the World Wide Web are not the same thing! The internet is the global
              network of computers, while the Web is a system of linked pages that runs on top of it.
            </p>
            <p>
              The first computer programmer was Ada Lovelace, who wrote an algorithm for Charles
              Babbage&apos;s Analytical Engine in the 1840s — nearly a century before modern
              computers existed.
            </p>
            <p>
              There are more possible iterations of a game of chess than there are atoms in the
              observable universe. That&apos;s why computers that play chess are so impressive —
              they can&apos;t check every move, so they have to be smart about which ones to explore.
            </p>
            <p>
              The &ldquo;spam&rdquo; in your email inbox is named after a Monty Python sketch in
              which Vikings repeatedly sing &ldquo;Spam, spam, spam&rdquo; to drown out all other
              conversation — just like junk email drowns out the stuff you actually want.
            </p>
            <p>
              The @ symbol used in email addresses was chosen in 1971 by engineer Ray Tomlinson. He
              picked it because it was on the keyboard and not commonly used in names — so it
              wouldn&apos;t cause any confusion.
            </p>
            <p>
              About 90% of the world&apos;s currency exists only as digital data. The physical coins
              and banknotes in existence account for less than 10% of all money — the rest lives
              inside computer systems at banks.
            </p>
            <p>
              The first hard disk drive, made by IBM in 1956, weighed over a ton and stored just 5
              megabytes of data. Today, a single thumb drive the size of your fingertip can hold a
              million times that amount.
            </p>
            <p>
              Every time you watch a YouTube video or send a message, your data travels through
              underwater cables that stretch across the ocean floor. There are over 400 of these
              cables connecting the continents, carrying nearly all international internet traffic.
            </p>
            <p>
              The first domain name ever registered was Symbolics.com, on March 15, 1985. It
              belonged to a computer company in Massachusetts. The site is still active today,
              making it the oldest registered domain on the internet.
            </p>
            <p>
              Computer keyboards are arranged in the &ldquo;QWERTY&rdquo; layout — named after the
              first six letters in the top row — because early typewriters needed letters placed far
              apart to stop the mechanical arms from jamming together during fast typing.
            </p>
            <p>
              The very first webcam was set up at Cambridge University in 1991 — pointed at a coffee
              pot. Researchers were tired of walking down the hall only to find it empty, so they
              streamed a live picture of it to their computers instead.
            </p>
            {scrolled ? (
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 space-y-2">
                <p className="font-bold">You scrolled down — great work!</p>
                <p className="text-base text-gray-600">Type the secret code below to finish:</p>
                <p className="font-mono text-xl font-bold tracking-widest">{code}</p>
                <input
                  value={typed}
                  onChange={(e) => handleType(e.target.value)}
                  aria-label="Enter the code"
                  className="w-full border-2 border-black px-3 py-2 text-xl mt-1 outline-none"
                  placeholder="Type the code here…"
                />
              </div>
            ) : (
              <div className="border-4 border-dashed border-gray-300 p-4 bg-gray-50 text-center text-gray-400 select-none">
                Keep scrolling to reveal the secret code
              </div>
            )}
          </div>
        </div>
      </BrowserSimulator>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <p className="shrink-0 text-base border-2 border-yellow-400 bg-yellow-100 px-4 py-2 mx-4 mt-3 rounded animate-slide-down">
        Click the Browser icon at the bottom of the desktop to open it.
      </p>
      <div className="flex-1 min-h-0 p-3 pt-2">
        <FakeDesktop onAppOpened={(app) => { if (app === "browser") setPhase("browser"); }} />
      </div>
    </div>
  );
}
