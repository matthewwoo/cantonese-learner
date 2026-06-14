// src/app/api/flashcards/route.ts
// This API endpoint gets all flashcard sets for the authenticated user

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api-auth"
import { db } from "@/lib/db"

// Handle GET requests to fetch user's flashcard sets
export async function GET() {
  try {
    // Check authentication
    const auth = await requireUser()
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    // Get all flashcard sets for this user
    const flashcardSets = await db.flashcardSet.findMany({
      where: {
        userId
      },
      include: {
        // Include flashcard count and basic info
        flashcards: {
          select: {
            id: true, // We only need the count, not all data
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Show newest sets first
      }
    })

    // Transform the data to include flashcard count
    const setsWithCounts = flashcardSets.map(set => ({
      id: set.id,
      name: set.name,
      imageUrl: set.imageUrl,
      flashcardCount: set.flashcards.length,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
    }))

    return NextResponse.json({
      flashcardSets: setsWithCounts
    })

  } catch (error) {
    console.error("Error fetching flashcard sets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}