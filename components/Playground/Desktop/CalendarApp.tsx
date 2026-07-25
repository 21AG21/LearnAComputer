"use client";

import { useState } from "react";
import AppWindow from "./AppWindow";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SAMPLE_REMINDERS = [
  { id: 1, text: "Buy groceries", done: false },
  { id: 2, text: "Call the doctor", done: true },
  { id: 3, text: "Read for 20 minutes", done: false },
  { id: 4, text: "Water the plants", done: false },
  { id: 5, text: "Send birthday card", done: true },
];

interface CalendarAppProps {
  onClose?: () => void;
  onMinimize?: () => void;
  showHeader?: boolean;
  initialView?: "calendar" | "reminders";
}

export default function CalendarApp({ onClose = () => {}, onMinimize = () => {}, showHeader, initialView = "calendar" }: CalendarAppProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<"calendar" | "reminders">(initialView);
  const [reminders, setReminders] = useState(SAMPLE_REMINDERS);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  function toggleReminder(id: number) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));
  }

  return (
    <AppWindow title={view === "calendar" ? "Calendar" : "Reminders"} onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      {/* Tab switcher */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={() => setView("calendar")}
          className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${view === "calendar" ? "bg-red-500 text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          Calendar
        </button>
        <button
          onClick={() => setView("reminders")}
          className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${view === "reminders" ? "bg-red-500 text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          Reminders
        </button>
      </div>

      {view === "calendar" ? (
        <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 font-bold text-lg leading-none">‹</button>
            <span className="font-semibold text-gray-800">{MONTH_NAMES[month]} {year}</span>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 font-bold text-lg leading-none">›</button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 text-center">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5 flex-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const todayCell = isToday(d);
              return (
                <button
                  key={d}
                  className={`flex items-center justify-center rounded-full w-7 h-7 mx-auto text-sm font-medium transition-colors ${
                    todayCell
                      ? "bg-red-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center">Open a Calendar lesson to add events.</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {reminders.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleReminder(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${r.done ? "bg-red-500 border-red-500 text-white" : "border-gray-400"}`}>
                  {r.done && <span className="text-[10px] leading-none">✓</span>}
                </span>
                <span className={`text-sm flex-1 ${r.done ? "line-through text-gray-400" : "text-gray-800"}`}>{r.text}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 px-4 py-2">
            <p className="text-xs text-gray-400">Open a Reminders lesson to practice adding your own.</p>
          </div>
        </div>
      )}
    </AppWindow>
  );
}
