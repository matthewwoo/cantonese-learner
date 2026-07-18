'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from './client'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/**
 * Client-side auth state, with the same status semantics NextAuth's
 * useSession had ("loading" | "authenticated" | "unauthenticated") so
 * page-level guards convert mechanically.
 *
 * The user's display name (set at signup) lives at user.user_metadata.name.
 */
export function useUser(): { user: User | null; status: AuthStatus } {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setStatus(user ? 'authenticated' : 'unauthenticated')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'unauthenticated')
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, status }
}
