import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Pin the project root to this checkout. Without it Next picks the nearest
  // ancestor with a lockfile, which for a git worktree is the main checkout.
  outputFileTracingRoot: process.cwd(),
};

export default withPWA({
  dest: "public",
  register: true,
  // Disable PWA in development to simplify local debugging
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
})(nextConfig);
