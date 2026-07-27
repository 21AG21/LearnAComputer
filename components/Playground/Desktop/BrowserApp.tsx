"use client";

import BrowserSimulator from "../BrowserSimulator";
import { NoConnectionIcon } from "../Icons";

interface BrowserAppProps {
  onClose: () => void;
  onMinimize: () => void;
  noWifi?: boolean;
}

export default function BrowserApp({ onClose, onMinimize, noWifi = false }: BrowserAppProps) {
  return (
    <BrowserSimulator onExit={onClose} onMinimize={onMinimize} bezel={false} showControls={false}>
      {noWifi ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
          <NoConnectionIcon size={40} className="text-gray-400" />
          <p className="text-xl font-bold text-red-600">No WiFi</p>
          <p className="text-gray-500 text-sm">Connect to a network to browse.</p>
        </div>
      ) : (
        // A new tab page. This used to be an empty white div, so a learner told to
        // "open any four apps from the dock" opened the browser onto nothing at all.
        <div className="h-full bg-white overflow-auto p-6">
          <p className="text-center text-sm font-semibold text-gray-400 mb-4">New Tab</p>
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-3">
            {[
              { name: "Search", host: "google.com", tint: "#dbeafe" },
              { name: "Wikipedia", host: "wikipedia.org", tint: "#e5e8ee" },
              { name: "Weather", host: "weather.com", tint: "#d9edfb" },
              { name: "Library", host: "citylibrary.example", tint: "#fdeccd" },
              { name: "Recipes", host: "recipebox.example", tint: "#fde0e4" },
              { name: "Gardening", host: "gardeningtips.example", tint: "#dcf2e3" },
            ].map((site) => (
              <div key={site.host} className="text-center">
                <div
                  className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold text-slate-700"
                  style={{ background: site.tint, border: "1px solid rgba(15,23,42,0.08)" }}
                >
                  {site.name.charAt(0)}
                </div>
                <p className="text-[11px] font-medium text-gray-700 leading-tight">{site.name}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            Type an address in the bar above to visit a site.
          </p>
        </div>
      )}
    </BrowserSimulator>
  );
}
