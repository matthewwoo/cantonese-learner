// src/lib/data/flashcards.ts
// Flashcard set CRUD via supabase-js. RLS scopes every query to the
// authenticated user, so no explicit user_id filters are needed on reads —
// but inserts must set user_id to satisfy the WITH CHECK policies.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  mapFlashcard,
  type FlashcardSetSummary,
  type FlashcardSetDetail,
  type NewFlashcard,
} from './types'

type Client = SupabaseClient<Database>

/** All of the user's sets, newest first, with card counts. */
export async function listFlashcardSets(
  sb: Client
): Promise<FlashcardSetSummary[]> {
  const { data, error } = await sb
    .from('flashcard_sets')
    .select('id, name, image_url, created_at, updated_at, flashcards(count)')
    .order('created_at', { ascending: false })
  if (error) throw error

  return data.map((s) => ({
    id: s.id,
    name: s.name,
    imageUrl: s.image_url,
    flashcardCount: s.flashcards[0]?.count ?? 0,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))
}

/**
 * One set with its cards, each annotated with the user's latest study
 * progress (nextReviewDate / lastWasCorrect). Returns null if not found.
 */
export async function getFlashcardSet(
  sb: Client,
  id: string
): Promise<FlashcardSetDetail | null> {
  const { data: set, error } = await sb
    .from('flashcard_sets')
    .select('*, flashcards(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!set) return null

  const flashcardIds = set.flashcards.map((f) => f.id)

  // Latest study progress per flashcard (RLS already scopes to this user)
  const latestByFlashcardId = new Map<
    string,
    { next_review_date: string; was_correct: boolean | null }
  >()
  if (flashcardIds.length > 0) {
    const { data: prior, error: priorError } = await sb
      .from('study_cards')
      .select('flashcard_id, next_review_date, was_correct, created_at')
      .in('flashcard_id', flashcardIds)
      .order('created_at', { ascending: false })
    if (priorError) throw priorError

    for (const sc of prior) {
      if (!latestByFlashcardId.has(sc.flashcard_id)) {
        latestByFlashcardId.set(sc.flashcard_id, sc)
      }
    }
  }

  return {
    id: set.id,
    name: set.name,
    imageUrl: set.image_url,
    createdAt: set.created_at,
    updatedAt: set.updated_at,
    flashcards: set.flashcards.map((fc) => {
      const prior = latestByFlashcardId.get(fc.id)
      return {
        ...mapFlashcard(fc),
        nextReviewDate: prior?.next_review_date ?? null,
        lastWasCorrect: prior?.was_correct ?? null,
      }
    }),
  }
}

/** Delete a set (cascade removes its cards). */
export async function deleteFlashcardSet(sb: Client, id: string): Promise<void> {
  const { error } = await sb.from('flashcard_sets').delete().eq('id', id)
  if (error) throw error
}

/**
 * Create a set with its cards (CSV upload or AI generation).
 * Returns the summary shape the UI shows after creation.
 */
export async function createSetWithCards(
  sb: Client,
  userId: string,
  input: { name: string; imageUrl?: string | null; flashcards: NewFlashcard[] }
): Promise<FlashcardSetSummary> {
  const { data: set, error } = await sb
    .from('flashcard_sets')
    .insert({
      user_id: userId,
      name: input.name,
      image_url: input.imageUrl ?? null,
    })
    .select()
    .single()
  if (error) throw error

  const { error: cardsError } = await sb.from('flashcards').insert(
    input.flashcards.map((card) => ({
      user_id: userId,
      flashcard_set_id: set.id,
      chinese_word: card.chineseWord,
      english_translation: card.englishTranslation,
      pronunciation: card.pronunciation ?? null,
      example_sentence_english: card.exampleSentenceEnglish ?? null,
      example_sentence_chinese: card.exampleSentenceChinese ?? null,
    }))
  )
  if (cardsError) {
    // Best-effort rollback so a failed card insert doesn't leave an empty set
    await sb.from('flashcard_sets').delete().eq('id', set.id)
    throw cardsError
  }

  return {
    id: set.id,
    name: set.name,
    imageUrl: set.image_url,
    flashcardCount: input.flashcards.length,
    createdAt: set.created_at,
    updatedAt: set.updated_at,
  }
}
