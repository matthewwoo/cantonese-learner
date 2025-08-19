import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@/generated/prisma';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for updating a reading session
const updateSessionSchema = z.object({
  currentCardIndex: z.number().min(0).optional(),
  completedCards: z.array(z.number()).optional(),
  cardsFlipped: z.array(z.number()).optional(),
  audioReplays: z.record(z.string(), z.number()).optional(),
  timePerCard: z.record(z.string(), z.number()).optional(),
  autoPlayTTS: z.boolean().optional(),
  ttsSpeed: z.number().min(0.5).max(2.0).optional(),
  showTranslation: z.boolean().optional(),
  completedAt: z.string().optional(), // ISO date string
});

/**
 * GET /api/reading-sessions/[id]
 * Get specific reading session with article data
 */
export async function GET(
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

    // Get the reading session with article data
    const readingSession = await prisma.readingSessionV2.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
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

    if (!readingSession) {
      return NextResponse.json(
        { error: 'Reading session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: readingSession,
    });
  } catch (error) {
    console.error('Failed to get reading session:', error);
    return NextResponse.json(
      { error: 'Failed to get reading session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reading-sessions/[id]
 * Update session progress
 */
export async function PATCH(
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
    const validatedData = updateSessionSchema.parse(body);

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.currentCardIndex !== undefined) {
      updateData.currentCardIndex = validatedData.currentCardIndex;
    }
    
    if (validatedData.completedCards !== undefined) {
      updateData.completedCards = validatedData.completedCards;
    }
    
    if (validatedData.cardsFlipped !== undefined) {
      updateData.cardsFlipped = validatedData.cardsFlipped;
    }
    
    if (validatedData.audioReplays !== undefined) {
      updateData.audioReplays = validatedData.audioReplays;
    }
    
    if (validatedData.timePerCard !== undefined) {
      updateData.timePerCard = validatedData.timePerCard;
    }
    
    if (validatedData.autoPlayTTS !== undefined) {
      updateData.autoPlayTTS = validatedData.autoPlayTTS;
    }
    
    if (validatedData.ttsSpeed !== undefined) {
      updateData.ttsSpeed = validatedData.ttsSpeed;
    }
    
    if (validatedData.showTranslation !== undefined) {
      updateData.showTranslation = validatedData.showTranslation;
    }
    
    if (validatedData.completedAt !== undefined) {
      updateData.completedAt = new Date(validatedData.completedAt);
    }

    // Update the reading session
    const updatedSession = await prisma.readingSessionV2.update({
      where: {
        id: sessionId,
        userId: user.id, // Ensure user owns this session
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

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully',
      session: updatedSession,
    });
  } catch (error) {
    console.error('Failed to update reading session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update reading session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reading-sessions/[id]
 * Delete/abandon a reading session
 */
export async function DELETE(
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

    // Delete the reading session
    await prisma.readingSessionV2.delete({
      where: {
        id: sessionId,
        userId: user.id, // Ensure user owns this session
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Reading session deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete reading session:', error);
    return NextResponse.json(
      { error: 'Failed to delete reading session' },
      { status: 500 }
    );
  }
}
