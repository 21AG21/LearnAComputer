"use client";

import { useEffect, useState } from "react";
import DrDigital from "@/components/DrDigital";
import { getCompletedSlugs } from "@/lib/progress";

const START_MESSAGE =
  "Hi, I'm Dr. Digital. I'll take you through this one lesson at a time, on a practice computer where nothing you do can break anything. Ready to start?";

interface HomeGreetingProps {
  totalLessons: number;
}

export default function HomeGreeting({ totalLessons }: HomeGreetingProps) {
  const [message, setMessage] = useState(START_MESSAGE);

  useEffect(() => {
    const done = getCompletedSlugs().length;
    if (done === 0) {
      setMessage(START_MESSAGE);
    } else if (done >= totalLessons) {
      setMessage(
        "Welcome back. You have finished every lesson in the course. Any of them can be done again from the Lessons page, or you can clear your progress from the Dashboard and start over."
      );
    } else {
      setMessage(`Welcome back. That is ${done} of ${totalLessons} lessons done. Shall we pick up where you left off?`);
    }
  }, [totalLessons]);

  return <DrDigital message={message} />;
}
