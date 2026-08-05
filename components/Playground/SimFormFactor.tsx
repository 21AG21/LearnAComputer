"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Is the simulated computer a laptop or a phone?
 *
 * ## Why this is a context and not a prop
 *
 * The phone course is meant to be *the same computer*, in the learner's hand:
 * the same wallpaper, the same ten apps behind the same ten icons, the same
 * Messages threads and the same Settings panels. The only honest way to deliver
 * that is to render the actual simulator rather than a second one that looks
 * like it — because a copy drifts, and this repo has a whole audit
 * (`docs/SAME_ICON_AUDIT.md`) about what that drift costs.
 *
 * But the components that would have to be told "you are a phone now" are not
 * adjacent. A lesson renders a `Guided…Task`, which renders `DesktopLaunch`,
 * which renders `FakeDesktop`, which renders `Dock` and `AppBody` and
 * `SimulatorFrame`. Threading a `variant` prop through that chain means touching
 * every guided task in the course and giving each of them a prop that means
 * nothing to the thing that renders it. A context is read only by the two or
 * three components whose *layout* actually differs, and every lesson in
 * `content/lessons/` keeps working, unedited, in either shape.
 *
 * ## The default is what protects the laptop course
 *
 * Nothing outside `components/Phone/` provides this context, so every existing
 * lesson reads `"desktop"` and takes the identical code path it always did. The
 * phone branches are additive; they cannot regress the 145 activities the laptop
 * course is made of. `solve-check`, `desktop-check` and `ring-check` are the
 * proof of that, and all three are run after any change in here.
 */
export type SimFormFactor = "desktop" | "phone";

const Ctx = createContext<SimFormFactor>("desktop");

export function SimFormFactorProvider({ value, children }: { value: SimFormFactor; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSimFormFactor(): SimFormFactor {
  return useContext(Ctx);
}

/** Shorthand for the common `useSimFormFactor() === "phone"` test. */
export function useIsPhone(): boolean {
  return useContext(Ctx) === "phone";
}

/**
 * Where the phone's home bar goes, when there is anywhere to go.
 *
 * `DesktopLaunch` is the only thing that knows: it is the component holding the
 * "the app is open" flag, and going home means putting that flag back. But the
 * bar itself is drawn much further down, by `SimulatorFrame`, with the guided
 * simulator in between — so the exit is handed down rather than threaded through
 * every task component as a prop none of them would otherwise have.
 *
 * `null` where there is no home to go to, and the bar is then drawn as a rule
 * rather than as a control. A home bar that does nothing is worse than none.
 */
const HomeCtx = createContext<(() => void) | null>(null);

export function PhoneHomeProvider({ value, children }: { value: (() => void) | null; children: ReactNode }) {
  return <HomeCtx.Provider value={value}>{children}</HomeCtx.Provider>;
}

export function usePhoneHome(): (() => void) | null {
  return useContext(HomeCtx);
}
