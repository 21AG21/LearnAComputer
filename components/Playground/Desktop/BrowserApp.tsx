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
        <div className="h-full bg-white overflow-auto p-5">
          <p className="text-center text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">Favourites</p>
          <div className="mx-auto grid max-w-md grid-cols-4 gap-3">
            {[
              { name: "Search", host: "google.com", bg: "#dbeafe", fg: "#1d4ed8", letter: "G" },
              { name: "Wikipedia", host: "wikipedia.org", bg: "#e5e8ee", fg: "#374151", letter: "W" },
              { name: "Weather", host: "weather.com", bg: "#bae6fd", fg: "#0369a1", letter: "W" },
              { name: "News", host: "dailynews.example", bg: "#fde0e4", fg: "#9f1239", letter: "N" },
              { name: "Library", host: "citylibrary.example", bg: "#fef3c7", fg: "#92400e", letter: "L" },
              { name: "Recipes", host: "recipebox.example", bg: "#fed7aa", fg: "#92400e", letter: "R" },
              { name: "Gardening", host: "gardeningtips.example", bg: "#dcf2e3", fg: "#166534", letter: "G" },
              { name: "Pet News", host: "petnews.example", bg: "#fce7f3", fg: "#9d174d", letter: "P" },
            ].map((site) => (
              <div key={site.host} className="text-center">
                <div
                  className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black"
                  style={{ background: site.bg, color: site.fg, border: "1px solid rgba(15,23,42,0.08)" }}
                >
                  {site.letter}
                </div>
                <p className="text-[11px] font-medium text-gray-600 leading-tight">{site.name}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-gray-400">
            Type an address in the bar above to visit a site.
          </p>
        </div>
      )}
    </BrowserSimulator>
  );
}
