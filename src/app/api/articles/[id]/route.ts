import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';

/**
 * GET /api/articles/[id] - Get detailed content of a specific article
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is logged in
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;

    const params = await context.params;
    // Get article
    const article = await db.article.findFirst({
      where: {
        id: params.id,
        userId, // Ensure can only access own articles
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if there's an existing reading session
    let readingSession = await db.readingSession.findFirst({
      where: {
        userId,
        articleId: article.id,
        completedAt: null, // Uncompleted session
      },
    });

    // If no active reading session, create a new one
    if (!readingSession) {
      readingSession = await db.readingSession.create({
        data: {
          userId,
          articleId: article.id,
        },
      });
    }

    return NextResponse.json({
      article,
      readingSession,
    });
  } catch (error) {
    console.error('Failed to get article:', error);
    return NextResponse.json(
      { error: 'Failed to get article' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/[id] - Delete article
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is logged in
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;

    const params = await context.params;
    // Delete article (can only delete own articles)
    const deletedArticle = await db.article.deleteMany({
      where: {
        id: params.id,
        userId,
      },
    });

    if (deletedArticle.count === 0) {
      return NextResponse.json(
        { error: 'Article not found or no permission to delete' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted',
    });
  } catch (error) {
    console.error('Failed to delete article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}