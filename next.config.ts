import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Keep the Prisma client external to the RSC bundle
  serverExternalPackages: ['@prisma/client'],
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
