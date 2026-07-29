import Image from "next/image";

interface LessonMediaProps {
  src: string;
  alt: string;
  caption?: string;
}

/**
 * The picture beside a lesson that has no activity.
 *
 * There is deliberately no border. `object-contain` letterboxes the picture
 * inside its box, so a border drawn on that box is a frame around mostly empty
 * space — a tall gray rectangle with a small image floating in the middle of
 * it. The art carries its own soft background, and the pane it sits in already
 * has a left border and a tinted ground, which is all the framing it needs.
 *
 * `max-w-lg` keeps the picture from becoming the loudest thing on the page on a
 * wide monitor; the lesson text is what the learner is here for.
 */
export default function LessonMedia({ src, alt, caption }: LessonMediaProps) {
  return (
    <div className="w-full min-w-0 h-full flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative w-full max-w-lg flex-1 min-h-0">
        <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 100vw, 512px" className="object-contain" />
      </div>
      {caption && <p className="max-w-lg text-center text-sm text-gray-500 dark:text-gray-400">{caption}</p>}
    </div>
  );
}
