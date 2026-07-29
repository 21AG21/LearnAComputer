import type { Metadata } from "next";
import JoinClassView from "@/components/JoinClassView";

export const metadata: Metadata = {
  title: "Join a class — LearnAComputer",
  description: "Type the class code your teacher gave you.",
};

export default function JoinPage() {
  return <JoinClassView />;
}
