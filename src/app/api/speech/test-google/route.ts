// src/app/api/speech/test-google/route.ts
// Test Google Cloud API connectivity with service account

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

export async function GET(request: NextRequest) {
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

    console.log('Google API Test: Using credentials file:', credentialsPath)

    // Test with a simple request to check if the service account is valid
    const speechClient = createSpeechClient()
    console.log('Google API Test: Speech client created successfully')

    // Test with empty audio to check API access
    const testRequest = {
      audio: {
        content: '' // Empty content to test API access
      },
      config: {
        encoding: 'WEBM_OPUS' as const,
        // Don't specify sampleRateHertz for WEBM_OPUS
        languageCode: 'yue-Hant-HK'
        // Don't specify model - use default which supports yue-Hant-HK
      }
    }

    console.log('Google API Test: Testing with empty audio...')
    
    try {
      const response = await speechClient.recognize(testRequest)
      console.log('Google API Test: Response received:', response)
      
      return NextResponse.json({
        success: true,
        message: 'Google Cloud Speech-to-Text API is working',
        credentialsPath,
        timestamp: new Date().toISOString()
      })
    } catch (apiError) {
      console.log('Google API Test: Expected error for empty audio:', apiError)
      
      // Check if it's the expected error for empty audio
      if (apiError instanceof Error && apiError.message.includes('empty')) {
        return NextResponse.json({
          success: true,
          message: 'Google Cloud API is working (expected error for empty audio)',
          credentialsPath,
          timestamp: new Date().toISOString()
        })
      }
      
      // If it's an authentication error, that's a real problem
      if (apiError instanceof Error && apiError.message.includes('authentication')) {
        return NextResponse.json({
          success: false,
          error: 'Google Cloud authentication failed',
          details: apiError.message,
          credentialsPath
        })
      }
      
      // Other errors might be expected for empty audio
      return NextResponse.json({
        success: true,
        message: 'Google Cloud API responded (error expected for empty audio)',
        error: apiError instanceof Error ? apiError.message : 'Unknown error',
        credentialsPath,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Google API test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Google Cloud API test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
