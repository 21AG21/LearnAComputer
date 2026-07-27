"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkOrganizedFolder, type FolderReport } from "./TaskChecker";
import { CheckIcon, DownloadIcon, FolderIcon, WarningIcon } from "./Icons";
import type { RealWorldStep } from "@/lib/lessons";

/**
 * The body of one real-world mission step. Each kind reads something true about
 * the learner's own machine — a folder they sorted, a file they made, a setting
 * they changed, their network going down — entirely inside the browser. No file
 * contents are read and nothing is ever sent anywhere.
 */
export interface CheckProps {
  step: RealWorldStep;
  download?: { file: string; label: string; note?: string };
  onPass: () => void;
}

const BTN =
  "rounded-lg bg-gray-900 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-40";
const CARD = "w-full max-w-xl rounded-xl border-2 border-gray-300 bg-white p-6";

function Readout({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${good ? "text-green-600" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function Privacy({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-xs leading-relaxed text-gray-500">{children}</p>;
}

/** Self-attested. Used only where there is genuinely nothing the page can observe. */
export function ConfirmCheck({ step, onPass }: CheckProps) {
  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <button onClick={onPass} className={BTN}>
        I have done it
      </button>
      <Privacy>
        This one is on your honour — it happens outside the browser, so the page cannot check it for you.
      </Privacy>
    </div>
  );
}

export function DownloadCheck({ step, download, onPass }: CheckProps) {
  const [clicked, setClicked] = useState(false);
  if (!download) return <p className="text-red-600">This step needs a download, but the lesson did not name one.</p>;

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <a
        href={`/missions/${download.file}`}
        download={download.file}
        onClick={() => {
          setClicked(true);
          setTimeout(onPass, 600);
        }}
        className={`inline-flex items-center gap-2 ${BTN}`}
      >
        <DownloadIcon size={18} />
        {download.label}
      </a>
      {download.note && <p className="mt-3 text-sm text-gray-600">{download.note}</p>}
      {clicked && (
        <p className="mt-3 text-sm font-semibold text-green-700">
          Saved. Your browser puts it in your Downloads folder unless you told it otherwise.
        </p>
      )}
    </div>
  );
}

export function FolderCheck({ step, onPass }: CheckProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<FolderReport | null>(null);
  const [canPickFolders, setCanPickFolders] = useState(true);

  // webkitdirectory has no React prop, and setting it after mount is the one way
  // that behaves the same in every browser that supports folder picking.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
    // Phones and a few older browsers can only pick single files. Better to say
    // so than to open a picker that cannot answer the question.
    setCanPickFolders("webkitdirectory" in HTMLInputElement.prototype);
  }, []);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const paths = Array.from(files).map((f) => f.webkitRelativePath || f.name);
    const result = checkOrganizedFolder(paths, step.expect ?? { folders: [], placements: [] });
    setReport(result);
    if (result.pass) setTimeout(onPass, 400);
  };

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={!canPickFolders}
        className={`inline-flex items-center gap-2 ${BTN}`}
      >
        <FolderIcon size={18} />
        {report ? "Check it again" : "Show me the folder"}
      </button>
      {!canPickFolders && (
        <p className="mt-3 text-sm text-gray-700">
          This browser cannot hand a whole folder to a web page — phones and tablets generally cannot. Do the sorting
          anyway; it is the sorting that matters. To have it checked, open this lesson on a computer.
        </p>
      )}

      {report && (
        <div className="mt-5 space-y-3">
          {report.wins.length > 0 && (
            <ul className="space-y-1">
              {report.wins.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <span className="mt-0.5 shrink-0">
                    <CheckIcon size={14} />
                  </span>
                  {w}
                </li>
              ))}
            </ul>
          )}
          {report.issues.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <p className="mb-2 flex items-center gap-2 font-semibold text-red-800">
                <WarningIcon size={16} /> Not quite yet
              </p>
              <ul className="space-y-1.5">
                {report.issues.map((issue, i) => (
                  <li key={i} className="text-sm leading-snug text-red-800">
                    {issue}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-red-900">
                Fix those on your computer, then press <strong>Check it again</strong>.
              </p>
            </div>
          )}
          {report.pass && (
            <p className="font-semibold text-green-700">Everything is where it should be.</p>
          )}
        </div>
      )}

      <Privacy>
        Your browser hands this page a list of names only. It never reads what is inside your files, and there is
        nowhere for it to send them — the check runs on this device.
      </Privacy>
    </div>
  );
}

