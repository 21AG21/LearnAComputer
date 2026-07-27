"use client";

import GuidedCalendarTask from "../GuidedCalendarTask";

interface CalendarAppProps {
  initialView?: "calendar" | "reminders";
}

export default function CalendarApp({ initialView = "calendar" }: CalendarAppProps) {
  return (
    <GuidedCalendarTask
      goal="" steps={[]} freePlay onResult={() => {}}
      initialView={initialView === "calendar" ? "month" : "reminders"}
    />
  );
}
