// src/app/api/speech/test/route.ts
// Test endpoint for debugging speech-to-text and translation

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY
    const hasOpenAIKey = !!openaiApiKey

    // Test translation with a simple Chinese text
    let translationTest = null
    if (hasOpenAIKey) {
      try {
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
                content: 'You are a professional translator. Translate the given text accurately. Respond with only the translated text.'
              },
              {
                role: 'user',
                content: 'Translate "你好" to English'
              }
            ],
            max_tokens: 50,
            temperature: 0.3,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          translationTest = {
            success: true,
            result: data.choices[0]?.message?.content?.trim()
          }
        } else {
          const errorData = await response.json()
          translationTest = {
            success: false,
            error: errorData
          }
        }
      } catch (error) {
        translationTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      success: true,
      environment: {
        hasOpenAIKey,
        openaiKeyLength: hasOpenAIKey ? openaiApiKey!.length : 0
      },
      translationTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
