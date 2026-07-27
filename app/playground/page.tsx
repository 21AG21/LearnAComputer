import type { Metadata } from "next";
import FakeDesktop from "@/components/Playground/FakeDesktop";

export const metadata: Metadata = {
  title: "Playground",
};

export default function PlaygroundPage() {
  return (
    <div className="h-full text-gray-900">
      <FakeDesktop />
    </div>
  );
}
