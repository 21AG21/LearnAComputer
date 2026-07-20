"use client";

import { useState } from "react";
import FakeDesktop, { type DesktopAppId, APP_TITLES } from "./FakeDesktop";

interface DesktopLaunchProps {
  app: DesktopAppId;
  children: React.ReactNode;
}

export default function DesktopLaunch({ app, children }: DesktopLaunchProps) {
  const [launched, setLaunched] = useState(false);

  if (launched) return <>{children}</>;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="shrink-0 bg-[#1d2733] text-white px-4 py-3 text-center font-semibold text-lg">
        Open <span className="text-yellow-300">{APP_TITLES[app]}</span> — click the glowing icon in the dock
      </div>
      <div className="flex-1 relative min-h-0">
        <FakeDesktop
          highlightApp={app}
          interceptApps={[app]}
          onAppOpened={(opened) => {
            if (opened === app) setLaunched(true);
          }}
        />
      </div>
    </div>
  );
}
