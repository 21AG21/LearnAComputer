"use client";

import { useEffect, useState } from "react";
import { ImageIcon, MusicIcon } from "../Icons";
import type { Item } from "./filesData";
import { photoSrc } from "@/lib/photoAssets";

// ── Image map ─────────────────────────────────────────────────────────────────

const IMAGE_SRC: Record<string, string> = {
  "VacationPhoto.png": photoSrc("tropical-beach"),
  "Sunset.png": photoSrc("sunset-beach"),
  "img_20250104_FINAL(2).jpg": photoSrc("misty-morning"),
};

// ── Budget data ───────────────────────────────────────────────────────────────

const BUDGET_ROWS = [
  { label: "Rent",          amount: 1200 },
  { label: "Groceries",     amount:  340 },
  { label: "Utilities",     amount:   85 },
  { label: "Entertainment", amount:   75 },
];

// ── PDF content ───────────────────────────────────────────────────────────────

const PDF_CONTENT: Record<string, { title: string; lines: string[] }> = {
  "TaxReturn.pdf": {
    title: "2025 Tax Return",
    lines: [
      "Taxpayer: Dr. Digital",
      "Filing Status: Single",
      "",
      "Wages: $52,000",
      "Interest Income: $120",
      "Total Income: $52,120",
      "",
      "Standard Deduction: $14,600",
      "Taxable Income: $37,520",
      "",
      "Total Tax Owed: $4,280",
      "Withheld from paychecks: $5,100",
      "Refund Due: $820",
    ],
  },
  "Resume.pdf": {
    title: "Resume — Dr. Digital",
    lines: [
      "Computer Science Expert",
      "",
      "EXPERIENCE",
      "Lead Teacher, Learn a Computer  (2020–present)",
      "  Taught computer skills to thousands of students.",
      "",
      "Software Developer, TechCorp  (2015–2020)",
      "  Built applications used by millions of users.",
      "",
      "EDUCATION",
      "B.S. Computer Science, State University, 2015",
      "",
      "SKILLS",
      "Typing · File management · Internet browsing · Email",
    ],
  },
};

// ── Root dispatch ─────────────────────────────────────────────────────────────

export default function FileViewer({ item }: { item: Item }) {
  const ext = item.ext ?? "";
  if (ext === "txt")            return <TextViewer item={item} editable />;
  if (ext === "docx")           return <TextViewer item={item} editable={false} />;
  if (ext === "png" || ext === "jpg") return <ImageViewer item={item} />;
  if (ext === "xlsx")           return <SheetViewer />;
  if (ext === "pdf")            return <PdfViewer item={item} />;
  if (ext === "mp3")            return <MusicViewer item={item} />;
  return (
    <div className="h-full flex items-center justify-center text-gray-500 sim-dark:text-gray-400 sim-dark:bg-gray-900 text-sm p-8 text-center">
      No preview available for this file type.
    </div>
  );
}

// ── Text / docx ───────────────────────────────────────────────────────────────

function TextViewer({ item, editable }: { item: Item; editable: boolean }) {
  const [text, setText] = useState(item.body ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="h-full flex flex-col">
      {editable && (
        <div className="shrink-0 bg-gray-100 sim-dark:bg-gray-800 border-b-2 border-gray-300 sim-dark:border-gray-700 px-3 py-1.5 flex items-center justify-between">
          <span className="text-xs text-gray-500 sim-dark:text-gray-400 font-medium">{item.name}</span>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded border border-blue-800 hover:bg-blue-700 transition-colors"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      )}
      <textarea
        className="flex-1 w-full p-4 font-mono text-sm resize-none outline-none bg-white sim-dark:bg-gray-900 sim-dark:text-gray-100 leading-relaxed"
        value={text}
        onChange={(e) => { if (editable) setText(e.target.value); }}
        readOnly={!editable}
        spellCheck={false}
      />
    </div>
  );
}

// ── Image ─────────────────────────────────────────────────────────────────────

function ImageViewer({ item }: { item: Item }) {
  const src = IMAGE_SRC[item.name];
  if (!src) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100 sim-dark:bg-gray-800 gap-3 text-gray-500 sim-dark:text-gray-400">
        <ImageIcon size={48} />
        <p className="text-sm font-medium">{item.name}</p>
      </div>
    );
  }
  return (
    <div className="h-full flex items-center justify-center bg-gray-100 sim-dark:bg-gray-800 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={item.name} className="max-h-full max-w-full object-contain rounded shadow-md" />
    </div>
  );
}

