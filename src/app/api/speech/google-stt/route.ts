// src/app/api/speech/google-stt/route.ts
// Google Cloud Speech-to-Text API using service account authentication

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Session } from 'next-auth'
import { SpeechClient } from '@google-cloud/speech'
import { GoogleAuth } from 'google-auth-library'
import path from 'path'

// Initialize Google Cloud Speech client with service account
function createSpeechClient(): SpeechClient {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set')
  }

  const auth = new GoogleAuth({
    keyFile: path.resolve(process.cwd(), credentialsPath),
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })

  return new SpeechClient({ auth })
}

interface GoogleSTTRequest {
  audio: {
    content: string // base64 encoded audio
  }
  config: {
    encoding?: string
    sampleRateHertz?: number
    languageCode?: string
    alternativeLanguageCodes?: string[]
    enableAutomaticPunctuation?: boolean
    enableWordTimeOffsets?: boolean
    enableWordConfidence?: boolean
    model?: string
  }
}

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

    // Check if Google Cloud credentials are configured
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (!credentialsPath) {
      return NextResponse.json(
        { error: 'Google Cloud credentials not configured' },
        { status: 500 }
      )
    }

    console.log('Google STT: Using credentials file:', credentialsPath)

    // Parse request body
    const body: GoogleSTTRequest = await request.json()
    const { audio, config } = body

    if (!audio?.content) {
      return NextResponse.json(
        { error: 'Audio content is required' },
        { status: 400 }
      )
    }

    console.log('Google STT: Audio content length:', audio.content.length)
    console.log('Google STT: Config:', config)

    // Create Speech client
    const speechClient = createSpeechClient()
    console.log('Google STT: Speech client created successfully')

    // Prepare the request
    const speechRequest = {
      audio: {
        content: audio.content
      },
      config: {
        encoding: (config.encoding || 'WEBM_OPUS') as 'WEBM_OPUS',
        // Don't specify sampleRateHertz for WEBM_OPUS - let Google Cloud detect it from the audio header
        languageCode: config.languageCode || 'yue-Hant-HK', // Cantonese (Hong Kong) with Traditional Chinese
        alternativeLanguageCodes: config.alternativeLanguageCodes || ['zh-HK', 'zh-TW', 'zh-CN'],
        enableAutomaticPunctuation: config.enableAutomaticPunctuation !== false,
        enableWordTimeOffsets: config.enableWordTimeOffsets || false,
        enableWordConfidence: config.enableWordConfidence || false
        // Don't specify model - use default which supports zh-HK
      }
    }

    console.log('Google STT: Request config:', {
      encoding: speechRequest.config.encoding,
      languageCode: speechRequest.config.languageCode,
      alternativeLanguageCodes: speechRequest.config.alternativeLanguageCodes
    })

    // Call Google Cloud Speech-to-Text API
    console.log('Google STT: Calling Google Cloud Speech-to-Text API...')
    const [response] = await speechClient.recognize(speechRequest)
    
    console.log('Google STT: Response received:', response)

    if (!response.results || response.results.length === 0) {
      return NextResponse.json(
        { error: 'No transcription results returned' },
        { status: 400 }
      )
    }

    // Extract transcript from results
    const transcript = response.results
      .map(result => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(' ')

    console.log('Google STT: Final transcript:', transcript)

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript generated from audio' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      transcript,
      confidence: response.results[0]?.alternatives?.[0]?.confidence || 0.95,
      isFinal: true
    })

  } catch (error) {
    console.error('Google STT error:', error)
    
    // Handle specific Google Cloud errors
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Google Cloud authentication failed. Check your service account credentials.' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Google Cloud Speech-to-Text quota exceeded' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('invalid audio')) {
        return NextResponse.json(
          { error: 'Invalid audio format or encoding' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to transcribe audio with Google STT', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
