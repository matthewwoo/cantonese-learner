import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Use stable key for external packages with RSC
  serverExternalPackages: ['@prisma/client'],
  // Increase timeout for API routes to handle long-running translation operations
  experimental: {
    // keep any other experimental flags here if needed
  },
};

export default nextConfig;
