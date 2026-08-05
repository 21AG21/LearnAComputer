import type { Metadata } from "next";
import PhoneCourse from "@/components/Phone/PhoneCourse";
import { PHONE_LESSON_SLUGS } from "@/lib/phoneCourse";
import { getLessonBySlug, type Lesson } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "On Your Phone — LearnAComputer",
  description:
    "The whole hands-on course on a phone or tablet: the same practice computer, the same ten apps, the same lessons, laid out for a screen you hold in one hand.",
};

/**
 * Resolves the lessons the phone course borrows, on the server.
 *
 * The curriculum in `lib/phoneCourse.ts` is a playlist of slugs; the lesson JSON
 * behind them is read with `fs`, which a client component cannot do. Reading it
 * here rather than through a `fetch` keeps the page static — the whole route
 * prerenders — and means a slug that does not exist shows up as a disabled row a
 * reviewer can see, rather than an empty activity nobody notices.
 */
export default function PhonePage() {
  const lessons: Record<string, Lesson> = {};
  for (const slug of PHONE_LESSON_SLUGS) {
    const lesson = getLessonBySlug(slug);
    if (lesson) lessons[slug] = lesson;
  }
  return <PhoneCourse lessons={lessons} />;
}
