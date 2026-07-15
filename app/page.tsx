import Link from "next/link";
import DrDigital from "@/components/DrDigital";
import { getAllLessons } from "@/lib/lessons";

export default function Home() {
  const firstLesson = getAllLessons()[0];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Welcome to LearnAComputer</h1>
      <DrDigital message="Hi, I'm Dr. Digital! I'll be with you every step of the way as you learn to use a computer with confidence. Ready to start?" />
      <div className="flex gap-3">
        <Link href={`/lessons/${firstLesson.slug}`} className="inline-block border rounded px-4 py-2 font-semibold">
          Begin Unit 1
        </Link>
        <Link href="/lessons" className="inline-block border rounded px-4 py-2">
          Browse lessons
        </Link>
      </div>
    </div>
  );
}
