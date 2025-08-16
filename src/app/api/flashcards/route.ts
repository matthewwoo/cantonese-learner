// src/app/api/flashcards/route.ts
// This API endpoint gets all flashcard sets for the authenticated user

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Session } from "next-auth"

// Handle GET requests to fetch user's flashcard sets
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get all flashcard sets for this user
    const flashcardSets = await db.flashcardSet.findMany({
      where: {
        userId: session.user.id
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
      description: set.description,
      theme: set.theme,
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