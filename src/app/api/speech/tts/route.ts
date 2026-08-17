// src/app/api/speech/tts/route.ts
// Cantonese text-to-speech endpoint.
//
// Fish Audio (S2 family) is the only provider. Its voice is a marketplace
// model set via FISH_AUDIO_VOICE_ID.
//
// Caveat worth knowing: Fish's /v1/tts takes no language parameter — it infers
// pronunciation from the text, and the reference voice supplies timbre, not
// dialect. Standard Written Chinese (書面語) is character-identical to Mandarin,
// so it gets read in Mandarin. Keeping article text in colloquial Cantonese
// (口語 — 嘅/係/佢/咗/喺) is what keeps synthesis Cantonese; see the article
// translation prompt in /api/articles.

import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

interface TTSRequest {
  text: string;
  voice?: string; // Fish reference id; optional, defaults to FISH_AUDIO_VOICE_ID
  speed?: number; // 0.25 to 4.0 (1.0 = normal)
  format?: 'mp3';
}

/** Fish Audio synthesis. Returns MP3 bytes or throws. */
async function synthesizeWithFish(
  text: string,
  speed: number,
  requestedVoice?: string
): Promise<ArrayBuffer> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('No TTS provider configured (FISH_AUDIO_API_KEY)');
  }

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      model: process.env.FISH_AUDIO_MODEL || 's2.1-pro-free',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: requestedVoice || process.env.FISH_AUDIO_VOICE_ID || undefined,
      format: 'mp3',
      // Fish supports 0.5–2.0; clamp our wider range
      prosody: { speed: Math.min(2, Math.max(0.5, speed)), volume: 0 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Fish Audio TTS error ${response.status}: ${detail.slice(0, 200)}`);
  }
  return response.arrayBuffer();
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createRouteClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: TTSRequest = await request.json();
    const { text, speed = 1.0 } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json(
        { error: 'Speed must be between 0.25 and 4.0' },
        { status: 400 }
      );
    }

    const trimmed = text.trim();
    const audioBuffer = await synthesizeWithFish(trimmed, speed, body.voice);

    // Same response contract the client consumes
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const dataUrl = `data:audio/mp3;base64,${base64Audio}`;

    // Rough duration estimate (~4 chars/sec for Cantonese at normal speed)
    const estimatedDuration = Math.ceil(trimmed.length / 4 / speed);

    return NextResponse.json({
      success: true,
      audioData: dataUrl,
      duration: estimatedDuration,
      text: trimmed,
      voice: `fish:${process.env.FISH_AUDIO_VOICE_ID || 'default'}`,
      provider: 'fish-audio',
      speed,
      format: 'mp3',
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
