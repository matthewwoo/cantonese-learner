// src/app/api/study/start/route.ts
// API endpoint to start a new study session with a flashcard set

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createInitialReviewData } from "@/utils/spaced-repetition"
import { z } from "zod"
import { Session } from "next-auth"

// Validation schema for starting a study session
const startStudySchema = z.object({
  flashcardSetId: z.string().min(1, "Flashcard set ID is required"),
  maxCards: z.number().min(1).max(50).optional().default(20), // Default 20 cards per session
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions) as Session | null
    console.log('API Session:', session) // Debug log
    if (!session || !session.user?.id) {
      console.log('Authentication failed - session:', session) // Debug log
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { flashcardSetId, maxCards } = startStudySchema.parse(body)

    // Verify that the flashcard set exists and belongs to the user
    const flashcardSet = await db.flashcardSet.findFirst({
      where: {
        id: flashcardSetId,
        userId: session.user.id
      },
      include: {
        flashcards: true // Include all flashcards in the set
      }
    })

    if (!flashcardSet) {
      return NextResponse.json(
        { error: "Flashcard set not found or not accessible" },
        { status: 404 }
      )
    }

    if (flashcardSet.flashcards.length === 0) {
      return NextResponse.json(
        { error: "This flashcard set has no cards" },
        { status: 400 }
      )
    }

    // Create a new study session
    const studySession = await db.studySession.create({
      data: {
        userId: session.user.id,
        totalCards: Math.min(maxCards, flashcardSet.flashcards.length),
      }
    })

    // Select cards for this session (up to maxCards)
    // For now, we'll just take the first N cards, but later we can implement
    // smart selection based on due dates and difficulty
    const selectedCards = flashcardSet.flashcards
      .slice(0, maxCards)

    // Create study cards for each selected flashcard
    const studyCardsData = selectedCards.map(flashcard => {
      const reviewData = createInitialReviewData()
      return {
        flashcardId: flashcard.id,
        studySessionId: studySession.id,
        easeFactor: reviewData.easeFactor,
        interval: reviewData.interval,
        repetitions: reviewData.repetitions,
        nextReviewDate: reviewData.nextReviewDate,
      }
    })

    // Insert all study cards at once
    await db.studyCard.createMany({
      data: studyCardsData
    })

    // Fetch the complete study session with all related data
    const completeStudySession = await db.studySession.findUnique({
      where: { id: studySession.id },
      include: {
        studyCards: {
          include: {
            flashcard: {
              select: {
                id: true,
                chineseWord: true,
                englishTranslation: true,
                pronunciation: true,
                exampleSentenceEnglish: true,
                exampleSentenceChinese: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: "Study session started successfully",
      studySession: {
        id: completeStudySession!.id,
        totalCards: completeStudySession!.totalCards,
        startedAt: completeStudySession!.startedAt,
        flashcardSetName: flashcardSet.name,
        studyCards: completeStudySession!.studyCards.map((studyCard, index) => ({
          id: studyCard.id,
          position: index + 1, // 1-based position for UI
          flashcard: {
            ...studyCard.flashcard,
            exampleSentence: studyCard.flashcard.exampleSentenceEnglish || studyCard.flashcard.exampleSentenceChinese || null,
          },
          easeFactor: studyCard.easeFactor,
          interval: studyCard.interval,
          repetitions: studyCard.repetitions,
          nextReviewDate: studyCard.nextReviewDate,
          wasCorrect: studyCard.wasCorrect,
        }))
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      )
    }

    console.error("Error starting study session:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}