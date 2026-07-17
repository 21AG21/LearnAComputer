import Link from "next/link";
import HomeGreeting from "@/components/HomeGreeting";
import { getModuleRoutes, getAllLessons } from "@/lib/lessons";

export default function Home() {
  const firstModule = getModuleRoutes()[0];
  const totalLessons = getAllLessons().length;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Welcome to LearnAComputer</h1>
      <HomeGreeting totalLessons={totalLessons} />
      <div className="flex gap-3">
        <Link
          href={`/lessons/${firstModule.moduleSlug}`}
          className="inline-block border rounded px-4 py-2 font-semibold"
        >
          Begin Unit 1
        </Link>
        <Link href="/lessons" className="inline-block border rounded px-4 py-2">
          Browse lessons
        </Link>
      </div>
    </div>
  );
}
