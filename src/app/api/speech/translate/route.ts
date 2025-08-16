// src/app/api/speech/translate/route.ts
// OpenAI Chat Completions API endpoint for text translation

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface TranslateRequest {
  text: string
  targetLanguage: string // e.g., 'en', 'zh', 'yue'
  sourceLanguage?: string // optional, will be auto-detected if not provided
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Parse request body
    const body: TranslateRequest = await request.json()
    const { text, targetLanguage, sourceLanguage } = body

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
        { status: 400 }
      )
    }

    // Auto-detect Cantonese if no source language specified and text contains Chinese characters
    let detectedSourceLanguage = sourceLanguage
    if (!sourceLanguage && text.match(/[\u4e00-\u9fff]/)) {
      detectedSourceLanguage = 'yue' // Assume Cantonese for Chinese text
    }

    // Create translation prompt
    const translationPrompt = createTranslationPrompt(text, targetLanguage, detectedSourceLanguage)

    // Call OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given text accurately while preserving the original meaning and tone. Respond with only the translated text, nothing else.'
          },
          {
            role: 'user',
            content: translationPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent translations
      }),
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }
      console.error('OpenAI Translation API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to translate text', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const translatedText = data.choices[0]?.message?.content?.trim()

    if (!translatedText) {
      return NextResponse.json(
        { error: 'No translation received from API' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText,
      sourceLanguage: detectedSourceLanguage || sourceLanguage || 'auto-detected',
      targetLanguage
    })

  } catch (error) {
    console.error('Translation API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to translate text', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to create translation prompt
function createTranslationPrompt(text: string, targetLanguage: string, sourceLanguage?: string): string {
  const languageMap: { [key: string]: string } = {
    'en': 'English',
    'zh': 'Simplified Chinese',
    'zh-TW': 'Traditional Chinese',
    'yue': 'Cantonese (Traditional Chinese characters)',
    'yue-HK': 'Hong Kong Cantonese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian'
  }

  const targetLangName = languageMap[targetLanguage] || targetLanguage
  const sourceLangName = sourceLanguage ? languageMap[sourceLanguage] || sourceLanguage : 'Cantonese'

  // Enhanced prompt for Cantonese translation
  if (sourceLanguage === 'yue' || sourceLanguage === 'yue-HK' || (!sourceLanguage && text.match(/[\u4e00-\u9fff]/))) {
    return `Translate the following Cantonese text to ${targetLangName}. 
    
Note: This is Cantonese (廣東話), which is different from Mandarin Chinese. Cantonese has different pronunciation, vocabulary, and grammar patterns.

Text: "${text}"

Provide only the translation, no explanations or additional text.`
  }

  return `Translate the following text from ${sourceLangName} to ${targetLangName}:

"${text}"

Provide only the translation, no explanations or additional text.`
}
