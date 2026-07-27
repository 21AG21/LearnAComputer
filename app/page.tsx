import Link from "next/link";
import Image from "next/image";
import HomeGreeting from "@/components/HomeGreeting";
import { getModuleRoutes, getAllLessons } from "@/lib/lessons";
import { unitArt } from "@/lib/unitArt";
import { photoSrc } from "@/lib/photoAssets";

export default function Home() {
  const routes = getModuleRoutes();
  const firstModule = routes[0];
  const totalLessons = getAllLessons().length;
  const units = Array.from(new Set(routes.map((r) => r.unit)));

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative h-56 w-full sm:h-72">
        <Image
          src={photoSrc("mountain-dawn")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Welcome to LearnAComputer</h1>
          <p className="mt-1 text-sm text-white/80">
            {totalLessons} lessons across {units.length} units. Nothing you click can break anything.
          </p>
        </div>
      </div>

      <div className="max-w-3xl space-y-6 p-6">
        <HomeGreeting totalLessons={totalLessons} />
        <div className="flex gap-3">
          <Link
            href={`/lessons/${firstModule.moduleSlug}`}
            className="inline-block rounded border px-4 py-2 font-semibold"
          >
            Begin Unit 1
          </Link>
          <Link href="/lessons" className="inline-block rounded border px-4 py-2">
            Browse lessons
          </Link>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">What you will learn</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {units.map((unit) => (
              <Link
                key={unit}
                href="/lessons"
                className="group relative block h-24 overflow-hidden rounded-lg border border-gray-200"
              >
                <Image
                  src={unitArt(unit)}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
                <span className="absolute inset-x-0 bottom-0 p-2 text-xs font-semibold leading-tight text-white">
                  {unit}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
