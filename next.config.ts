import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),

  /**
   * Turns off the floating Next.js dev-tools badge in the corner.
   *
   * It is a dev-only overlay — production never rendered it — but it sat on top of
   * the page in every local screenshot and demo, where it reads as a stray widget
   * belonging to the product. Nothing about the build changes.
   */
  devIndicators: false,
};

export default nextConfig;
