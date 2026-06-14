// src/lib/api-auth.ts
// Shared authentication helper for API route handlers.

import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Resolves the authenticated user from the request session.
 *
 * Returns `{ userId, session }` on success, or a 401 `NextResponse` that the
 * caller should return directly. Always passes `authOptions` so the configured
 * JWT secret, cookie names, and the session callback (which injects `user.id`)
 * are applied consistently across every route.
 *
 * Usage:
 *   const auth = await requireUser()
 *   if (auth instanceof NextResponse) return auth
 *   const { userId } = auth
 */
export async function requireUser(): Promise<
  { userId: string; session: Session } | NextResponse
> {
  const session = (await getServerSession(authOptions)) as Session | null
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    )
  }
  return { userId: session.user.id, session }
}
