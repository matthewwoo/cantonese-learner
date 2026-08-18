// src/lib/generation.ts
// Shared vocabulary for rows that are filled in after they are created.
// Deck and article creation insert a 'pending' row, respond immediately, and
// finish the work in the background; the list pages render off this status.

export type GenerationStatus = 'pending' | 'ready' | 'failed'

/** Narrow the `text` column the database hands back. */
export function toGenerationStatus(value: string | null | undefined): GenerationStatus {
  return value === 'pending' || value === 'failed' ? value : 'ready'
}

// A background job killed mid-flight — function timeout, deploy, crash — never
// gets to write 'failed' for itself. Without a floor those rows would shimmer
// forever, so the UI stops believing 'pending' after this long.
const PENDING_TIMEOUT_MS = 10 * 60 * 1000

/**
 * The status to render, which is not always the status stored: a row that has
 * claimed to be pending for over ten minutes is treated as failed.
 */
export function displayStatus(row: {
  status: GenerationStatus
  createdAt: string
}): GenerationStatus {
  if (row.status !== 'pending') return row.status
  const age = Date.now() - Date.parse(row.createdAt)
  return Number.isFinite(age) && age > PENDING_TIMEOUT_MS ? 'failed' : 'pending'
}
