import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Server Supabase client for Server Components and Route Handlers.
 * Reads the session from cookies (Next 15: `cookies()` is async).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware handles session
            // refresh, so this can be safely ignored.
          }
        },
      },
    }
  )
}

/**
 * Route-handler client that prefers an `Authorization: Bearer <token>` header
 * over cookies. This lets a future iOS app (supabase-swift) call the AI API
 * routes with its access token, while the web app keeps using cookies.
 */
export async function createRouteClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        global: { headers: { Authorization: authHeader } },
      }
    )
  }

  return createClient()
}
