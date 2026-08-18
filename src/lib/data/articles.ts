// src/lib/data/articles.ts
// Article CRUD via supabase-js. RLS scopes all reads to the owner.
// (Article CREATION stays in POST /api/articles — it needs server-side
// translation APIs — but list/read/delete are direct queries.)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  mapArticleDetail,
  mapReadingSession,
  type ArticleDetail,
  type ArticleSummary,
  type ReadingSession,
} from './types'
import { toGenerationStatus } from '@/lib/generation'

type Client = SupabaseClient<Database>

/** All of the user's articles, newest first (summaries only — no content). */
export async function listArticles(sb: Client): Promise<ArticleSummary[]> {
  const { data, error } = await sb
    .from('articles')
    .select(
      'id, title, source_url, difficulty, estimated_minutes, sentence_count, status, error_message, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    sentenceCount: row.sentence_count,
    status: toGenerationStatus(row.status),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * One article plus the user's active (uncompleted) reading session,
 * creating a session if none exists — same behavior the old
 * GET /api/articles/[id] had. Returns null if the article isn't found.
 */
export async function getArticleWithSession(
  sb: Client,
  userId: string,
  articleId: string
): Promise<{ article: ArticleDetail; readingSession: ReadingSession } | null> {
  const { data: article, error } = await sb
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .maybeSingle()
  if (error) throw error
  if (!article) return null

  const { data: existing, error: sessionError } = await sb
    .from('reading_sessions')
    .select('*')
    .eq('article_id', articleId)
    .is('completed_at', null)
    .limit(1)
    .maybeSingle()
  if (sessionError) throw sessionError

  let session = existing
  if (!session) {
    const { data: created, error: createError } = await sb
      .from('reading_sessions')
      .insert({ user_id: userId, article_id: articleId })
      .select()
      .single()
    if (createError) throw createError
    session = created
  }

  return {
    article: mapArticleDetail(article),
    readingSession: mapReadingSession(session),
  }
}

/**
 * Save how far into an article the learner has read.
 *
 * `current_position` is a 1-based *count of sentences reached* — the furthest
 * bubble that has been on screen, not the one currently in view. It's the
 * number the home screen's "lines read" stat sums across articles, so it only
 * ever moves forward; callers pass a value already maxed against what they
 * loaded.
 *
 * `last_read_at` rides along on every save, including ones that don't advance
 * the position: it's what marks the day as a reading day on the activity week.
 */
export async function updateReadingProgress(
  sb: Client,
  readingSessionId: string,
  position: number
): Promise<void> {
  const { error } = await sb
    .from('reading_sessions')
    .update({ current_position: position, last_read_at: new Date().toISOString() })
    .eq('id', readingSessionId)
  if (error) throw error
}

/** Delete an article (cascade removes its reading sessions). */
export async function deleteArticle(sb: Client, id: string): Promise<void> {
  const { error } = await sb.from('articles').delete().eq('id', id)
  if (error) throw error
}