const fmtBytes = (n: number) =>
  n > 1_000_000 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export function FileCheck({ step, onPass }: CheckProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [facts, setFacts] = useState<Array<[string, string]> | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const want = step.file ?? {};
    const ageMin = (Date.now() - file.lastModified) / 60000;

    let dims: { w: number; h: number } | null = null;
    if (file.type.startsWith("image/")) {
      dims = await new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    }

    const rows: Array<[string, string]> = [["Name", file.name], ["Size", fmtBytes(file.size)]];
    if (dims) rows.push(["Size on screen", `${dims.w} × ${dims.h} dots`]);
    rows.push([
      "Last changed",
      ageMin < 1 ? "less than a minute ago" : ageMin < 90 ? `${Math.round(ageMin)} minutes ago` : new Date(file.lastModified).toLocaleDateString(),
    ]);
    setFacts(rows);

    let fail: string | null = null;
    if (want.nameIs && file.name.toLowerCase() !== want.nameIs.toLowerCase()) {
      fail = `That one is called "${file.name}". The file you are looking for is "${want.nameIs}" — try your Downloads folder.`;
    } else if (want.kind === "image" && !file.type.startsWith("image/")) {
      fail = "That is not a picture. Pick a photo or a screenshot.";
    } else if (want.kind === "pdf" && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      fail = "That is not a PDF. Save the page as a PDF first, then pick that file.";
    } else if (want.recentMinutes != null && ageMin > want.recentMinutes) {
      fail = `That file was last changed ${Math.round(ageMin)} minutes ago. This step wants one you made in the last ${want.recentMinutes} minutes — make a fresh one.`;
    } else if (want.minBytes != null && file.size < want.minBytes) {
      fail = "That file is nearly empty. Pick the real one.";
    } else if (want.orientation && dims) {
      const landscape = dims.w > dims.h;
      if (want.orientation === "landscape" && !landscape) {
        fail = `That one is ${dims.w} wide by ${dims.h} tall — taller than it is wide. Find a wide one.`;
      }
      if (want.orientation === "portrait" && landscape) {
        fail = `That one is ${dims.w} wide by ${dims.h} tall — wider than it is tall. Find a tall one.`;
      }
    } else if (want.rejectPattern && new RegExp(want.rejectPattern, "i").test(file.name)) {
      fail = `"${file.name}" is the name the camera gave it, not one you chose. Rename it first, then pick it again.`;
    }

    setProblem(fail);
    if (!fail) setTimeout(onPass, 400);
  };

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <button onClick={() => inputRef.current?.click()} className={BTN}>
        {facts ? "Pick a different one" : "Choose a file"}
      </button>

      {facts && (
        <div className="mt-5 rounded-lg border border-gray-200 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">What this file really is</p>
          {facts.map(([k, v]) => (
            <Readout key={k} label={k} value={v} />
          ))}
        </div>
      )}
      {problem && (
        <p className="mt-3 flex items-start gap-2 text-sm font-medium text-red-700">
          <span className="mt-0.5 shrink-0">
            <WarningIcon size={15} />
          </span>
          {problem}
        </p>
      )}

      <Privacy>
        The file never leaves your computer. Its name, its size and its shape are measured here on this device, and
        there is nowhere for the page to send it.
      </Privacy>
    </div>
  );
}

export function PasteCheck({ step, onPass }: CheckProps) {
  const [value, setValue] = useState("");
  const [pasted, setPasted] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const min = step.minChars ?? 25;

  const handlePaste = (text: string) => {
    setPasted(true);
    const clean = text.trim();
    if (clean.length < min) {
      setProblem(`That is only ${clean.length} characters. Copy a longer piece — at least ${min}.`);
      return;
    }
    if (step.notText && clean.toLowerCase().includes(step.notText.toLowerCase())) {
      setProblem("That is the text from this page. Copy something from somewhere else.");
      return;
    }
    setProblem(null);
    setTimeout(onPass, 400);
  };

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={(e) => handlePaste(e.clipboardData.getData("text"))}
        placeholder="Paste here with Ctrl+V (or Command+V)"
        className="h-28 w-full rounded-lg border-2 border-gray-300 p-3 font-sans text-base focus:border-blue-500 focus:outline-none"
      />
      {!pasted && value.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">That was typed, not pasted. Use the paste shortcut.</p>
      )}
      {problem && <p className="mt-2 text-sm font-medium text-red-700">{problem}</p>}
      <Privacy>What you paste stays in this box and goes nowhere.</Privacy>
    </div>
  );
}

