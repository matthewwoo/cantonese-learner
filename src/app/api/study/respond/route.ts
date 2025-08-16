// src/app/api/study/respond/route.ts
// API endpoint to record user responses during study sessions

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { calculateNextReview, ResponseQuality } from "@/utils/spaced-repetition"
import { z } from "zod"
import { Session } from "next-auth"

// Validation schema for study responses
const studyResponseSchema = z.object({
  studyCardId: z.string().min(1, "Study card ID is required"),
  responseQuality: z.number().min(0).max(4), // ResponseQuality enum values
  responseTime: z.number().min(0).optional(), // Time taken to respond in milliseconds
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { studyCardId, responseQuality, responseTime } = studyResponseSchema.parse(body)

    // Find the study card and verify ownership
    const studyCard = await db.studyCard.findFirst({
      where: {
        id: studyCardId,
        studySession: {
          userId: session.user.id
        }
      },
      include: {
        studySession: true,
        flashcard: true
      }
    })

    if (!studyCard) {
      return NextResponse.json(
        { error: "Study card not found or not accessible" },
        { status: 404 }
      )
    }

    // Calculate next review data using spaced repetition algorithm
    const currentData = {
      easeFactor: studyCard.easeFactor,
      interval: studyCard.interval,
      repetitions: studyCard.repetitions,
      nextReviewDate: studyCard.nextReviewDate,
    }

    const nextReviewData = calculateNextReview(currentData, responseQuality as ResponseQuality)

    // Determine if response was correct (quality >= 3)
    const wasCorrect = responseQuality >= 3

    // Update the study card with response and new spaced repetition data
    const updatedStudyCard = await db.studyCard.update({
      where: { id: studyCardId },
      data: {
        wasCorrect,
        responseTime,
        easeFactor: nextReviewData.easeFactor,
        interval: nextReviewData.interval,
        repetitions: nextReviewData.repetitions,
        nextReviewDate: nextReviewData.nextReviewDate,
        updatedAt: new Date(),
      },
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
    })

    // Check if this was the last card in the study session
    const totalCardsInSession = await db.studyCard.count({
      where: {
        studySessionId: studyCard.studySessionId
      }
    })

    const answeredCardsCount = await db.studyCard.count({
      where: {
        studySessionId: studyCard.studySessionId,
        wasCorrect: { not: null } // Cards that have been answered
      }
    })

    // If all cards have been answered, mark session as completed
    if (answeredCardsCount === totalCardsInSession) {
      await db.studySession.update({
        where: { id: studyCard.studySessionId },
        data: { completedAt: new Date() }
      })
    }

    return NextResponse.json({
      message: "Response recorded successfully",
      studyCard: {
        id: updatedStudyCard.id,
        flashcard: {
          ...updatedStudyCard.flashcard,
          exampleSentence: updatedStudyCard.flashcard.exampleSentenceEnglish || updatedStudyCard.flashcard.exampleSentenceChinese || null,
        },
        wasCorrect: updatedStudyCard.wasCorrect,
        responseTime: updatedStudyCard.responseTime,
        easeFactor: updatedStudyCard.easeFactor,
        interval: updatedStudyCard.interval,
        repetitions: updatedStudyCard.repetitions,
        nextReviewDate: updatedStudyCard.nextReviewDate,
      },
      sessionProgress: {
        answered: answeredCardsCount,
        total: totalCardsInSession,
        isCompleted: answeredCardsCount === totalCardsInSession,
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      )
    }

    console.error("Error recording study response:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}