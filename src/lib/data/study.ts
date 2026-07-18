// src/lib/data/study.ts
// Study session flow via supabase-js + the SM-2 util (src/lib/srs/sm2.ts).
//
// The card-selection logic (due-first + light shuffle) is a faithful port of
// the old /api/study/start route. It lives next to sm2.ts so both port to
// Swift together for the iOS app.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  calculateNextReview,
  createInitialReviewData,
  type ResponseQuality,
} from '@/lib/srs/sm2'
import type {
  FlashcardRow,
  StudyCardRow,
  StartedStudySession,
  StudyResponseResult,
} from './types'
import { mapFlashcard } from './types'

type Client = SupabaseClient<Database>

// Simple in-place shuffle (Fisher–Yates)
function shuffleInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = array[i]
    array[i] = array[j]
    array[j] = tmp
  }
}

function toStudyCardShape(sc: StudyCardRow, flashcard: FlashcardRow, position: number) {
  const mapped = mapFlashcard(flashcard)
  return {
    id: sc.id,
    position,
    flashcard: {
      ...mapped,
      exampleSentence:
        mapped.exampleSentenceEnglish || mapped.exampleSentenceChinese || null,
    },
    easeFactor: sc.ease_factor,
    interval: sc.interval_days,
    repetitions: sc.repetitions,
    nextReviewDate: sc.next_review_date,
    wasCorrect: sc.was_correct,
  }
}

/**
 * Start a study session: select up to maxCards from the set (due cards first,
 * new cards fill, light shuffle), seed each with the user's latest progress,
 * and insert the session + study cards.
 */
export async function startStudySession(
  sb: Client,
  userId: string,
  flashcardSetId: string,
  maxCards = 20
): Promise<StartedStudySession> {
  // Verify the set exists (RLS: only reachable if owned) and load its cards
  const { data: set, error: setError } = await sb
    .from('flashcard_sets')
    .select('id, name, flashcards(*)')
    .eq('id', flashcardSetId)
    .maybeSingle()
  if (setError) throw setError
  if (!set) throw new Error('Flashcard set not found or not accessible')
  if (set.flashcards.length === 0) throw new Error('This flashcard set has no cards')

  const allFlashcards = set.flashcards
  const flashcardIds = allFlashcards.map((f) => f.id)

  // Latest study progress per flashcard for this user (across sessions)
  const { data: priorStudyCards, error: priorError } = await sb
    .from('study_cards')
    .select(
      'id, flashcard_id, ease_factor, interval_days, repetitions, next_review_date, created_at'
    )
    .in('flashcard_id', flashcardIds)
    .order('created_at', { ascending: false })
  if (priorError) throw priorError

  const latestByFlashcardId = new Map<string, (typeof priorStudyCards)[number]>()
  for (const sc of priorStudyCards) {
    if (!latestByFlashcardId.has(sc.flashcard_id)) {
      latestByFlashcardId.set(sc.flashcard_id, sc)
    }
  }

  const now = new Date()

  type Candidate = {
    flashcard: (typeof allFlashcards)[number]
    prior: (typeof priorStudyCards)[number] | undefined
    isDue: boolean
    nextReviewDate: Date
  }

  const candidates: Candidate[] = allFlashcards.map((fc) => {
    const prior = latestByFlashcardId.get(fc.id)
    // New cards are treated as due now
    const nextReviewDate = prior ? new Date(prior.next_review_date) : new Date(0)
    return { flashcard: fc, prior, isDue: nextReviewDate <= now, nextReviewDate }
  })

  // Lightly shuffle to avoid fixed ordering, then due-first, then oldest due date
  shuffleInPlace(candidates)
  candidates.sort((a, b) => {
    if (a.isDue !== b.isDue) return a.isDue ? -1 : 1
    return a.nextReviewDate.getTime() - b.nextReviewDate.getTime()
  })

  const selectedCards = candidates.slice(0, maxCards)

  // Create the study session
  const { data: studySession, error: sessionError } = await sb
    .from('study_sessions')
    .insert({
      user_id: userId,
      total_cards: Math.min(maxCards, allFlashcards.length),
    })
    .select()
    .single()
  if (sessionError) throw sessionError

  // Seed each selected card with prior progress (or fresh SM-2 data)
  const studyCardsData = selectedCards.map(({ flashcard, prior }) => {
    const reviewData = prior
      ? {
          easeFactor: prior.ease_factor,
          interval: prior.interval_days,
          repetitions: prior.repetitions,
          nextReviewDate: new Date(prior.next_review_date),
        }
      : createInitialReviewData()

    return {
      user_id: userId,
      flashcard_id: flashcard.id,
      study_session_id: studySession.id,
      ease_factor: reviewData.easeFactor,
      interval_days: reviewData.interval,
      repetitions: reviewData.repetitions,
      next_review_date: reviewData.nextReviewDate.toISOString(),
    }
  })

  const { data: insertedCards, error: cardsError } = await sb
    .from('study_cards')
    .insert(studyCardsData)
    .select()
  if (cardsError) throw cardsError

  // Order inserted cards to match the selected candidate order
  const flashcardById = new Map(allFlashcards.map((fc) => [fc.id, fc]))
  const insertedByFlashcardId = new Map(insertedCards.map((sc) => [sc.flashcard_id, sc]))

  const studyCards = selectedCards.map(({ flashcard }, index) => {
    const sc = insertedByFlashcardId.get(flashcard.id)!
    return toStudyCardShape(sc, flashcardById.get(flashcard.id)!, index + 1)
  })

  return {
    id: studySession.id,
    totalCards: studySession.total_cards,
    startedAt: studySession.started_at,
    flashcardSetName: set.name,
    studyCards,
  }
}

