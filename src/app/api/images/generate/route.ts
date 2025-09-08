// src/app/api/images/generate/route.ts
// API endpoint for generating images using OpenAI DALL-E

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
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

    // Sanitize and create a safe prompt
    const sanitizedPrompt = prompt.trim().slice(0, 100) // Limit length
    const imagePrompt = `A simple, flat illustration of a single object with a white background representing: ${sanitizedPrompt}. Only illustrate one object. `

    console.log('Generating image with prompt:', imagePrompt)

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    })

    console.log('Image generation response:', response)

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      console.error('No image URL in response:', response)
      return NextResponse.json(
        { error: 'Failed to generate image - no URL returned' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: response.data[0]?.revised_prompt || imagePrompt
    })

  } catch (error) {
    console.error('Image generation error:', error)
    
    // Handle specific OpenAI API errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status
      const message = (error as any).message || 'Unknown API error'
      
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
