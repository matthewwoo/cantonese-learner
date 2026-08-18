// src/lib/activity/practice-days.ts
// Turns raw practice timestamps into the shapes the home screen renders:
// a Monday→Sunday week and a current streak.
//
// Pure functions with no I/O, like src/lib/srs/sm2.ts — same logic can run in
// the browser today and port to Swift for the iOS app later.
//
// Everything is keyed by *local* calendar day (`YYYY-MM-DD`). Timestamps come
// out of Postgres in UTC, so bucketing has to happen after conversion to the
// learner's own timezone — otherwise a 9pm PST review lands on tomorrow.

import type { ActivityDay, ActivityKind } from '@/components/home/activity-week'

/** A local calendar day, `YYYY-MM-DD`. Lexicographic order = chronological. */
export type DayKey = string

/** Which exercises happened on each day the learner practised. */
export type PracticeMap = Map<DayKey, Set<ActivityKind>>

/** Local-day key for a Date (or an ISO timestamp from Supabase). */
export function toDayKey(value: Date | string): DayKey {
  const d = typeof value === 'string' ? new Date(value) : value
  // Built from local getters rather than toISOString(), which would convert
  // back to UTC and reintroduce the very off-by-one this exists to avoid.
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** The day `offset` days before `key` (negative offsets move forward). */
export function shiftDay(key: DayKey, offset: number): DayKey {
  const [y, m, d] = key.split('-').map(Number)
  // Local-noon anchor: adding days across a DST boundary from midnight can
  // land back on the same date, which would make the streak walk loop.
  const date = new Date(y, m - 1, d, 12)
  date.setDate(date.getDate() - offset)
  return toDayKey(date)
}

/**
 * Local midnight on the Monday of the week containing `key` — the cutoff for
 * anything scoped to "this week", and the same boundary the activity strip
 * draws.
 */
export function startOfWeek(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12) // noon anchor; see shiftDay
  // getDay(): 0=Sun…6=Sat. Monday-first means Sunday is 6 days into the week.
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * The seven days of the Monday-first week containing `today`, oldest first —
 * exactly what <ActivityWeek /> expects.
 */
export function buildWeek(practice: PracticeMap, today: DayKey): ActivityDay[] {
  const monday = toDayKey(startOfWeek(today))
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(monday, -i)
    return { date, activities: [...(practice.get(date) ?? [])] }
  })
}

/**
 * Consecutive practised days ending today.
 *
 * A day still in progress doesn't break the streak: if today is empty but
 * yesterday wasn't, the streak counts back from yesterday. The learner hasn't
 * lost anything until midnight passes without practice.
 */
export function currentStreak(practice: PracticeMap, today: DayKey): number {
  let cursor = practice.has(today) ? today : shiftDay(today, 1)
  let streak = 0
  while (practice.has(cursor)) {
    streak += 1
    cursor = shiftDay(cursor, 1)
  }
  return streak
}
