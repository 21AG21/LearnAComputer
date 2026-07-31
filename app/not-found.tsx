import Link from "next/link";
import DrDigitalAvatar from "@/components/DrDigitalAvatar";

/**
 * Next's own 404 is a bare black-and-white line of text, which reads to a
 * beginner like something they broke. This one says what happened, says it is
 * not their fault, and gives them somewhere to click.
 */
export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="max-w-md text-center">
        <DrDigitalAvatar className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">This page is not here</h1>
        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
          Either the address has a typo in it, or the page moved. Nothing is broken and nothing you did caused this —
          your progress is exactly where you left it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/lessons"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Back to the lessons
          </Link>
          <Link
            href="/"
            className="rounded-lg border-2 border-gray-300 px-5 py-2.5 font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
