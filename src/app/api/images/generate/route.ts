// src/app/api/images/generate/route.ts
// API endpoint for generating images using OpenAI DALL-E

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server';
import { generateDeckImage } from '@/lib/images/deck-image'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const { imageUrl, prompt: revisedPrompt } = await generateDeckImage(prompt)

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: revisedPrompt
    })

  } catch (error) {
    console.error('Image generation error:', error)

    // Handle specific OpenAI API errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: number }).status
      const message = (error as { message?: string }).message || 'Unknown API error'

      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key or authentication failed' },
          { status: 401 }
        )
      } else if (status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      } else if (status === 400) {
        return NextResponse.json(
          { error: `Invalid request: ${message}` },
          { status: 400 }
        )
      } else if (status === 403) {
        return NextResponse.json(
          { error: 'Content policy violation. Please try a different prompt.' },
          { status: 403 }
        )
      }
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Image generation failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during image generation' },
      { status: 500 }
    )
  }
}
