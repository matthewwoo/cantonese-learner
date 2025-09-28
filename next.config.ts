import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Use stable key for external packages with RSC
  serverExternalPackages: ['@prisma/client'],
  // Increase timeout for API routes to handle long-running translation operations
  experimental: {
    // keep any other experimental flags here if needed
  },
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
