import { NextRequest, NextResponse, after } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/async/pool';
import { z } from 'zod';

// Article creation validation schema
const createArticleSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
});

// NOTE: listing/reading/deleting articles happens client-side via
// src/lib/data/articles.ts. This route only handles CREATION, which needs
// server-side translation APIs (OpenAI / Google Translate).

// Translation is dozens to hundreds of OpenAI round trips, so it does not
// happen inside the request. The row is inserted 'pending' and returned at
// once — the articles list renders a placeholder card from it and the user
// carries on — and `after()` fills in the translation and flips it to 'ready'.

/**
 * POST /api/articles - Create new article
 *
 * Responds as soon as the article row exists. The English -> Cantonese
 * translation runs in the background and updates the row when it lands.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is logged in
    const supabase = await createRouteClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in first' },
        { status: 401 }
      );
    }

    // Parse request content
    const body = await request.json();
    const validatedData = createArticleSchema.parse(body);

    // Split content into paragraphs or sentences
    const lines = validatedData.content
      .split('\n')
      .filter(line => line.trim().length > 0);

    // Reserve the row up front, untranslated. This is what the articles list
    // renders its placeholder from, and it is why the placeholder survives a
    // refresh or a closed tab.
    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        source_url: validatedData.url ?? null,
        original_content: lines,
        translated_content: [],
        word_definitions: {},
        status: 'pending',
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const articleId = article.id;

    // Runs once the response below has been sent. The Supabase client already
    // holds this user's JWT in memory, so RLS still scopes the update to them.
    after(async () => {
      try {
        console.log('Article', articleId, ': translating', lines.length, 'lines');
        const translatedLines = await translateLines(lines);
        const wordDefinitions = await extractWordDefinitions(translatedLines);

        const { error: updateError } = await supabase
          .from('articles')
          .update({
            translated_content: translatedLines,
            word_definitions: wordDefinitions,
            status: 'ready',
            error_message: null,
          })
          .eq('id', articleId);
        if (updateError) throw updateError;

        console.log('Article', articleId, ': translation complete');
      } catch (error) {
        console.error('Article', articleId, ': translation failed', error);
        const message =
          error instanceof Error ? error.message : 'Translation failed';
        await supabase
          .from('articles')
          .update({ status: 'failed', error_message: message.slice(0, 500) })
          .eq('id', articleId);
      }
    });

    return NextResponse.json({
      success: true,
      articleId
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

// One OpenAI round trip per line and per vocabulary word adds up fast: a long
// article is hundreds of calls, and awaiting them one at a time runs past the
// 300s function ceiling in vercel.json, which would strand the row as
// 'pending' forever. Six at a time is the same set of calls, just overlapped.
const TRANSLATION_CONCURRENCY = 6;

/**
 * Translate array of text lines to Traditional Chinese.
 * A line that fails to translate degrades to a marked passthrough rather than
 * failing the whole article.
 */
async function translateLines(lines: string[]): Promise<string[]> {
  return mapWithConcurrency(lines, TRANSLATION_CONCURRENCY, async (line) => {
    if (line.trim().length === 0) return '';

    try {
      return await translateWithService(line.trim(), 'zh-TW', 'en');
    } catch (error) {
      console.error(`Translation error for line: ${line}`, error);
      return `[Translation Error] ${line}`;
    }
  });
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
  
  // Check if OpenAI API key exists (Primary)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.log('OpenAI API key exists:', !!openaiApiKey);
  
  if (openaiApiKey) {
    console.log('Using OpenAI API for translation');
    // Use OpenAI for translation
    return translateWithOpenAI(text, targetLanguage, sourceLanguage, openaiApiKey);
  }
  
  // Check if Google Cloud Translation API key exists (Fallback)
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  console.log('Google Translate API key exists:', !!googleApiKey);
  
  if (googleApiKey) {
    // Google Translate has no Cantonese target — zh-TW gives Standard Written
    // Chinese (Mandarin in Traditional characters). Articles produced this way
    // will read aloud in Mandarin, since Fish Audio infers language from text.
    // Prefer OPENAI_API_KEY for article translation.
    console.warn(
      'Falling back to Google Translate: output will be Standard Written Chinese, NOT Cantonese. Set OPENAI_API_KEY for Cantonese translation.'
    );
    return translateWithGoogle(text, targetLanguage, sourceLanguage, googleApiKey);
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
  const toChinese = targetLanguage === 'zh-TW';
  const targetLang = toChinese ? 'written Cantonese' : 'English';
  const sourceLang = sourceLanguage ? (sourceLanguage === 'zh-TW' ? 'written Cantonese' : 'English') : 'auto-detect';

  // Asking for "Traditional Chinese" yields Standard Written Chinese — Mandarin
  // grammar and vocabulary that merely uses Traditional characters. That is the
  // wrong study material for a Cantonese app, and it also makes TTS drift:
  // Fish Audio has no language parameter and infers pronunciation from the text,
  // so Mandarin-shaped text gets read aloud in Mandarin. Naming the colloquial
  // markers explicitly is what makes the output unambiguously Cantonese.
  const cantoneseSystemPrompt = `You are a professional translator specialising in Cantonese (粵語 / 廣東話) as spoken in Hong Kong.

Translate the following text from ${sourceLang} to ${targetLang}.

Critical requirements:
- Write COLLOQUIAL CANTONESE (口語), not Standard Written Chinese (書面語). The result must read as spoken Hong Kong Cantonese.
- Use Traditional characters.
- Use Cantonese vocabulary and particles, NOT their Mandarin equivalents:
  嘅 (not 的), 係 (not 是), 佢 (not 他/她), 咗 (not 了), 喺 (not 在),
  唔 (not 不), 冇 (not 沒有), 睇 (not 看), 講 (not 說), 攞 (not 拿),
  乜嘢/咩 (not 什麼), 點解 (not 為什麼), 而家 (not 現在), 好 (not 很).
- Keep sentence-final particles where they sound natural (啦, 喇, 嘅, 呀, 㗎, 咩).
- A reader from Hong Kong should recognise it immediately as Cantonese, not as Mandarin written in Traditional characters.

Only provide the translation. No explanation, no romanisation, no notes.`;

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
          content: toChinese
            ? cantoneseSystemPrompt
            : `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translation without any explanation.`,
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

  // Get definition for each vocabulary word (see TRANSLATION_CONCURRENCY —
  // this is the loop that dominates a long article's runtime)
  const words = [...chineseWords];
  const entries = await mapWithConcurrency(
    words,
    TRANSLATION_CONCURRENCY,
    async (word) => {
      try {
        const englishTranslation = await translateWithService(word, 'en', 'zh-TW');
        return {
          pinyin: generatePinyin(word), // Placeholder - would need a proper pinyin service
          english: englishTranslation,
          traditional: word,
        };
      } catch (error) {
        console.error(`Failed to get definition for word: ${word}`, error);
        // Fallback definition
        return {
          pinyin: generatePinyin(word),
          english: 'Chinese character',
          traditional: word,
        };
      }
    }
  );

  const definitions: Record<string, any> = {};
  words.forEach((word, i) => {
    definitions[word] = entries[i];
  });

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