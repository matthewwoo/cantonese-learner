import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     * - _next/static, _next/image (build assets)
     * - favicon / icons / manifest
     * - PWA service worker + workbox chunks
     * - common static file extensions
     * API routes are included on purpose: the session refresh keeps
     * cookie-based auth fresh for fetch() calls from pages.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest|sw\\.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
