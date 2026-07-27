import Image from "next/image";

interface LessonMediaProps {
  src: string;
  alt: string;
  caption?: string;
}

export default function LessonMedia({ src, alt, caption }: LessonMediaProps) {
  return (
    <div className="w-full min-w-0 h-full flex flex-col items-center justify-center p-8 gap-4">
      <div className="relative w-full max-w-xl flex-1 min-h-0">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-contain rounded-xl border border-gray-200"
        />
      </div>
      {caption && <p className="text-sm text-gray-500 text-center">{caption}</p>}
    </div>
  );
}
