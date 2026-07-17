"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/** Keying on pathname forces a remount on every navigation, replaying the fade-in. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <main key={pathname} className="flex-1 min-h-0 animate-fade-in">
      {children}
    </main>
  );
}
