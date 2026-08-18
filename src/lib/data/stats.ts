// src/lib/data/stats.ts
// Home-screen numbers: what the learner has done, and on which days.
// Reads go straight to Supabase and RLS scopes every row to the owner, so
// none of these take a userId.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { ActivityKind } from '@/components/home/activity-week'
import { toDayKey, type PracticeMap } from '@/lib/activity/practice-days'

type Client = SupabaseClient<Database>

/** How far back the activity history query reaches (streaks longer than this clamp). */
const HISTORY_DAYS = 365

export interface ProgressStats {
  wordsReviewedThisWeek: number
  conversations: number
  linesRead: number
}

/**
 * The three swipeable stat-card numbers.
 *
 * `weekStart` is local midnight on Monday (see startOfWeek) so the review
 * count resets on the same boundary the activity strip draws.
 */
export async function getProgressStats(
  sb: Client,
  weekStart: Date
): Promise<ProgressStats> {
  const [reviewed, conversations, reading] = await Promise.all([
    // Answered cards only: a study_cards row is inserted when a session
    // *starts*, and was_correct stays null until the learner responds. The
    // updated_at trigger stamps that response, so it — not created_at — is
    // when the review actually happened.
    sb
      .from('study_cards')
      .select('flashcard_id')
      .not('was_correct', 'is', null)
      .gte('updated_at', weekStart.toISOString()),
    sb.from('chat_sessions').select('id', { count: 'exact', head: true }),
    sb.from('reading_sessions').select('current_position'),
  ])

  if (reviewed.error) throw reviewed.error
  if (conversations.error) throw conversations.error
  if (reading.error) throw reading.error

  return {
    // Distinct words, not review events: seeing the same card three times in a
    // week is one word reviewed.
    wordsReviewedThisWeek: new Set(reviewed.data.map((c) => c.flashcard_id)).size,
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
