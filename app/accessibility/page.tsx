import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Accessibility — LearnAComputer",
  description: "How accessible LearnAComputer is, and where it still falls short.",
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility" updated="27 July 2026">
      <p>
        A course for people who find computers difficult should not itself be difficult to use. This
        page says what the site does well and where it still falls short, because a statement that
        only lists successes is not much use to anyone.
      </p>

      <h2>What works</h2>
      <ul>
        <li>
          <strong>Light and dark mode.</strong> The switch is in the top bar on every page. Your
          choice is remembered, and the site follows your system preference until you set one.
        </li>
        <li>
          <strong>Text scales with your browser.</strong> Zooming with Ctrl and + (or Command and +)
          enlarges the whole site without breaking the layout.
        </li>
        <li>
          <strong>Keyboard navigation.</strong> Links and buttons are real links and buttons, so Tab
          moves between them and Enter activates them.
        </li>
        <li>
          <strong>Labeled controls.</strong> Icon-only buttons carry text labels for screen readers.
        </li>
        <li>
          <strong>No autoplay.</strong> Nothing moves, plays or pops up on its own.
        </li>
      </ul>

      <h2>Where it falls short</h2>
      <ul>
        <li>
          <strong>The practice activities need a mouse or trackpad in most lessons.</strong> Some —
          dragging a file into a folder, dragging a window by its title bar — cannot currently be
          completed with the keyboard alone. Every activity can be skipped, and skipping does not
          block the rest of the course.
        </li>
        <li>
          <strong>The simulator is visual.</strong> It teaches by showing a pretend computer, and a
          screen reader cannot convey a dragged window. The written explanation above each activity
          is designed to stand on its own for that reason.
        </li>
        <li>
          <strong>The site has not been audited against WCAG by an independent party.</strong> We do
          not claim a conformance level we have not tested.
        </li>
      </ul>

      <h2>Accessibility is also a subject here</h2>
      <p>
        <Link href="/lessons">Unit 13</Link> teaches the accessibility settings built into computers
        — larger text, inverted colors, higher contrast, color filters, a bigger pointer, reduced
        motion and spoken descriptions — and lets you try each one on a practice machine before
        touching your own. If reading this site is hard, that unit may be the most useful place to
        start.
      </p>

      <h2>Telling us about a problem</h2>
      <p>
        If something here is unusable for you, that is a fault worth fixing. Use the{" "}
        <strong>Report a problem</strong> link in the footer of any page and tell us what happened
        and what would help. An accessibility barrier is treated as a bug, not a suggestion.
      </p>
    </LegalPage>
  );
}
