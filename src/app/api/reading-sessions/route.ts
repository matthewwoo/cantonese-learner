import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@/generated/prisma';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Validation schema for creating a reading session
const createSessionSchema = z.object({
  articleId: z.string().min(1),
  autoPlayTTS: z.boolean().default(true),
  ttsSpeed: z.number().min(0.5).max(2.0).default(1.0),
  showTranslation: z.boolean().default(false),
});

/**
 * POST /api/reading-sessions
 * Start a new reading session
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    // Get the article and ensure it has processed sentences
    const article = await prisma.article.findFirst({
      where: {
        id: validatedData.articleId,
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        sentences: true,
        sentenceCount: true,
        difficulty: true,
        estimatedMinutes: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if article has been processed into sentences
    if (!article.sentences || !article.sentenceCount) {
      return NextResponse.json(
        { error: 'Article must be processed into sentences first' },
        { status: 400 }
      );
    }

    // Check if user already has an active session for this article
    const existingSession = await prisma.readingSessionV2.findFirst({
      where: {
        userId: user.id,
        articleId: validatedData.articleId,
        completedAt: null,
      },
    });

    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: 'Resuming existing session',
        sessionId: existingSession.id,
        session: existingSession,
      });
    }

    // Create new reading session
    const newSession = await prisma.readingSessionV2.create({
      data: {
        userId: user.id,
        articleId: validatedData.articleId,
        totalCards: article.sentenceCount,
        autoPlayTTS: validatedData.autoPlayTTS,
        ttsSpeed: validatedData.ttsSpeed,
        showTranslation: validatedData.showTranslation,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Reading session started',
      sessionId: newSession.id,
      session: newSession,
    });
  } catch (error) {
    console.error('Failed to create reading session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reading session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reading-sessions
 * Get user's active reading sessions
 */
export async function GET(request: NextRequest) {
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

    // Get all reading sessions for the user
    const readingSessions = await prisma.readingSessionV2.findMany({
      where: {
        userId: user.id,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      sessions: readingSessions,
    });
  } catch (error) {
    console.error('Failed to get reading sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get reading sessions' },
      { status: 500 }
    );
  }
}
