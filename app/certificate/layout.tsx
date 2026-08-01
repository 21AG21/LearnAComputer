import type { Metadata } from "next";

// The certificate page is a client component, so it cannot export metadata
// itself. Without this every certificate tab was labeled just "LearnAComputer"
// — and this is the one page people deliberately keep open while they print.
export const metadata: Metadata = {
  title: "Certificates — LearnAComputer",
  description: "Print a certificate for each unit you have finished, and for the whole course.",
};

export default function CertificateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
