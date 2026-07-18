// src/lib/srs/sm2.ts
// SM-2 (SuperMemo 2) spaced repetition algorithm.
//
// Pure functions with no I/O so the exact same logic can run in the browser
// today and be ported to Swift for the iOS app later. Dates cross this
// boundary as ISO strings (what Supabase returns) or Date objects.

// Quality of response (how well the user remembered the card)
export enum ResponseQuality {
  BLACKOUT = 0, // Complete blackout - no memory
  INCORRECT = 1, // Incorrect response with familiar feeling
  HARD = 2, // Correct response with serious difficulty
  GOOD = 3, // Correct response after some hesitation
  EASY = 4, // Perfect response with ease
}

export interface SpacedRepetitionData {
  easeFactor: number // How "easy" this card is (2.5 is default)
  interval: number // Days until next review
  repetitions: number // How many times studied successfully
  nextReviewDate: Date // When to show this card next
}

/**
 * Calculate the next review data based on user response.
 * This is the core of the spaced repetition algorithm.
 */
export function calculateNextReview(
  currentData: SpacedRepetitionData,
  responseQuality: ResponseQuality
): SpacedRepetitionData {
  let { easeFactor, interval, repetitions } = currentData

  // Update ease factor based on response quality:
  // better responses make the card "easier" (longer intervals)
  easeFactor = Math.max(
    1.3,
    easeFactor +
      (0.1 - (5 - responseQuality) * (0.08 + (5 - responseQuality) * 0.02))
  )

  // If response was poor (quality < 3), reset repetitions and set short interval
  if (responseQuality < 3) {
    repetitions = 0
    interval = 1 // Show again tomorrow
  } else {
    repetitions += 1

    if (repetitions === 1) {
      interval = 1 // First successful review: 1 day
    } else if (repetitions === 2) {
      interval = 6 // Second successful review: 6 days
    } else {
      // Subsequent reviews: multiply previous interval by ease factor
      interval = Math.round(interval * easeFactor)
    }
  }

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + interval)

  return { easeFactor, interval, repetitions, nextReviewDate }
}

/** Determine if a card is due for review. */
export function isCardDue(nextReviewDate: string | Date): boolean {
  return new Date(nextReviewDate) <= new Date()
}

/** Create initial spaced repetition data for a new card. */
export function createInitialReviewData(): SpacedRepetitionData {
  return {
    easeFactor: 2.5,
    interval: 0, // New card - show immediately
    repetitions: 0,
    nextReviewDate: new Date(), // Due now
  }
}

/** Get a human-readable description of the next review interval. */
export function getIntervalDescription(interval: number): string {
  if (interval === 0) return "New card"
  if (interval === 1) return "1 day"
  if (interval < 7) return `${interval} days`
  if (interval < 30) return `${Math.round(interval / 7)} week(s)`
  if (interval < 365) return `${Math.round(interval / 30)} month(s)`
  return `${Math.round(interval / 365)} year(s)`
}
