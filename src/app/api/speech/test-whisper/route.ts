// src/app/api/speech/test-whisper/route.ts
// Test Whisper API with a simple request

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Session } from 'next-auth'

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

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Test with a simple text request first
    console.log('Testing OpenAI API connectivity...')
    
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!modelsResponse.ok) {
      let errorData
      try {
        errorData = await modelsResponse.json()
      } catch (e) {
        errorData = { error: `HTTP ${modelsResponse.status}: ${modelsResponse.statusText}` }
      }
      
      return NextResponse.json({
        success: false,
        error: 'OpenAI API connectivity test failed',
        details: errorData,
        status: modelsResponse.status
      })
    }

    const modelsData = await modelsResponse.json()
    const hasWhisper = modelsData.data?.some((model: any) => model.id === 'whisper-1')
    
    if (!hasWhisper) {
      return NextResponse.json({
        success: false,
        error: 'Whisper model not available',
        availableModels: modelsData.data?.map((m: any) => m.id) || []
      })
    }

    return NextResponse.json({
      success: true,
      message: 'OpenAI API and Whisper model are available',
      hasWhisper: true,
      availableModels: modelsData.data?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Whisper test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Whisper API test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
