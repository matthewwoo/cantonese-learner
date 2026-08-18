// src/lib/hooks/use-poll-while-pending.ts
// Keeps a list fresh while any of its rows is still being generated.

"use client"

import { useEffect } from 'react'
import { displayStatus, type GenerationStatus } from '@/lib/generation'

const POLL_INTERVAL_MS = 4000

/**
 * Refetch every few seconds for as long as at least one row is pending, then
 * stop. The refetch must be silent — re-showing a loading takeover on each tick
 * would flash the whole page away while the user is reading it.
 */
export function usePollWhilePending(
  rows: ReadonlyArray<{ status: GenerationStatus; createdAt: string }>,
  refetch: () => void
) {
  const hasPending = rows.some((row) => displayStatus(row) === 'pending')

  useEffect(() => {
    if (!hasPending) return
    const timer = setInterval(refetch, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [hasPending, refetch])
}
