"use client";

import GuidedBrowserTask from "../GuidedBrowserTask";
import { NoConnectionIcon } from "../Icons";

/** The dock's Browser is the same browser Unit 4 teaches — free play, no steps. */
export default function BrowserApp({ noWifi = false }: { noWifi?: boolean }) {
  if (noWifi) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
        <NoConnectionIcon size={40} className="text-gray-400" />
        <p className="text-xl font-bold text-red-600">No WiFi</p>
        <p className="text-gray-500 text-sm">Connect to a network to browse.</p>
      </div>
    );
  }
  return <GuidedBrowserTask goal="" steps={[]} freePlay onResult={() => {}} />;
}
