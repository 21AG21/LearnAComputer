import Image from "next/image";

export default function FunnyCatVideoPage() {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-xl mx-auto px-6 py-8 space-y-4">
        <div className="border-b-2 border-gray-800 pb-2">
          <p className="text-xs font-semibold text-gray-500">PET NEWS DAILY · CATS</p>
        </div>
        <h1 className="text-2xl font-black leading-tight">Local Cat Judges Neighbor Without Comment</h1>
        <p className="text-sm text-gray-500">By Staff Correspondent, Cat Desk · Updated 4 minutes ago</p>
        <div className="flex justify-center my-4">
          <div className="relative w-44 h-72">
            <Image src="/playgrounds/Cat2.png" alt="Judgmental cat" fill sizes="176px" className="object-contain rounded-lg" />
          </div>
        </div>
        <p className="text-xs text-gray-400 italic -mt-2">Pictured: the cat in question. No comment was forthcoming.</p>
        <p className="text-sm text-gray-700 leading-relaxed">
          A local cat, known only as &quot;Whiskers&quot; by neighbors who have not been formally introduced, spent approximately forty-five minutes on a windowsill yesterday, studying a passing cyclist with an expression that implied serious reservations.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          &quot;I waved,&quot; confirmed the cyclist, who asked to remain anonymous. &quot;The cat did not wave back. The cat has never waved back.&quot;
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          The incident follows a series of similar events spanning three years, including the Great Staring Episode of 2023 and what sources describe as &quot;a very pointed tail-flick&quot; directed at a delivery driver in February.
        </p>
        <div className="border-t pt-4 mt-2">
          <p className="font-semibold text-sm mb-3">1 Comment</p>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center shrink-0 font-bold text-sm">D</div>
            <div>
              <p className="text-sm font-semibold">GoodDog1 <span className="text-gray-400 font-normal text-xs">· 2 hours ago</span></p>
              <p className="text-sm text-gray-700">I also waved and was also ignored. I choose to believe the cat is simply very busy.</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center pt-4 border-t">
          You opened this page in a new tab — great right-clicking! Close this tab to return to your lesson.
        </p>
      </div>
    </div>
  );
}
