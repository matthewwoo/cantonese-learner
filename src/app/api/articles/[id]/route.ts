import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

/**
 * GET /api/articles/[id] - Get detailed content of a specific article
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is logged in
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
    // Get article
    const article = await prisma.article.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Ensure can only access own articles
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if there's an existing reading session
    let readingSession = await prisma.readingSession.findFirst({
      where: {
        userId: user.id,
        articleId: article.id,
        completedAt: null, // Uncompleted session
      },
    });

    // If no active reading session, create a new one
    if (!readingSession) {
      readingSession = await prisma.readingSession.create({
        data: {
          userId: user.id,
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
    // Delete article (can only delete own articles)
    const deletedArticle = await prisma.article.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
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