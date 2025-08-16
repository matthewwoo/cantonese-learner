// src/app/api/speech/debug/route.ts
// Debug endpoint for audio recording and transcription issues

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Session } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions) as Session | null
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY
    const hasOpenAIKey = !!openaiApiKey

    // Parse request body
    const body = await request.json()
    const { audio, testType = 'validation' } = body

    let result: any = {
      success: true,
      environment: {
        hasOpenAIKey,
        openaiKeyLength: hasOpenAIKey ? openaiApiKey!.length : 0
      },
      testType,
      timestamp: new Date().toISOString()
    }

    if (testType === 'validation' && audio) {
      // Test audio data validation
      try {
        if (typeof audio !== 'string' || audio.length === 0) {
          result.audioValidation = { valid: false, error: 'Audio data is not a string or is empty' }
        } else {
          const decoded = atob(audio)
          result.audioValidation = { 
            valid: true, 
            size: decoded.length,
            base64Length: audio.length
          }
        }
      } catch (error) {
        result.audioValidation = { 
          valid: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    if (testType === 'whisper' && audio && hasOpenAIKey) {
      // Test Whisper API directly
      try {
        const formData = new FormData()
        const byteCharacters = atob(audio)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const audioBlob = new Blob([byteArray], { type: 'audio/webm' })
        
        formData.append('file', audioBlob, 'audio.webm')
        formData.append('model', 'whisper-1')
        formData.append('language', 'zh')
        formData.append('response_format', 'json')
        formData.append('prompt', 'This is Cantonese speech.')

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          result.whisperTest = { success: true, transcript: data.text }
        } else {
          const errorData = await response.json()
          result.whisperTest = { success: false, error: errorData, status: response.status }
        }
      } catch (error) {
        result.whisperTest = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Debug test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
