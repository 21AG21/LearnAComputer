import Image from "next/image";

export default function FunnyCatVideoPage() {
  return (
    <div className="h-full overflow-y-auto flex flex-col items-center gap-4 py-10">
      <h1 className="text-3xl font-bold">Funny Cat Video</h1>
      <Image
        src="/playgrounds/Cat2.png"
        alt="A funny cat"
        width={300}
        height={480}
        className="h-64 w-auto object-contain"
      />
      <p className="text-lg text-gray-600">You opened this page in a new tab — great right-clicking!</p>
      <p className="text-gray-500">You can close this tab to go back to your lesson.</p>
    </div>
  );
}
