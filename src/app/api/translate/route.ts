import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

// Translation request validation schema
const translateSchema = z.object({
  text: z.string().min(1),
  targetLanguage: z.enum(['zh-TW', 'en']), // Traditional Chinese or English
  sourceLanguage: z.enum(['en', 'zh-TW']).optional(),
});

/**
 * POST /api/translate - Translate text
 * Supports English to Traditional Chinese, and Traditional Chinese to English
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
    const { text, targetLanguage, sourceLanguage } = translateSchema.parse(body);

    // Use Google Translate API or other translation services
    // Here we temporarily use free LibreTranslate API as an example
    // For production, recommend using Google Cloud Translation API or DeepL
    
    const translatedText = await translateWithService(text, targetLanguage, sourceLanguage);

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText,
      targetLanguage,
    });
  } catch (error) {
    console.error('Translation failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Translation service temporarily unavailable' },
      { status: 500 }
    );
  }
}

/**
 * Translate using translation service
 * TODO: Integrate actual translation API
 */
async function translateWithService(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  // Check if Google Cloud Translation API key exists
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (googleApiKey) {
    // Use Google Translate API
    return translateWithGoogle(text, targetLanguage, sourceLanguage, googleApiKey);
  }
  
  // Check if OpenAI API key exists
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (openaiApiKey) {
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
      'Hello': 'Hello (Chinese)',
      'Good morning': 'Good morning (Chinese)',
      'Thank you': 'Thank you (Chinese)',
      'How are you?': 'How are you? (Chinese)',
    };
    
    return translations[text] || `[Chinese Translation] ${text}`;
  } else {
    // Mock Chinese to English translation
    const translations: Record<string, string> = {
      'Hello': 'Hello',
      'Good morning': 'Good morning',
      'Thank you': 'Thank you',
      'How are you?': 'How are you?',
    };
    
    return translations[text] || `[English translation] ${text}`;
  }
}