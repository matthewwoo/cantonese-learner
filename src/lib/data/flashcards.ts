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
import { toGenerationStatus } from '@/lib/generation'

type Client = SupabaseClient<Database>

/** All of the user's sets, newest first, with card counts. */
export async function listFlashcardSets(
  sb: Client
): Promise<FlashcardSetSummary[]> {
  const { data, error } = await sb
    .from('flashcard_sets')
    .select(
      'id, name, image_url, status, error_message, created_at, updated_at, flashcards(count)'
    )
    .order('created_at', { ascending: false })
  if (error) throw error

  return data.map((s) => ({
    id: s.id,
    name: s.name,
    imageUrl: s.image_url,
    flashcardCount: s.flashcards[0]?.count ?? 0,
    status: toGenerationStatus(s.status),
    errorMessage: s.error_message,
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
    status: toGenerationStatus(set.status),
    errorMessage: set.error_message,
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
 * Reserve a set before generating anything for it.
 *
 * Generation responds to the client immediately and does the AI work in the
 * background, so the row has to exist first — it is what the decks list renders
 * its shimmering placeholder from, and what makes that placeholder survive a
 * refresh. It has no cards and no cover image yet.
 */
export async function createPendingSet(
  sb: Client,
  userId: string,
  input: { name: string }
): Promise<FlashcardSetSummary> {
  const { data: set, error } = await sb
    .from('flashcard_sets')
    .insert({
      user_id: userId,
      name: input.name,
      image_url: null,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error

  return {
    id: set.id,
    name: set.name,
    imageUrl: set.image_url,
    flashcardCount: 0,
    status: toGenerationStatus(set.status),
    errorMessage: set.error_message,
    createdAt: set.created_at,
    updatedAt: set.updated_at,
  }
}

/**
 * Fill in a pending set once generation finishes: insert its cards, attach the
 * cover image, and flip it to 'ready'.
 *
 * If the card insert fails the set is marked 'failed' rather than deleted — the
 * user is looking at a placeholder for it, and a card that quietly vanishes is
 * worse than one that says what went wrong.
 */
export async function finalizeSet(
  sb: Client,
  userId: string,
  setId: string,
  input: { imageUrl?: string | null; flashcards: NewFlashcard[] }
): Promise<void> {
  const { error: cardsError } = await sb.from('flashcards').insert(
    input.flashcards.map((card) => ({
      user_id: userId,
      flashcard_set_id: setId,
      chinese_word: card.chineseWord,
      english_translation: card.englishTranslation,
      pronunciation: card.pronunciation ?? null,
      example_sentence_english: card.exampleSentenceEnglish ?? null,
      example_sentence_chinese: card.exampleSentenceChinese ?? null,
    }))
  )
  if (cardsError) throw cardsError

  const { error } = await sb
    .from('flashcard_sets')
    .update({
      image_url: input.imageUrl ?? null,
      status: 'ready',
      error_message: null,
    })
    .eq('id', setId)
  if (error) throw error
}

/** Mark a set as failed so its placeholder card can explain itself. */
export async function failSet(
  sb: Client,
  setId: string,
  message: string
): Promise<void> {
  const { error } = await sb
    .from('flashcard_sets')
    .update({ status: 'failed', error_message: message.slice(0, 500) })
    .eq('id', setId)
  if (error) console.error('Could not mark set as failed:', error)
}
