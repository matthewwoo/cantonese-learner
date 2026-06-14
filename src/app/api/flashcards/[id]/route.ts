// src/app/api/flashcards/[id]/route.ts
// API endpoint for individual flashcard set operations (GET, DELETE)

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { db } from '@/lib/db'

// GET /api/flashcards/[id] - Get a specific flashcard set
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await context.params

    const flashcardSet = await db.flashcardSet.findFirst({
      where: {
        id,
        userId
      },
      include: {
        flashcards: true
      }
    })

    if (!flashcardSet) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 })
    }

    // Fetch latest study progress per flashcard
    const flashcardIds = flashcardSet.flashcards.map(f => f.id)
    
    const priorStudyCards = await db.studyCard.findMany({
      where: {
        flashcardId: { in: flashcardIds },
        studySession: { userId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        flashcardId: true,
        nextReviewDate: true,
        wasCorrect: true,
      },
    })

    // Map latest progress to flashcards
    const latestByFlashcardId = new Map<string, typeof priorStudyCards[number]>()
    for (const sc of priorStudyCards) {
      if (!latestByFlashcardId.has(sc.flashcardId)) {
        latestByFlashcardId.set(sc.flashcardId, sc)
      }
    }

    const flashcardsWithProgress = flashcardSet.flashcards.map(fc => {
      const prior = latestByFlashcardId.get(fc.id)
      return {
        ...fc,
        nextReviewDate: prior?.nextReviewDate || null,
        lastWasCorrect: prior?.wasCorrect ?? null
      }
    })

    return NextResponse.json({ 
      flashcardSet: {
        ...flashcardSet,
        flashcards: flashcardsWithProgress
      } 
    })
  } catch (error) {
    console.error('Error fetching flashcard set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/flashcards/[id] - Delete a specific flashcard set
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    // First, verify the flashcard set belongs to the user
    const { id } = await context.params

    const flashcardSet = await db.flashcardSet.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!flashcardSet) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 })
    }

    // Delete the flashcard set (this will cascade delete all flashcards due to the schema)
    await db.flashcardSet.delete({
      where: {
        id
      }
    })

    return NextResponse.json({ message: 'Flashcard set deleted successfully' })
  } catch (error) {
    console.error('Error deleting flashcard set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
