// src/app/api/speech/test-openai/route.ts
// Test OpenAI API connectivity

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

    // Test OpenAI API with a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }
      
      return NextResponse.json({
        success: false,
        error: 'OpenAI API test failed',
        details: errorData,
        status: response.status
      })
    }

    const data = await response.json()
    
    // Check if whisper-1 model is available
    const hasWhisper = data.data?.some((model: any) => model.id === 'whisper-1')
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API is working',
      hasWhisper,
      availableModels: data.data?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenAI test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'OpenAI API test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
