import Link from "next/link";
import DrDigital from "@/components/DrDigital";

export default function Home() {
  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Welcome to LearnAComputer</h1>
      <DrDigital message="Hi, I'm Dr. Digital! I'll be with you every step of the way as you learn to use a computer with confidence. Ready to start?" />
      <Link href="/lessons" className="inline-block border rounded px-4 py-2">
        Browse lessons
      </Link>
    </div>
  );
}
