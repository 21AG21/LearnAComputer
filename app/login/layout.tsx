import type { Metadata } from "next";

// The page itself is a client component, so its title has to come from here.
export const metadata: Metadata = {
  title: "Sign in — LearnAComputer",
  description: "Save your progress to an email address, with a code instead of a password.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
