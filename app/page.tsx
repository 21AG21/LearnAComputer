import Link from "next/link";
import Image from "next/image";
import HomeGreeting from "@/components/HomeGreeting";
import HomeProgress from "@/components/HomeProgress";
import UnitGrid, { type UnitCard } from "@/components/UnitGrid";
import SiteFooter from "@/components/SiteFooter";
import { getModuleRoutes, getAllLessons } from "@/lib/lessons";
import { photoSrc } from "@/lib/photoAssets";

const HOW_IT_WORKS = [
  {
    title: "Practice first",
    body: "Every lesson comes with a simulated computer. Click anything you like in it. None of it is your real machine, so nothing you do is a mistake.",
  },
  {
    title: "Then do it for real",
    body: "Each unit ends with a mission on the computer you are actually sitting at, and the page checks your work.",
  },
  {
    title: "Nothing is graded",
    body: "Progress is only there to remember where you were. Redo any lesson, in any order, as often as you like.",
  },
];

export default function Home() {
  const routes = getModuleRoutes();
  const firstModule = routes[0];
  const totalLessons = getAllLessons().length;

  const units: UnitCard[] = [];
  for (const route of routes) {
    let card = units.find((u) => u.unit === route.unit);
    if (!card) {
      // First module of the unit — the card links straight into it rather than
      // dropping the learner at the top of the whole catalog.
      card = { unit: route.unit, href: `/lessons/${route.moduleSlug}`, moduleCount: 0, slugs: [] };
      units.push(card);
    }
    card.moduleCount += 1;
    card.slugs.push(...route.subLessons.map((l) => l.slug));
  }

  const moduleSummaries = routes.map((r) => ({
    unit: r.unit,
    module: r.module,
    moduleSlug: r.moduleSlug,
    slugs: r.subLessons.map((l) => l.slug),
  }));

  return (
    <div className="h-full overflow-y-auto">
      <header className="relative h-56 w-full sm:h-72">
        <Image
          src={photoSrc("mountain-dawn")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1400px] px-6 pb-6 sm:px-8">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Welcome to LearnAComputer</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              {totalLessons} lessons across {units.length} units, on a practice computer you
              cannot break.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
          <div className="min-w-0 space-y-8">
            <div className="space-y-6">
              <HomeGreeting totalLessons={totalLessons} />
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/lessons/${firstModule.moduleSlug}`}
                  className="inline-block rounded border border-gray-300 px-4 py-2 font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Begin Unit 1
                </Link>
                <Link
                  href="/lessons"
                  className="inline-block rounded border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Browse lessons
                </Link>
              </div>
            </div>

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                What you will learn
              </h2>
              <div className="mt-3">
                <UnitGrid units={units} />
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <HomeProgress modules={moduleSummaries} />

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                How this works
              </h2>
              <dl className="mt-3 space-y-4">
                {HOW_IT_WORKS.map((item) => (
                  <div key={item.title}>
                    <dt className="text-sm font-semibold">{item.title}</dt>
                    <dd className="mt-0.5 text-sm leading-snug text-gray-500 dark:text-gray-400">
                      {item.body}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
