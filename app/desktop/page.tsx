import type { Metadata } from "next";
import FakeDesktop from "@/components/Playground/FakeDesktop";

export const metadata: Metadata = {
  title: "Playground Desktop",
};

export default function DesktopPage() {
  return (
    <div className="fixed inset-0 z-50">
      <FakeDesktop />
    </div>
  );
}
