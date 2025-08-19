import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@/generated/prisma';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Article creation validation schema
const createArticleSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
});

/**
 * GET /api/articles - Get all articles for the user
 * This endpoint returns a list of all articles created by the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is logged in
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in first' },
        { status: 401 }
      );
    }

    // Get user information from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all articles for the user
    const articles = await prisma.article.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }, // Sort by creation time in descending order
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        createdAt: true,
        updatedAt: true,
        // Don't return full content to improve performance
      },
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Failed to get articles list:', error);
    return NextResponse.json(
      { error: 'Failed to get articles list' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles - Create new article
 * Receives English content and translates it to Traditional Chinese
 */
export async function POST(request: NextRequest) {
  try {
    // Debug environment variables
    console.log('Article creation: Environment check');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('GOOGLE_TRANSLATE_API_KEY exists:', !!process.env.GOOGLE_TRANSLATE_API_KEY);
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
    console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'undefined');
    
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

    // Parse request content
    const body = await request.json();
    const validatedData = createArticleSchema.parse(body);

    // Split content into paragraphs or sentences
    const lines = validatedData.content
      .split('\n')
      .filter(line => line.trim().length > 0);

    // Translate each line
    console.log('Article creation: Starting translation of', lines.length, 'lines');
    const translatedLines = await translateLines(lines);
    console.log('Article creation: Translation completed. Original lines:', lines);
    console.log('Article creation: Translated lines:', translatedLines);

    // Extract all Chinese vocabulary and get definitions
    const wordDefinitions = await extractWordDefinitions(translatedLines);

    // Create article record
    console.log('Article creation: Storing in database...');
    console.log('Article creation: Original content (first 2 lines):', lines.slice(0, 2));
    console.log('Article creation: Translated content (first 2 lines):', translatedLines.slice(0, 2));
    
    const article = await prisma.article.create({
      data: {
        userId: user.id,
        title: validatedData.title,
        sourceUrl: validatedData.url,
        originalContent: lines,
        translatedContent: translatedLines,
        wordDefinitions: wordDefinitions,
      },
    });
    
    console.log('Article creation: Article created with ID:', article.id);

    return NextResponse.json({ 
      success: true, 
      articleId: article.id 
    });
  } catch (error) {
    console.error('Failed to create article:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}

/**
 * Translate array of text lines to Traditional Chinese
 */
async function translateLines(lines: string[]): Promise<string[]> {
  const translations: string[] = [];
  
  for (const line of lines) {
    if (line.trim().length === 0) {
      translations.push('');
      continue;
    }
    
    try {
      console.log(`Translating line: "${line}"`);
      // Use translation service directly instead of calling API
      const translatedText = await translateWithService(line.trim(), 'zh-TW', 'en');
      console.log(`Translation result: "${translatedText}"`);
      translations.push(translatedText);
    } catch (error) {
      console.error(`Translation error for line: ${line}`, error);
      translations.push(`[Translation Error] ${line}`);
    }
  }
  
  return translations;
}

/**
 * Translate using translation service
 */
async function translateWithService(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  console.log('Translation service: Checking available APIs...');
  
  // Check if Google Cloud Translation API key exists
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  console.log('Google Translate API key exists:', !!googleApiKey);
  
  if (googleApiKey) {
    console.log('Using Google Translate API');
    // Use Google Translate API
    return translateWithGoogle(text, targetLanguage, sourceLanguage, googleApiKey);
  }
  
  // Check if OpenAI API key exists
  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.log('OpenAI API key exists:', !!openaiApiKey);
  
  if (openaiApiKey) {
    console.log('Using OpenAI API for translation');
    // Use OpenAI for translation
    return translateWithOpenAI(text, targetLanguage, sourceLanguage, openaiApiKey);
  }
  
  // If no translation service configured, return mock translation
  console.warn('No translation API configured, using mock translation');
  return mockTranslate(text, targetLanguage);
}

/**
 * Use Google Translate API
 */
async function translateWithGoogle(
  text: string,
  targetLanguage: string,
  sourceLanguage: string | undefined,
  apiKey: string
): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  
  // Convert language codes
  const target = targetLanguage === 'zh-TW' ? 'zh-TW' : 'en';
  const source = sourceLanguage ? (sourceLanguage === 'zh-TW' ? 'zh-TW' : 'en') : 'auto';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      target,
      source,
      format: 'text',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Google Translate API request failed');
  }
  
  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * Use OpenAI API for translation
 */
async function translateWithOpenAI(
  text: string,
  targetLanguage: string,
  sourceLanguage: string | undefined,
  apiKey: string
): Promise<string> {
  const targetLang = targetLanguage === 'zh-TW' ? 'Traditional Chinese' : 'English';
  const sourceLang = sourceLanguage ? (sourceLanguage === 'zh-TW' ? 'Traditional Chinese' : 'English') : 'auto-detect';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. 
                   Only provide the translation without any explanation. 
                   For Chinese, always use Traditional Chinese as used in Hong Kong and Taiwan.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });
  
  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Mock translation (for development environment)
 */
function mockTranslate(text: string, targetLanguage: string): string {
  if (targetLanguage === 'zh-TW') {
    // Mock English to Chinese translation
    const translations: Record<string, string> = {
      'Hello': '你好',
      'Good morning': '早安',
      'Thank you': '謝謝',
      'How are you?': '你好嗎？',
      'Hello world': '你好世界',
      'This is a test article': '這是一篇測試文章',
      'How are you today?': '你今天好嗎？',
    };
    
    return translations[text] || `[中文翻譯] ${text}`;
  } else {
    // Mock Chinese to English translation
    const translations: Record<string, string> = {
      '你好': 'Hello',
      '早安': 'Good morning',
      '謝謝': 'Thank you',
      '你好嗎？': 'How are you?',
    };
    
    return translations[text] || `[English translation] ${text}`;
  }
}

/**
 * Extract vocabulary definitions from translated text
 * Creates basic definitions for Chinese characters
 */
async function extractWordDefinitions(translatedLines: string[]): Promise<Record<string, any>> {
  // Extract all Chinese characters
  const chineseWords = new Set<string>();
  
  translatedLines.forEach(line => {
    // Use regex to match Chinese characters
    const matches = line.match(/[\u4e00-\u9fff]+/g);
    if (matches) {
      matches.forEach(word => chineseWords.add(word));
    }
  });

  // Get definition for each vocabulary
  const definitions: Record<string, any> = {};
  
  for (const word of chineseWords) {
    try {
      // Try to get translation for the word using direct service
      const englishTranslation = await translateWithService(word, 'en', 'zh-TW');
      definitions[word] = {
        pinyin: generatePinyin(word), // Placeholder - would need a proper pinyin service
        english: englishTranslation,
        traditional: word,
      };
    } catch (error) {
      console.error(`Failed to get definition for word: ${word}`, error);
      // Fallback definition
      definitions[word] = {
        pinyin: generatePinyin(word),
        english: 'Chinese character',
        traditional: word,
      };
    }
  }

  return definitions;
}

/**
 * Generate basic pinyin for Chinese characters
 * This is a simplified version - in production, use a proper pinyin service
 */
function generatePinyin(word: string): string {
  // This is a placeholder - would need to integrate with a pinyin service
  // For now, return a simple placeholder
  return word.split('').map(char => 'pīn').join(' ');
}