import CatIllustration from "@/components/Playground/CatIllustration";

export default function FunnyCatVideoPage() {
  return (
    <div className="h-full overflow-y-auto flex flex-col items-center gap-4 py-10">
      <h1 className="text-3xl font-bold">Funny Cat Video</h1>
      <CatIllustration className="w-64 h-64" />
      <p className="text-lg text-gray-600">You opened this page in a new tab — great right-clicking!</p>
      <p className="text-gray-500">You can close this tab to go back to your lesson.</p>
    </div>
  );
}
