import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

// Validation schema
const fetchArticleSchema = z.object({
  url: z.string().url(),
});

/**
 * POST /api/articles/fetch - Fetch article content from URL
 * This endpoint will scrape web content and extract article text
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is logged in
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in first' },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const { url } = fetchArticleSchema.parse(body);

    // Fetch web page content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CantoneseApp/1.0)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Unable to fetch web content: ${response.status}`);
      }

      const html = await response.text();

      // Parse HTML and extract article content
      const articleContent = extractArticleContent(html);

      // Try to extract title
      const title = extractTitle(html) || 'Untitled Article';

      // Validate that we actually extracted some content
      if (!articleContent || articleContent.trim().length < 50) {
        return NextResponse.json(
          { error: 'Unable to extract meaningful content from this URL. The page might not contain readable article content.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        title,
        content: articleContent,
        url,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      console.error('Failed to fetch article content:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid URL' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to fetch article content' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to fetch article content:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Unable to fetch article content' },
      { status: 500 }
    );
  }
}

/**
 * Extract main article content from HTML
 * Uses multiple heuristic methods to extract paragraph text
 */
function extractArticleContent(html: string): string {
  // Remove script and style tags
  let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  content = content.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  content = content.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
  content = content.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  content = content.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');
  
  const paragraphs: string[] = [];
  
  // Strategy 1: Try to extract from article or main tags first
  const articleRegex = /<(article|main)[^>]*>(.*?)<\/(article|main)>/gis;
  const articleMatch = articleRegex.exec(content);
  
  if (articleMatch) {
    const articleContent = stripHtmlTags(articleMatch[2]);
    const lines = articleContent.split('\n').filter(line => line.trim().length > 20);
    paragraphs.push(...lines);
  }
  
  // Strategy 2: Extract paragraph tags
  if (paragraphs.length === 0) {
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let match;
    
    while ((match = pRegex.exec(content)) !== null) {
      const text = stripHtmlTags(match[1]).trim();
      if (text.length > 20) { // Only keep meaningful paragraphs
        paragraphs.push(text);
      }
    }
  }
  
  // Strategy 3: Try to extract from div tags with common article class names
  if (paragraphs.length === 0) {
    const divRegex = /<div[^>]*class="[^"]*(?:content|article|post|entry|text)[^"]*"[^>]*>(.*?)<\/div>/gis;
    let match;
    
    while ((match = divRegex.exec(content)) !== null) {
      const text = stripHtmlTags(match[1]).trim();
      if (text.length > 50) {
        paragraphs.push(text);
      }
    }
  }
  
  // Strategy 4: Extract from body tag as last resort
  if (paragraphs.length === 0) {
    const bodyRegex = /<body[^>]*>(.*?)<\/body>/gis;
    const bodyMatch = bodyRegex.exec(content);
    
    if (bodyMatch) {
      const bodyContent = stripHtmlTags(bodyMatch[1]);
      const lines = bodyContent.split('\n').filter(line => line.trim().length > 30);
      paragraphs.push(...lines);
    }
  }
  
  // Clean up and filter paragraphs
  const cleanedParagraphs = paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 20 && !p.match(/^(menu|navigation|search|login|sign|cookie|privacy|terms)/i))
    .slice(0, 50); // Limit to first 50 paragraphs to avoid too much content
  
  return cleanedParagraphs.join('\n\n');
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | null {
  // Strategy 1: Try to extract from <title> tag
  const titleMatch = /<title[^>]*>(.*?)<\/title>/i.exec(html);
  if (titleMatch) {
    const title = stripHtmlTags(titleMatch[1]).trim();
    if (title && title.length > 0) {
      return title;
    }
  }
  
  // Strategy 2: Try to extract from <h1> tag
  const h1Match = /<h1[^>]*>(.*?)<\/h1>/i.exec(html);
  if (h1Match) {
    const title = stripHtmlTags(h1Match[1]).trim();
    if (title && title.length > 0) {
      return title;
    }
  }
  
  // Strategy 3: Try to extract from meta tags
  const metaTitleMatch = /<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i.exec(html);
  if (metaTitleMatch) {
    const title = metaTitleMatch[1].trim();
    if (title && title.length > 0) {
      return title;
    }
  }
  
  // Strategy 4: Try to extract from meta description
  const metaDescMatch = /<meta[^>]*name="description"[^>]*content="([^"]*)"/i.exec(html);
  if (metaDescMatch) {
    const title = metaDescMatch[1].trim();
    if (title && title.length > 0 && title.length < 100) {
      return title;
    }
  }
  
  // Strategy 5: Try to extract from first h2 tag
  const h2Match = /<h2[^>]*>(.*?)<\/h2>/i.exec(html);
  if (h2Match) {
    const title = stripHtmlTags(h2Match[1]).trim();
    if (title && title.length > 0) {
      return title;
    }
  }
  
  return null;
}

/**
 * Remove HTML tags
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}