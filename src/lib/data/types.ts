// src/lib/data/types.ts
// camelCase app-facing types + mappers from the snake_case Supabase rows.
//
// Components only ever see these shapes — snake_case column names stay
// contained inside src/lib/data/. Timestamps are ISO strings (exactly what
// the frontend already received from the old JSON API).

import type { Database } from '@/lib/supabase/database.types'
import { toGenerationStatus, type GenerationStatus } from '@/lib/generation'

type Tables = Database['public']['Tables']
export type FlashcardSetRow = Tables['flashcard_sets']['Row']
export type FlashcardRow = Tables['flashcards']['Row']
export type StudySessionRow = Tables['study_sessions']['Row']
export type StudyCardRow = Tables['study_cards']['Row']
export type ChatSessionRow = Tables['chat_sessions']['Row']
export type ChatMessageRow = Tables['chat_messages']['Row']
export type ArticleRow = Tables['articles']['Row']
export type ReadingSessionRow = Tables['reading_sessions']['Row']

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export interface FlashcardSetSummary {
  id: string
  name: string
  imageUrl: string | null
  flashcardCount: number
  // A set exists from the moment generation starts, so the list can show it
  // shimmering. Only 'ready' sets have their cards and cover image.
  status: GenerationStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation: string | null
  exampleSentenceEnglish: string | null
  exampleSentenceChinese: string | null
  createdAt: string
  updatedAt: string
}

export interface FlashcardWithProgress extends Flashcard {
  nextReviewDate: string | null
  lastWasCorrect: boolean | null
}

export interface FlashcardSetDetail {
  id: string
  name: string
  imageUrl: string | null
  status: GenerationStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  flashcards: FlashcardWithProgress[]
}

export function mapFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    chineseWord: row.chinese_word,
    englishTranslation: row.english_translation,
    pronunciation: row.pronunciation,
    exampleSentenceEnglish: row.example_sentence_english,
    exampleSentenceChinese: row.example_sentence_chinese,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Input shape for creating cards (CSV upload / AI generation). */
export interface NewFlashcard {
  chineseWord: string
  englishTranslation: string
  pronunciation?: string | null
  exampleSentenceEnglish?: string | null
  exampleSentenceChinese?: string | null
}

// ---------------------------------------------------------------------------
// Study
// ---------------------------------------------------------------------------

export interface StudyCardWithFlashcard {
  id: string
  position: number // 1-based position for UI
  flashcard: Flashcard & { exampleSentence: string | null }
  easeFactor: number
  interval: number // days (interval_days in the DB)
  repetitions: number
  nextReviewDate: string
  wasCorrect: boolean | null
}

export interface StartedStudySession {
  id: string
  totalCards: number
  startedAt: string
  flashcardSetName: string
  studyCards: StudyCardWithFlashcard[]
}

export interface StudyResponseResult {
  sessionProgress: {
    answered: number
    total: number
    isCompleted: boolean
  }
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export interface ArticleSummary {
  id: string
  title: string
  sourceUrl: string | null
  difficulty: string | null
  estimatedMinutes: number | null
  sentenceCount: number | null
  // Set when the row is created; translation fills the content in afterwards.
  status: GenerationStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ArticleDetail extends ArticleSummary {
  originalContent: unknown
  translatedContent: unknown
  wordDefinitions: unknown
  sentences: unknown
}

export function mapArticleSummary(row: ArticleRow): ArticleSummary {
  return {
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
  }
}

export function mapArticleDetail(row: ArticleRow): ArticleDetail {
  return {
    ...mapArticleSummary(row),
    originalContent: row.original_content,
    translatedContent: row.translated_content,
    wordDefinitions: row.word_definitions,
    sentences: row.sentences,
  }
}

export interface ReadingSession {
  id: string
  articleId: string
  currentPosition: number
  readingSpeed: number
  showTranslation: boolean
  totalReadingTime: number
  startedAt: string
  lastReadAt: string
  completedAt: string | null
}

export function mapReadingSession(row: ReadingSessionRow): ReadingSession {
  return {
    id: row.id,
    articleId: row.article_id,
    currentPosition: row.current_position,
    readingSpeed: row.reading_speed,
    showTranslation: row.show_translation,
    totalReadingTime: row.total_reading_time,
    startedAt: row.started_at,
    lastReadAt: row.last_read_at,
    completedAt: row.completed_at,
  }
}
