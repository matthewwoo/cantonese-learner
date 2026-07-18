import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from './database.types'

/** Paths that are reachable without a session. */
const PUBLIC_PATHS = ['/auth']

/**
 * Refreshes the Supabase session (rotating expired tokens into the response
 * cookies) and redirects unauthenticated users to /auth/signin.
 *
 * Per the official @supabase/ssr pattern: do not run code between
 * createServerClient and auth.getUser(), and always return the
 * supabaseResponse object with its cookies intact.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
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

  // IMPORTANT: getUser() validates the JWT with the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic =
    pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
