"use client";

import { useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { CalendarIcon, CheckIcon } from "./Icons";

export type GuidedCalendarStep = {
  say: string;
  action:
    | "select-day" | "create-event" | "set-title" | "set-time" | "set-repeat"
    | "save-event" | "create-reminder" | "set-reminder-text" | "save-reminder"
    | "complete-reminder" | "switch-view" | "select-calendar";
  target?: string;
  value?: string;
};

interface GuidedCalendarTaskProps {
  goal: string;
  steps: GuidedCalendarStep[];
  initialView?: "month" | "reminders";
  onResult: (success: boolean) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  day: number;
  time: string;
  calendar: string;
}

interface Reminder {
  id: string;
  text: string;
  done: boolean;
}

const PRESET_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Doctor Appointment", day: 8, time: "10:00 AM", calendar: "Personal" },
  { id: "e2", title: "Team Meeting", day: 14, time: "2:00 PM", calendar: "Work" },
  { id: "e3", title: "Birthday Party", day: 22, time: "6:00 PM", calendar: "Personal" },
];

const PRESET_REMINDERS: Reminder[] = [
  { id: "r1", text: "Call Mom", done: false },
  { id: "r2", text: "Pick up prescription", done: false },
];

const DAYS_IN_MONTH = 31;
const MONTH_NAME = "July 2026";
const MONTH_START_DOW = 3; // Wednesday (0=Sun)

const REPEAT_OPTIONS = ["None", "Daily", "Weekly", "Monthly", "Yearly"];
const CALENDARS = ["Personal", "Work"];

