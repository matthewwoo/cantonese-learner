// src/lib/data/stats.ts
// Home-screen numbers: what the learner has done, and on which days.
// Reads go straight to Supabase and RLS scopes every row to the owner, so
// none of these take a userId.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { ActivityKind } from '@/components/home/activity-week'
import { toDayKey, type PracticeMap } from '@/lib/activity/practice-days'

type Client = SupabaseClient<Database>

/**
 * A word counts as mastered once its review interval reaches 21 days —
 * Anki's "mature card" threshold, and the one point in SM-2 where difficulty
 * is already priced in. Under src/lib/srs/sm2.ts an easy word (ease 2.5)
 * crosses it on the 4th correct review (1 → 6 → 15 → 38 days); a word the
 * learner keeps fumbling (ease floored at 1.3) needs about 7. So "mastered"
 * costs more for hard words than easy ones, which is the whole point —
 * a flat `repetitions >= 3` would treat both the same.
 *
 * It reads current state, not a high-water mark: failing a card resets its
 * interval to 1 day, and the word drops back out of the count until it's
 * rebuilt. Mastery is a claim about what the learner knows now.
 */
export const MASTERED_INTERVAL_DAYS = 21

/** How far back the activity history query reaches (streaks longer than this clamp). */
const HISTORY_DAYS = 365

export interface ProgressStats {
  wordsMastered: number
  conversations: number
  linesRead: number
}

/**
 * The three swipeable stat-card numbers.
 *
 * `study_cards` holds one row per card *per session*, so a card's live SRS
 * state is its newest row — the same "latest per flashcard" reduction
 * startStudySession does when it seeds a session.
 */
export async function getProgressStats(sb: Client): Promise<ProgressStats> {
  const [cards, conversations, reading] = await Promise.all([
    sb
      .from('study_cards')
      .select('flashcard_id, interval_days, created_at')
      .order('created_at', { ascending: false }),
    sb.from('chat_sessions').select('id', { count: 'exact', head: true }),
    sb.from('reading_sessions').select('current_position'),
  ])

  if (cards.error) throw cards.error
  if (conversations.error) throw conversations.error
  if (reading.error) throw reading.error

  const latestSeen = new Set<string>()
  let wordsMastered = 0
  for (const card of cards.data) {
    if (latestSeen.has(card.flashcard_id)) continue // older row for a card already counted
    latestSeen.add(card.flashcard_id)
    if (card.interval_days >= MASTERED_INTERVAL_DAYS) wordsMastered += 1
  }

  return {
    wordsMastered,
    conversations: conversations.count ?? 0,
    // Sentences reached, summed across articles. current_position is how far
    // into an article the learner has read.
    linesRead: reading.data.reduce((sum, r) => sum + (r.current_position ?? 0), 0),
  }
}

/**
 * Which days the learner practised, keyed by local calendar day.
 *
 * One exercise of any kind makes the day count, so this only has to find the
 * first of each — but all three are recorded so the day's accessible label can
 * say what actually happened.
 */
export async function getPracticeHistory(sb: Client): Promise<PracticeMap> {
  const since = new Date()
  since.setDate(since.getDate() - HISTORY_DAYS)
  const sinceIso = since.toISOString()

  const [studied, chatted, read] = await Promise.all([
    sb.from('study_sessions').select('started_at').gte('started_at', sinceIso),
    // User messages rather than chat_sessions.started_at: a conversation
    // resumed days later should mark the day it was actually spoken.
    sb
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .gte('created_at', sinceIso),
    // A reading session spans from started_at to last_read_at and only stores
    // those two endpoints, so those are the two days we can honestly claim.
    sb
      .from('reading_sessions')
      .select('started_at, last_read_at')
      .gte('last_read_at', sinceIso),
  ])

  if (studied.error) throw studied.error
  if (chatted.error) throw chatted.error
  if (read.error) throw read.error

  const practice: PracticeMap = new Map()
  const mark = (timestamp: string, kind: ActivityKind) => {
    const key = toDayKey(timestamp)
    const day = practice.get(key)
    if (day) day.add(kind)
    else practice.set(key, new Set([kind]))
  }

  studied.data.forEach((s) => mark(s.started_at, 'review'))
  chatted.data.forEach((m) => mark(m.created_at, 'chat'))
  read.data.forEach((r) => {
    mark(r.started_at, 'read')
    mark(r.last_read_at, 'read')
  })

  return practice
}
