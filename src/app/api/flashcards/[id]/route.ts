// src/app/api/flashcards/[id]/route.ts
// API endpoint for individual flashcard set operations (GET, DELETE)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/flashcards/[id] - Get a specific flashcard set
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const flashcardSet = await db.flashcardSet.findFirst({
      where: {
        id,
        user: {
          email: session.user.email
        }
      },
      include: {
        flashcards: true
      }
    })

    if (!flashcardSet) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 })
    }

    return NextResponse.json({ flashcardSet })
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, verify the flashcard set belongs to the user
    const { id } = await context.params

    const flashcardSet = await db.flashcardSet.findFirst({
      where: {
        id,
        user: {
          email: session.user.email
        }
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
