// src/lib/api-auth.ts
// Shared authentication helper for API route handlers, backed by Supabase Auth.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Resolves the authenticated user from the Supabase session cookie.
 *
 * Returns `{ userId }` on success, or a 401 `NextResponse` the caller should
 * return directly. Uses `supabase.auth.getUser()`, which revalidates the JWT
 * with Supabase — safe to trust for authorization decisions. The returned
 * `userId` is the Supabase `auth.users` UUID, which equals `public.users.id`.
 *
 * Usage:
 *   const auth = await requireUser()
 *   if (auth instanceof NextResponse) return auth
 *   const { userId } = auth
 */
export async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  return { userId: user.id }
}