// ── Spreadsheet ───────────────────────────────────────────────────────────────

function SheetViewer() {
  const total = BUDGET_ROWS.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="h-full overflow-auto bg-gray-50 sim-dark:bg-gray-800 p-4">
      <p className="text-xs text-gray-500 sim-dark:text-gray-300 font-semibold mb-3 uppercase tracking-wide">Monthly Budget</p>
      {/* A rendered document keeps its own colors — see `data-sim-paper`. */}
      <table data-sim-paper className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-green-700 text-white">
            <th className="border border-green-900 px-3 py-1.5 text-left font-semibold">Category</th>
            <th className="border border-green-900 px-3 py-1.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {BUDGET_ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-green-50"}>
              <td className="border border-gray-300 px-3 py-1.5">{row.label}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                ${row.amount.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className="bg-yellow-50 font-bold">
            <td className="border-2 border-gray-400 px-3 py-1.5">Total</td>
            <td className="border-2 border-gray-400 px-3 py-1.5 text-right tabular-nums">
              ${total.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function PdfViewer({ item }: { item: Item }) {
  const [zoom, setZoom] = useState(100);
  const content = PDF_CONTENT[item.name] ?? {
    title: item.name.replace(".pdf", ""),
    lines: (item.body ?? "").split("\n"),
  };
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 bg-gray-100 sim-dark:bg-gray-800 border-b border-gray-300 sim-dark:border-gray-700 flex items-center justify-between px-4 py-1.5">
        <span className="text-xs font-semibold text-gray-600 sim-dark:text-gray-300">Page 1 of 1</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(z - 25, 50))} className="w-7 h-7 border border-gray-300 sim-dark:border-gray-600 rounded bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-600 text-sm">
            −
          </button>
          <span className="text-xs font-semibold tabular-nums w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 25, 200))} className="w-7 h-7 border border-gray-300 sim-dark:border-gray-600 rounded bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-600 text-sm">
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-200 sim-dark:bg-gray-900 p-4">
        <div
          data-sim-paper
          className="bg-white shadow-md rounded p-6 mx-auto"
          style={{ fontSize: `${zoom}%`, maxWidth: 480 }}
        >
          <h1 className="text-xl font-black mb-4 border-b pb-3">{content.title}</h1>
          <div className="space-y-0.5 text-sm text-gray-800 leading-relaxed font-mono">
            {content.lines.map((line, i) => (
              <p key={i}>{line || " "}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Music player ──────────────────────────────────────────────────────────────

const SONG_DURATION = 204; // 3:24

function PlaySVG() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden>
      <polygon points="5,2 19,11 5,20" />
    </svg>
  );
}
function PauseSVG() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden>
      <rect x="4"  y="2" width="5" height="18" rx="1" />
      <rect x="13" y="2" width="5" height="18" rx="1" />
    </svg>
  );
}

function MusicViewer({ item }: { item: Item }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= SONG_DURATION) { setPlaying(false); return 0; }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  const pct = (progress / SONG_DURATION) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-gray-800 to-gray-900 text-white p-6 select-none">
      {/* Album art */}
      <div className="w-36 h-36 rounded-2xl bg-gray-700 border-2 border-gray-600 flex items-center justify-center shadow-2xl text-gray-400">
        <MusicIcon size={64} />
      </div>

      {/* Title */}
      <div className="text-center">
        <p className="font-black text-lg leading-tight">{item.name.replace(".mp3", "")}</p>
        <p className="text-gray-400 text-sm mt-0.5">Dr. Digital</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div
          className="w-full h-1.5 bg-gray-600 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setProgress(Math.round(frac * SONG_DURATION));
          }}
        >
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 tabular-nums">
          <span>{fmt(progress)}</span>
          <span>{fmt(SONG_DURATION)}</span>
        </div>
      </div>

      {/* Play / Pause */}
      <button
        onClick={() => setPlaying((p) => !p)}
        className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <PauseSVG /> : <PlaySVG />}
      </button>
    </div>
  );
}