/** Make the window small, then make it fill the screen — both measured for real. */
export function WindowCheck({ step, onPass }: CheckProps) {
  const [size, setSize] = useState({ w: 0, h: 0, aw: 0, ah: 0 });
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const read = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight, aw: screen.availWidth, ah: screen.availHeight });
    read();
    window.addEventListener("resize", read);
    // Not every size change arrives as a resize event — dragging a window to a
    // second screen changes what "fills the screen" means without firing one —
    // so the numbers are also re-read on a timer.
    const poll = setInterval(read, 500);
    return () => {
      window.removeEventListener("resize", read);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (size.aw === 0) return;
    const small = size.w < size.aw * 0.8;
    const filled = size.w >= size.aw - 24;
    if (small) setShrunk(true);
    if (shrunk && filled) onPass();
  }, [size, shrunk, onPass]);

  const pct = size.aw > 0 ? Math.round((size.w / size.aw) * 100) : 0;

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <Readout label="Your screen" value={`${size.aw} × ${size.ah}`} />
      <Readout label="This window" value={`${size.w} × ${size.h}`} />
      <Readout label="Filling" value={`${pct}%`} good={pct >= 96} />
      <div className="mt-4 space-y-1.5 text-sm">
        <p className={shrunk ? "text-green-700" : "text-gray-700"}>
          {shrunk ? "✓ " : "1. "}Drag a corner to make the window clearly smaller than the screen.
        </p>
        <p className="text-gray-700">2. Now make it fill the screen again.</p>
      </div>
      <Privacy>These numbers come from the window itself. Nothing is recorded.</Privacy>
    </div>
  );
}

/** Real browser zoom, read through devicePixelRatio. */
export function ZoomCheck({ step, onPass }: CheckProps) {
  const baseline = useRef<number | null>(null);
  const [ratio, setRatio] = useState(1);
  const [zoomedIn, setZoomedIn] = useState(false);

  useEffect(() => {
    if (baseline.current == null) baseline.current = window.devicePixelRatio;
    const read = () => setRatio(window.devicePixelRatio / (baseline.current || 1));
    read();
    window.addEventListener("resize", read);
    const poll = setInterval(read, 400);
    return () => {
      window.removeEventListener("resize", read);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (ratio >= 1.2) setZoomedIn(true);
    if (zoomedIn && ratio <= 1.05) onPass();
  }, [ratio, zoomedIn, onPass]);

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <Readout label="Zoom right now" value={`${Math.round(ratio * 100)}%`} good={ratio >= 1.2} />
      <div className="mt-4 space-y-1.5 text-sm">
        <p className={zoomedIn ? "text-green-700" : "text-gray-700"}>
          {zoomedIn ? "✓ " : "1. "}Zoom in to at least 120% — hold Ctrl (or Command) and press the + key.
        </p>
        <p className="text-gray-700">2. Then put it back to 100% with Ctrl+0 (or Command+0).</p>
      </div>
    </div>
  );
}

/** A real system setting, watched through a media query. */
export function MediaQueryCheck({ step, onPass }: CheckProps) {
  const query = step.check === "dark-mode" ? "(prefers-color-scheme: dark)" : "(prefers-reduced-motion: reduce)";
  const [on, setOn] = useState<boolean | null>(null);
  const startedOn = useRef<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    if (startedOn.current === null) startedOn.current = mq.matches;
    setOn(mq.matches);
    const handler = (e: MediaQueryListEvent) => setOn(e.matches);
    mq.addEventListener("change", handler);
    // The change event is not delivered everywhere — some systems only update
    // the query itself — and a step that never notices is worse than a timer.
    const poll = setInterval(() => setOn(mq.matches), 400);
    return () => {
      mq.removeEventListener("change", handler);
      clearInterval(poll);
    };
  }, [query]);

  useEffect(() => {
    // Passing means they changed it while this step was open — arriving already
    // in the target state and doing nothing does not count.
    if (on !== null && startedOn.current !== null && on !== startedOn.current) onPass();
  }, [on, onPass]);

  const label = step.check === "dark-mode" ? "Dark mode" : "Reduce motion";
  const startedAlreadyOn = startedOn.current === true;

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <Readout label={`${label} on this computer`} value={on ? "On" : "Off"} good={!!on} />
      <p className="mt-4 text-sm text-gray-700">
        {startedAlreadyOn
          ? `You already have ${label.toLowerCase()} switched on. Turn it off in your computer's settings — I will see it change here.`
          : `Turn ${label.toLowerCase()} on in your computer's own settings, not in this page. This box updates by itself when you do.`}
      </p>
      <Privacy>The page can see this setting because your browser tells every website — it is a preference, not a secret.</Privacy>
    </div>
  );
}

