"use client";

import { useEffect, useState } from "react";
import DrDigital from "@/components/DrDigital";
import { getCompletedSlugs } from "@/lib/progress";

const START_MESSAGE =
  "Hi, I'm Dr. Digital! I'll be with you every step of the way as you learn to use a computer with confidence. Ready to start?";

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
        "Welcome back! You've completed every lesson in the course — amazing work. Feel free to revisit any lesson from the Lessons page, or reset your progress from the Dashboard to start fresh."
      );
    } else {
      setMessage(`Welcome back! You've completed ${done} of ${totalLessons} lessons so far. Ready to pick up where you left off?`);
    }
  }, [totalLessons]);

  return <DrDigital message={message} />;
}