export default function GuidedCalendarTask({ goal, steps, initialView, onResult }: GuidedCalendarTaskProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [view, setView] = useState<"month" | "day" | "reminders">(initialView ?? "month");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(PRESET_EVENTS);
  const [reminders, setReminders] = useState<Reminder[]>(PRESET_REMINDERS);
  const [activeCalendars, setActiveCalendars] = useState<string[]>(["Personal", "Work"]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [draftEvent, setDraftEvent] = useState({ title: "", time: "", repeat: "None" });
  const [draftReminder, setDraftReminder] = useState("");

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
      case "select-day": return kind === "day-cell" && name === step.target;
      case "create-event": return creatingEvent ? false : kind === "new-event-btn";
      case "set-title": return kind === "event-title";
      case "set-time": return kind === "event-time";
      case "set-repeat": return kind === "event-repeat";
      case "save-event": return kind === "save-event-btn";
      case "create-reminder": return creatingReminder ? false : kind === "new-reminder-btn";
      case "set-reminder-text": return kind === "reminder-text";
      case "save-reminder": return kind === "save-reminder-btn";
      case "complete-reminder": return kind === "reminder-check" && name === step.target;
      case "switch-view": return kind === "view-btn" && name === step.target;
      case "select-calendar": return kind === "calendar-toggle" && name === step.target;
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  function handleSelectDay(day: number) {
    setSelectedDay(day);
    setCreatingEvent(false);
    if (step?.action === "select-day" && (step.target === String(day) || step.target === undefined)) completeStep();
  }

  function handleCreateEvent() {
    setCreatingEvent(true);
    setDraftEvent({ title: "", time: "", repeat: "None" });
    if (step?.action === "create-event") completeStep();
  }

  function handleSaveEvent() {
    if (!draftEvent.title) return;
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: draftEvent.title,
      day: selectedDay ?? 1,
      time: draftEvent.time || "All day",
      calendar: activeCalendars[0] ?? "Personal",
    };
    setEvents((prev) => [...prev, newEvent]);
    setCreatingEvent(false);
    setDraftEvent({ title: "", time: "", repeat: "None" });
    if (step?.action === "save-event") completeStep();
  }

  function handleCreateReminder() {
    setCreatingReminder(true);
    setDraftReminder("");
    if (step?.action === "create-reminder") completeStep();
  }

  function handleSaveReminder() {
    if (!draftReminder.trim()) return;
    const newReminder: Reminder = { id: `rem-${Date.now()}`, text: draftReminder.trim(), done: false };
    setReminders((prev) => [...prev, newReminder]);
    setCreatingReminder(false);
    setDraftReminder("");
    if (step?.action === "save-reminder") completeStep();
  }

  function handleCompleteReminder(id: string, text: string) {
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, done: true } : r));
    if (step?.action === "complete-reminder" && step.target === text) completeStep();
  }

  function handleSwitchView(v: "month" | "day" | "reminders") {
    setView(v);
    setCreatingEvent(false);
    setCreatingReminder(false);
    if (step?.action === "switch-view" && step.target === v) completeStep();
  }

  function handleToggleCalendar(cal: string) {
    setActiveCalendars((prev) => prev.includes(cal) ? prev.filter((c) => c !== cal) : [...prev, cal]);
    if (step?.action === "select-calendar" && step.target === cal) completeStep();
  }

  const dayEvents = (day: number) => events.filter((e) => e.day === day && activeCalendars.includes(e.calendar));

  // Build calendar grid
  const blanks = Array(MONTH_START_DOW).fill(null);
  const days = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  return (
    <SimulatorFrame
      appName="Calendar"
      appIcon={<CalendarIcon size={20} />}
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-36 border-r bg-gray-50 flex flex-col flex-shrink-0">
          {/* View switcher */}
          <div className="p-2 border-b flex flex-col gap-1">
            {(["month", "day", "reminders"] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleSwitchView(v)}
                className={`px-2 py-2 text-xs rounded-lg text-left capitalize transition-all ${view === v ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-600"} ${hl("view-btn", v) ? pulse : ""}`}
              >
                <span className="inline-flex items-center gap-1">{v === "month" ? <CalendarIcon size={12} /> : v === "day" ? <CalendarIcon size={12} /> : <CheckIcon size={12} />} {v === "reminders" ? "Reminders" : v.charAt(0).toUpperCase() + v.slice(1)}</span>
              </button>
            ))}
          </div>
          {/* Calendars */}
          <div className="p-2 border-b">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Calendars</p>
            {CALENDARS.map((cal) => (
              <button
                key={cal}
                onClick={() => handleToggleCalendar(cal)}
                className={`flex items-center gap-2 w-full px-1 py-1 text-xs rounded transition-all hover:bg-gray-100 ${hl("calendar-toggle", cal) ? pulse : ""}`}
              >
                <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${cal === "Personal" ? "bg-blue-500" : "bg-green-500"} ${!activeCalendars.includes(cal) ? "opacity-30" : ""}`} />
                {cal}
              </button>
            ))}
          </div>
          {/* New event / reminder */}
          {view !== "reminders" ? (
            <button
              onClick={handleCreateEvent}
              className={`mx-2 mt-2 px-2 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-all ${hl("new-event-btn") ? pulse : ""}`}
            >
              + New Event
            </button>
          ) : (
            <button
              onClick={handleCreateReminder}
              className={`mx-2 mt-2 px-2 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-all ${hl("new-reminder-btn") ? pulse : ""}`}
            >
              + New Reminder
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Event / Reminder creation form */}
          {creatingEvent && (
            <div className="p-4 border-b bg-blue-50 flex-shrink-0">
              <h3 className="font-semibold text-sm mb-3">New Event {selectedDay ? `— July ${selectedDay}` : ""}</h3>
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={draftEvent.title}
                  onChange={(e) => {
                    setDraftEvent((d) => ({ ...d, title: e.target.value }));
                    if (step?.action === "set-title" && e.target.value.toLowerCase().includes((step.value ?? "").toLowerCase())) completeStep();
                  }}
                  placeholder="Event title"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 ${hl("event-title") ? pulse : ""}`}
                />
                <input
                  value={draftEvent.time}
                  onChange={(e) => {
                    setDraftEvent((d) => ({ ...d, time: e.target.value }));
                    if (step?.action === "set-time" && e.target.value.toLowerCase().includes((step.value ?? "").toLowerCase())) completeStep();
                  }}
                  placeholder="Time (e.g. 2:00 PM)"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 ${hl("event-time") ? pulse : ""}`}
                />
                <select
                  value={draftEvent.repeat}
                  onChange={(e) => {
                    setDraftEvent((d) => ({ ...d, repeat: e.target.value }));
                    if (step?.action === "set-repeat") completeStep();
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 ${hl("event-repeat") ? pulse : ""}`}
                >
                  {REPEAT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEvent}
                    className={`flex-1 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 ${hl("save-event-btn") ? pulse : ""}`}
                  >
                    Save
                  </button>
                  <button onClick={() => setCreatingEvent(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {creatingReminder && (
            <div className="p-4 border-b bg-green-50 flex-shrink-0">
              <h3 className="font-semibold text-sm mb-3">New Reminder</h3>
              <input
                autoFocus
                value={draftReminder}
                onChange={(e) => {
                  setDraftReminder(e.target.value);
                  if (step?.action === "set-reminder-text" && e.target.value.toLowerCase().includes((step.value ?? "").toLowerCase())) completeStep();
                }}
                placeholder="Reminder text"
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-green-400 mb-2 ${hl("reminder-text") ? pulse : ""}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveReminder}
                  className={`flex-1 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 ${hl("save-reminder-btn") ? pulse : ""}`}
                >
                  Save
                </button>
                <button onClick={() => setCreatingReminder(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}

          {/* Month view */}
          {view === "month" && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 pt-3 pb-1 font-semibold text-sm text-gray-700">{MONTH_NAME}</div>
              {/* Day headers */}
              <div className="grid grid-cols-7 px-2 pb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px px-2 pb-3">
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {days.map((day) => {
                  const evs = dayEvents(day);
                  const isSelected = selectedDay === day;
                  const isToday = day === 18;
                  return (
                    <button
                      key={day}
                      onClick={() => handleSelectDay(day)}
                      className={`aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs transition-all hover:bg-blue-50 ${
                        isSelected ? "bg-blue-500 text-white" : isToday ? "bg-blue-100 font-bold" : ""
                      } ${hl("day-cell", String(day)) ? pulse : ""}`}
                    >
                      <span>{day}</span>
                      {evs.slice(0, 1).map((e) => (
                        <span key={e.id} className={`w-1.5 h-1.5 rounded-full mt-0.5 ${e.calendar === "Personal" ? "bg-blue-400" : "bg-green-400"} ${isSelected ? "bg-white" : ""}`} />
                      ))}
                    </button>
                  );
                })}
              </div>
              {/* Selected day events */}
              {selectedDay && (
                <div className="border-t px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500 mb-1">July {selectedDay}</p>
                  {dayEvents(selectedDay).length === 0 ? (
                    <p className="text-xs text-gray-400">No events</p>
                  ) : dayEvents(selectedDay).map((e) => (
                    <div key={e.id} className="flex items-center gap-2 py-1">
                      <span className={`w-2 h-2 rounded-full ${e.calendar === "Personal" ? "bg-blue-500" : "bg-green-500"}`} />
                      <span className="text-xs font-medium">{e.title}</span>
                      <span className="text-xs text-gray-400">{e.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Day view */}
          {view === "day" && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-sm font-semibold text-gray-700 mb-3">Today — July 18, 2026</p>
              {["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"].map((time) => {
                const ev = events.find((e) => e.day === 18 && e.time === time && activeCalendars.includes(e.calendar));
                return (
                  <div key={time} className="flex gap-2 border-t py-1.5 min-h-[36px]">
                    <span className="text-xs text-gray-400 w-14 flex-shrink-0">{time}</span>
                    {ev && (
                      <div className={`flex-1 px-2 py-0.5 rounded text-xs text-white ${ev.calendar === "Personal" ? "bg-blue-500" : "bg-green-500"}`}>{ev.title}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reminders view */}
          {view === "reminders" && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-sm font-semibold text-gray-700 mb-3">Reminders</p>
              <div className="flex flex-col gap-2">
                {reminders.map((r) => (
                  <div key={r.id} className={`flex items-center gap-3 p-3 border rounded-xl ${r.done ? "opacity-50" : ""}`}>
                    <button
                      onClick={() => !r.done && handleCompleteReminder(r.id, r.text)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${r.done ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-400"} ${hl("reminder-check", r.text) ? pulse : ""}`}
                    >
                      {r.done && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className={`text-sm ${r.done ? "line-through text-gray-400" : ""}`}>{r.text}</span>
                  </div>
                ))}
                {reminders.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No reminders</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </SimulatorFrame>
  );
}
