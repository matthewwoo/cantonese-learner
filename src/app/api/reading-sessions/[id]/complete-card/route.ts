import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@/generated/prisma';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for completing a card
const completeCardSchema = z.object({
  cardIndex: z.number().min(0),
  timeSpent: z.number().min(0), // Time spent in seconds
  wasFlipped: z.boolean().default(false), // Whether user needed translation
  audioReplayCount: z.number().min(0).default(0), // How many times audio was replayed
});

/**
 * POST /api/reading-sessions/[id]/complete-card
 * Mark a card as complete and track metrics
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in first' },
        { status: 401 }
      );
    }

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const params = await context.params;
    const sessionId = params.id;

    // Parse request body
    const body = await request.json();
    const validatedData = completeCardSchema.parse(body);

    // Get the current reading session
    const readingSession = await prisma.readingSessionV2.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
      include: {
        article: {
          select: {
            sentenceCount: true,
          },
        },
      },
    });

    if (!readingSession) {
      return NextResponse.json(
        { error: 'Reading session not found' },
        { status: 404 }
      );
    }

    // Validate card index
    if (validatedData.cardIndex >= readingSession.totalCards) {
      return NextResponse.json(
        { error: 'Invalid card index' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      lastActiveAt: new Date(),
    };

    // Add card to completed cards if not already completed
    const completedCards = [...(readingSession.completedCards || [])];
    if (!completedCards.includes(validatedData.cardIndex)) {
      completedCards.push(validatedData.cardIndex);
      updateData.completedCards = completedCards;
    }

    // Track if card was flipped (user needed translation)
    const cardsFlipped = [...(readingSession.cardsFlipped || [])];
    if (validatedData.wasFlipped && !cardsFlipped.includes(validatedData.cardIndex)) {
      cardsFlipped.push(validatedData.cardIndex);
      updateData.cardsFlipped = cardsFlipped;
    }

    // Track audio replay count
    const audioReplays = { ...(readingSession.audioReplays as Record<string, number> || {}) };
    if (validatedData.audioReplayCount > 0) {
      audioReplays[validatedData.cardIndex.toString()] = validatedData.audioReplayCount;
      updateData.audioReplays = audioReplays;
    }

    // Track time spent on card
    const timePerCard = { ...(readingSession.timePerCard as Record<string, number> || {}) };
    timePerCard[validatedData.cardIndex.toString()] = validatedData.timeSpent;
    updateData.timePerCard = timePerCard;

    // Move to next card
    const nextCardIndex = validatedData.cardIndex + 1;
    updateData.currentCardIndex = nextCardIndex;

    // Check if session is completed
    if (nextCardIndex >= readingSession.totalCards) {
      updateData.completedAt = new Date();
    }

    // Update the reading session
    const updatedSession = await prisma.readingSessionV2.update({
      where: {
        id: sessionId,
      },
      data: updateData,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            sentences: true,
            sentenceCount: true,
            difficulty: true,
            estimatedMinutes: true,
          },
        },
      },
    });

    // Calculate progress statistics
    const progressStats = {
      completedCards: updatedSession.completedCards.length,
      totalCards: updatedSession.totalCards,
      progressPercentage: Math.round((updatedSession.completedCards.length / updatedSession.totalCards) * 100),
      cardsFlipped: updatedSession.cardsFlipped.length,
      isCompleted: !!updatedSession.completedAt,
    };

    return NextResponse.json({
      success: true,
      message: 'Card completed successfully',
      session: updatedSession,
      progress: progressStats,
      nextCardIndex,
    });
  } catch (error) {
    console.error('Failed to complete card:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to complete card' },
      { status: 500 }
    );
  }
}
