"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DrDigital from "@/components/DrDigital";
import VideoPlayer from "@/components/VideoPlayer";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import { markComplete } from "@/lib/progress";
import type { ModuleRoute } from "@/lib/lessons";

type AttemptState = "unattempted" | "failed" | "success";

interface LessonModuleRunnerProps {
  route: ModuleRoute;
  nextModuleSlug: string | null;
}

export default function LessonModuleRunner({ route, nextModuleSlug }: LessonModuleRunnerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [attemptState, setAttemptState] = useState<AttemptState>("unattempted");

  const subLesson = route.subLessons[index];
  const isLastSubLesson = index === route.subLessons.length - 1;
  // "none"/"placeholder" sub-lessons have nothing to pass — advancing is never gated on them.
  const hasGate = subLesson.playgroundTask.type !== "none" && subLesson.playgroundTask.type !== "placeholder";
  const canAdvance = !hasGate || attemptState === "success";

  useEffect(() => {
    setAttemptState("unattempted");
  }, [subLesson.slug]);

  function handleResult(success: boolean) {
    setAttemptState(success ? "success" : "failed");
    if (success) markComplete(subLesson.slug);
  }

  function handleNext() {
    if (!hasGate) markComplete(subLesson.slug);
    if (!isLastSubLesson) {
      setIndex((i) => i + 1);
    } else if (nextModuleSlug) {
      router.push(`/lessons/${nextModuleSlug}`);
    } else {
      router.push("/lessons");
    }
  }

  const drDigitalMessage =
    attemptState === "success"
      ? subLesson.drDigitalSuccess
      : attemptState === "failed"
      ? subLesson.drDigitalHint
      : subLesson.drDigitalIntro;

  const drDigitalMood = attemptState === "success" ? "success" : attemptState === "failed" ? "hint" : "neutral";

  return (
    <div className="h-full flex">
      <div className="w-full lg:max-w-xl shrink-0 overflow-y-auto p-6 space-y-6">
        <div>
          <p className="text-sm text-gray-500">
            {route.module} &middot; {index + 1} of {route.subLessons.length}
          </p>
          <h1 className="text-2xl font-bold">{subLesson.title}</h1>
        </div>

        <DrDigital message={drDigitalMessage} mood={drDigitalMood} />
        <VideoPlayer videoUrl={subLesson.videoUrl} title={subLesson.title} />

        {subLesson.playgroundTask.type === "placeholder" && (
          <p className="text-sm text-gray-500 border rounded p-3 bg-gray-50">This activity is coming soon.</p>
        )}

        {canAdvance && (
          <button onClick={handleNext} className="border rounded px-4 py-2 font-semibold">
            {isLastSubLesson && !nextModuleSlug ? "Finish" : "Next"}
          </button>
        )}
      </div>

      <div className="hidden lg:block flex-1 min-w-0 p-4">
        <LessonPlaygroundPane key={subLesson.slug} task={subLesson.playgroundTask} onResult={handleResult} />
      </div>
    </div>
  );
}
