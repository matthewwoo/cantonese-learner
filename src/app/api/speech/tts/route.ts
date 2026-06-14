// src/app/api/speech/tts/route.ts
// OpenAI Text-to-Speech API endpoint for Cantonese pronunciation

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { z } from 'zod';

// Request body validation schema
const ttsRequestSchema = z.object({
  text: z.string().trim().min(1, 'Text is required'),
  voice: z
    .enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .default('nova'),
  speed: z.number().min(0.25).max(4.0).default(1.0),
  format: z.enum(['mp3', 'opus', 'aac', 'flac']).default('mp3'),
  model: z.enum(['tts-1', 'tts-1-hd']).default('tts-1'),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse & validate request body
    const { text, voice, speed, format, model } = ttsRequestSchema.parse(
      await request.json()
    );


    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: format,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('OpenAI TTS API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: response.status }
      );
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for client-side playback
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const dataUrl = `data:audio/${format};base64,${base64Audio}`;

    // Estimate duration
    const estimatedDuration = Math.ceil((text.length / 150) * 60 / speed); // seconds

    return NextResponse.json({
      success: true,
      audioData: dataUrl,
      duration: estimatedDuration,
      text: text,
      voice,
      speed,
      format
    });

  } catch (error) {
    console.error('TTS API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
