import type { Metadata } from "next";
import FakeDesktop from "@/components/Playground/FakeDesktop";

export const metadata: Metadata = {
  title: "Playground — LearnAComputer",
};

export default function PlaygroundPage() {
  return (
    <div className="h-full text-gray-900">
      {/* The desktop fills the page, so the heading is for people who are not
          looking at it: a screen reader announcing where it landed, and a
          search result. Visually hidden, never display:none, which would take
          it out of the accessibility tree along with everything else. */}
      <h1 className="sr-only">Practice desktop — a pretend computer you cannot break</h1>
      <FakeDesktop />
    </div>
  );
}
