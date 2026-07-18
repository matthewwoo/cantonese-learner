'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Browser Supabase client. `createBrowserClient` returns a per-page singleton,
 * so calling this in multiple components is fine.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