/** The real network going down and coming back. */
export function NetworkCheck({ step, onPass }: CheckProps) {
  const wantOnline = step.check === "online";
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const poll = setInterval(() => setOnline(navigator.onLine), 400);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (online === wantOnline) onPass();
  }, [online, wantOnline, onPass]);

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`} />
        <span className="font-semibold">{online ? "Connected" : "No connection"}</span>
      </div>
      <p className="mt-3 text-sm text-gray-700">
        {wantOnline
          ? "Turn your WiFi back on. This dot goes green the moment the computer is back online."
          : "Turn your WiFi off — from the WiFi symbol along the edge of your screen. This dot goes red when it is really off."}
      </p>
      <p className="mt-2 text-sm text-gray-500">This lesson is already loaded, so it keeps working while you are offline.</p>
    </div>
  );
}

/** Read something off your own screen and type it back. */
export function AnswerCheck({ step, onPass }: CheckProps) {
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  /** Things the page can measure about the machine it is running on. */
  const liveText = useCallback((): string[] | null => {
    if (step.match === "hostname") {
      const h = window.location.hostname;
      return [h, h.replace(/^www\./, ""), window.location.host];
    }
    if (step.match === "browser") {
      const ua = navigator.userAgent;
      if (/Edg\//.test(ua)) return ["edge", "microsoftedge"];
      if (/OPR\//.test(ua)) return ["opera"];
      if (/Firefox\//.test(ua)) return ["firefox", "mozillafirefox"];
      if (/Chrome\//.test(ua)) return ["chrome", "googlechrome"];
      if (/Safari\//.test(ua)) return ["safari"];
      return null;
    }
    return null;
  }, [step.match]);

  useEffect(() => {
    if (step.match === "battery") {
      const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
      if (!nav.getBattery) {
        setUnsupported(true);
        return;
      }
      nav.getBattery().then((b) => setLive(Math.round(b.level * 100))).catch(() => setUnsupported(true));
    }
  }, [step.match]);

  const submit = useCallback(() => {
    const raw = value.trim();
    if (!raw) return;

    if (step.match === "battery") {
      const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
      if (Number.isNaN(num)) {
        setProblem("Type just the number.");
        return;
      }
      if (live == null) {
        // No way to measure it here, so the answer is taken at face value —
        // and the learner is told that, rather than being quietly waved through.
        if (num < 0 || num > 100) {
          setProblem("A battery is somewhere between 0 and 100.");
          return;
        }
        setProblem(null);
        onPass();
        return;
      }
      const tol = step.tolerance ?? 3;
      if (Math.abs(num - live) > tol) {
        setProblem(`That is not what I measure. Look again — and read the number, not the picture of the battery.`);
        return;
      }
      setProblem(null);
      onPass();
      return;
    }

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.:]/g, "");
    const measured = liveText();
    const accepted = [...(step.answers ?? []), ...(measured ?? [])];

    if (measured === null && (step.match === "hostname" || step.match === "browser")) {
      // Nothing measurable here, so the answer is taken at face value rather
      // than failing someone for a browser we could not recognise.
      setProblem(null);
      onPass();
      return;
    }

    if (accepted.some((a) => norm(a) === norm(raw) || norm(raw).includes(norm(a)))) {
      setProblem(null);
      onPass();
    } else {
      setProblem("Not quite. Look again at your own screen.");
    }
  }, [value, step, live, liveText, onPass]);

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          placeholder="Type what you see"
        />
        <button onClick={submit} className={BTN}>
          Check
        </button>
      </div>
      {problem && <p className="mt-2 text-sm font-medium text-red-700">{problem}</p>}
      {unsupported && (
        <p className="mt-3 text-sm text-gray-600">
          This browser will not tell a web page about the battery, so I cannot check your answer against it. I will take
          your word for it.
        </p>
      )}
    </div>
  );
}

/** A real key combination on the real keyboard. */
export function KeysCheck({ step, onPass }: CheckProps) {
  const [hit, setHit] = useState(false);
  const combo = (step.keys ?? "").toLowerCase();

  useEffect(() => {
    const parts = combo.split("+").map((p) => p.trim());
    const needMod = parts.includes("ctrl") || parts.includes("cmd");
    const needShift = parts.includes("shift");
    const needAlt = parts.includes("alt");
    const key = parts[parts.length - 1];

    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (needMod !== mod) return;
      if (needShift !== e.shiftKey) return;
      if (needAlt !== e.altKey) return;
      if (e.key.toLowerCase() !== key) return;
      e.preventDefault();
      setHit(true);
      setTimeout(onPass, 300);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, onPass]);

  return (
    <div className={CARD}>
      {step.detail && <p className="mb-4 leading-relaxed text-gray-700">{step.detail}</p>}
      <div className="flex items-center gap-3">
        <kbd className="rounded border-2 border-gray-400 bg-gray-100 px-3 py-1.5 font-mono text-sm font-bold">
          {step.keys}
        </kbd>
        <span className={hit ? "font-semibold text-green-700" : "text-gray-500"}>
          {hit ? "Got it." : "Waiting for that key…"}
        </span>
      </div>
    </div>
  );
}
