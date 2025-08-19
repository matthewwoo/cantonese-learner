import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@/generated/prisma';
import { processArticleIntoSentences, validateSentenceCards } from '@/utils/sentenceProcessor';

const prisma = new PrismaClient();

/**
 * POST /api/articles/[id]/process-sentences
 * Process an existing article into sentence cards for reading sessions
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
    const articleId = params.id;

    // Get the article
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        userId: user.id,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if article is already processed
    if (article.sentences && article.sentenceCount) {
      return NextResponse.json({
        success: true,
        message: 'Article already processed',
        data: {
          sentences: article.sentences,
          sentenceCount: article.sentenceCount,
          difficulty: article.difficulty,
          estimatedMinutes: article.estimatedMinutes,
        },
      });
    }

    // Process article into sentences
    const processedArticle = processArticleIntoSentences(
      article.originalContent as string[],
      article.translatedContent as string[]
    );

    // Validate processed sentences
    if (!validateSentenceCards(processedArticle.sentences)) {
      return NextResponse.json(
        { error: 'Failed to process article into valid sentences' },
        { status: 400 }
      );
    }

    // Update article with processed sentences
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        sentences: processedArticle.sentences as any,
        sentenceCount: processedArticle.sentenceCount,
        difficulty: processedArticle.difficulty,
        estimatedMinutes: processedArticle.estimatedMinutes,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Article processed successfully',
      data: {
        sentences: processedArticle.sentences,
        sentenceCount: processedArticle.sentenceCount,
        difficulty: processedArticle.difficulty,
        estimatedMinutes: processedArticle.estimatedMinutes,
      },
    });
  } catch (error) {
    console.error('Failed to process article sentences:', error);
    return NextResponse.json(
      { error: 'Failed to process article sentences' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/articles/[id]/process-sentences
 * Get processed sentence data for an article
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
    const articleId = params.id;

    // Get the article with sentence data
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
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

    // Check if article has been processed
    if (!article.sentences || !article.sentenceCount) {
      return NextResponse.json({
        success: false,
        message: 'Article not yet processed',
        needsProcessing: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sentences: article.sentences,
        sentenceCount: article.sentenceCount,
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
      },
    });
  } catch (error) {
    console.error('Failed to get article sentences:', error);
    return NextResponse.json(
      { error: 'Failed to get article sentences' },
      { status: 500 }
    );
  }
}
