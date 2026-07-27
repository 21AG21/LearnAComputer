import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Funny Cat Video — LearnAComputer",
  description: "The page the right-click lesson opens in a new tab.",
};

export default function CatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
