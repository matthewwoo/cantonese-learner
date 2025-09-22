// src/app/api/auth/[...nextauth]/route.ts
// This is a special Next.js API route that handles all authentication requests
// The [...nextauth] folder name means this route catches ALL auth-related URLs like:
// - /api/auth/signin
// - /api/auth/signout  
// - /api/auth/session
// - /api/auth/providers

import NextAuth from "next-auth/next"
import { authOptions } from "@/lib/auth"

// Create the NextAuth handler using our configuration
const handler = NextAuth(authOptions)

// Export the handler for both GET and POST requests
// This is required for Next.js 13+ App Router API routes
export { handler as GET, handler as POST }

// Ensure this route is always dynamic and not statically cached
export const dynamic = "force-dynamic"
// Ensure Prisma runs on the Node.js runtime, not Edge
export const runtime = "nodejs"