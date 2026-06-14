// src/lib/supabase/middleware.ts
// Refreshes the Supabase auth session cookie on each request so Server
// Components and Route Handlers always see a valid session. Edge-safe:
// must NOT import Prisma or any Node-only module.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: revalidates the JWT and refreshes the session token if needed.
  // Do not run code between createServerClient and getUser().
  await supabase.auth.getUser()

  return supabaseResponse
}
