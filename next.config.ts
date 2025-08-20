import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Increase timeout for API routes to handle long-running translation operations
  serverRuntimeConfig: {
    // Increase timeout to 5 minutes (300 seconds) for API routes
    maxDuration: 300,
  },
  // For Vercel deployment, set function timeout
  functions: {
    'src/app/api/articles/route.ts': {
      maxDuration: 300,
    },
  },
};

export default nextConfig;