/**
 * Record a response: run SM-2, update the study card, and complete the
 * session when every card has been answered.
 */
export async function recordStudyResponse(
  sb: Client,
  studyCardId: string,
  responseQuality: ResponseQuality,
  responseTime?: number
): Promise<StudyResponseResult> {
  const { data: studyCard, error } = await sb
    .from('study_cards')
    .select('*')
    .eq('id', studyCardId)
    .maybeSingle()
  if (error) throw error
  if (!studyCard) throw new Error('Study card not found or not accessible')

  const nextReviewData = calculateNextReview(
    {
      easeFactor: studyCard.ease_factor,
      interval: studyCard.interval_days,
      repetitions: studyCard.repetitions,
      nextReviewDate: new Date(studyCard.next_review_date),
    },
    responseQuality
  )

  const wasCorrect = responseQuality >= 3

  const { error: updateError } = await sb
    .from('study_cards')
    .update({
      was_correct: wasCorrect,
      response_time: responseTime ?? null,
      ease_factor: nextReviewData.easeFactor,
      interval_days: nextReviewData.interval,
      repetitions: nextReviewData.repetitions,
      next_review_date: nextReviewData.nextReviewDate.toISOString(),
    })
    .eq('id', studyCardId)
  if (updateError) throw updateError

  // Session progress: answered vs total
  const { count: total, error: totalError } = await sb
    .from('study_cards')
    .select('id', { count: 'exact', head: true })
    .eq('study_session_id', studyCard.study_session_id)
  if (totalError) throw totalError

  const { count: answered, error: answeredError } = await sb
    .from('study_cards')
    .select('id', { count: 'exact', head: true })
    .eq('study_session_id', studyCard.study_session_id)
    .not('was_correct', 'is', null)
  if (answeredError) throw answeredError

  const isCompleted = (answered ?? 0) === (total ?? 0)
  if (isCompleted) {
    const { error: completeError } = await sb
      .from('study_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', studyCard.study_session_id)
    if (completeError) throw completeError
  }

  return {
    sessionProgress: {
      answered: answered ?? 0,
      total: total ?? 0,
      isCompleted,
    },
  }
}
