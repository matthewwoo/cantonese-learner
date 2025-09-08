// src/app/api/flashcards/upload/route.ts
// This API endpoint handles uploading CSV files and creating flashcard sets

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { Session } from "next-auth"

// Validation schema for flashcard data
const flashcardSchema = z.object({
  chineseWord: z.string().min(1, "Chinese word is required"),
  englishTranslation: z.string().min(1, "English translation is required"), 
  pronunciation: z.string().optional(),
  exampleSentenceEnglish: z.string().optional(),
  exampleSentenceChinese: z.string().optional(),
})

// Schema for the entire flashcard set
const flashcardSetSchema = z.object({
  name: z.string().min(1, "Set name is required"),
  flashcards: z.array(flashcardSchema).min(1, "At least one flashcard is required"),
  imageUrl: z.string().url().optional().nullable(),
})

// This function handles POST requests for uploading flashcard sets
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse the request body
    const body = await request.json()
    
    // Validate the data structure
    const validatedData = flashcardSetSchema.parse(body)

    // Create the flashcard set in the database
    const flashcardSet = await db.flashcardSet.create({
      data: {
        name: validatedData.name,
        userId: session.user.id,
        imageUrl: validatedData.imageUrl || null,
        // Create all flashcards at the same time
        flashcards: {
          create: validatedData.flashcards.map(card => ({
            chineseWord: card.chineseWord,
            englishTranslation: card.englishTranslation,
            pronunciation: card.pronunciation || null,
            exampleSentenceEnglish: card.exampleSentenceEnglish || null,
            exampleSentenceChinese: card.exampleSentenceChinese || null,
          }))
        }
      },
      // Include the created flashcards in the response
      include: {
        flashcards: true
      }
    })

    return NextResponse.json({
      message: "Flashcard set uploaded successfully",
      flashcardSet: {
        id: flashcardSet.id,
        name: flashcardSet.name,
        flashcardCount: flashcardSet.flashcards.length,
        createdAt: flashcardSet.createdAt,
      }
    })

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      )
    }

    console.error("Flashcard upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}