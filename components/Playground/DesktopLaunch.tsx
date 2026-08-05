"use client";

import { useState } from "react";
import FakeDesktop, { type DesktopAppId, APP_TITLES } from "./FakeDesktop";
import { PhoneHomeProvider, useIsPhone } from "./SimFormFactor";

interface DesktopLaunchProps {
  app: DesktopAppId;
  /** Receives a callback that returns the learner to the desktop, for sims with a closable window. */
  children: React.ReactNode | ((exit: () => void) => React.ReactNode);
}

export default function DesktopLaunch({ app, children }: DesktopLaunchProps) {
  const isPhone = useIsPhone();
  const [launched, setLaunched] = useState(false);

  if (launched) {
    const body = typeof children === "function" ? children(() => setLaunched(false)) : children;
    // On a phone, "go home" means putting the app away and coming back to the
    // icons — which is this component's own `launched` flag. `SimulatorFrame`
    // draws the bar; it finds the way back here.
    return isPhone ? <PhoneHomeProvider value={() => setLaunched(false)}>{body}</PhoneHomeProvider> : <>{body}</>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Two lines of 18px type is a lot of a phone screen to spend saying
          "tap the glowing icon", so the phone gets one short line at 15px. The
          verb changes too: there is no clicking on a touch screen, and the icons
          are on the home screen rather than in a dock. */}
      <div
        className={`shrink-0 bg-[#1d2733] text-center font-semibold text-white ${
          isPhone ? "px-3 py-2 text-[15px]" : "px-4 py-3 text-lg"
        }`}
      >
        {isPhone ? (
          <>Tap <span className="text-yellow-300">{APP_TITLES[app]}</span> to open it</>
        ) : (
          <>Open <span className="text-yellow-300">{APP_TITLES[app]}</span> — click the glowing icon in the dock</>
        )}
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
