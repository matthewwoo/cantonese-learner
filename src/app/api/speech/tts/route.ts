// src/app/api/speech/tts/route.ts
// Cantonese text-to-speech endpoint.
//
// Provider order:
//   1. Fish Audio (S2 family) — most natural Cantonese available; voice is
//      a marketplace model set via FISH_AUDIO_VOICE_ID.
//   2. Azure AI Speech zh-HK neural voices — reliable fallback (also used
//      if Fish credit/rate limits are hit).

import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

// Azure's dedicated Cantonese neural voices (fallback provider)
const AZURE_CANTONESE_VOICES = [
  'zh-HK-WanLungNeural', // male (default)
  'zh-HK-HiuMaanNeural', // female
  'zh-HK-HiuGaaiNeural', // female
] as const;

interface TTSRequest {
  text: string;
  voice?: string; // Azure voice name or Fish reference id; optional
  speed?: number; // 0.25 to 4.0 (1.0 = normal)
  format?: 'mp3';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Fish Audio synthesis. Returns MP3 bytes or null when unavailable. */
async function synthesizeWithFish(
  text: string,
  speed: number
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        model: process.env.FISH_AUDIO_MODEL || 's2.1-pro-free',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        reference_id: process.env.FISH_AUDIO_VOICE_ID || undefined,
        format: 'mp3',
        // Fish supports 0.5–2.0; clamp our wider range
        prosody: { speed: Math.min(2, Math.max(0.5, speed)), volume: 0 },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      console.warn(`Fish Audio TTS unavailable (${response.status}): ${detail.slice(0, 200)} — falling back to Azure`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.warn('Fish Audio TTS error — falling back to Azure:', error);
    return null;
  }
}

/** Azure synthesis. Returns MP3 bytes or throws. */
async function synthesizeWithAzure(
  text: string,
  speed: number,
  requestedVoice?: string
): Promise<ArrayBuffer> {
  const azureKey = process.env.AZURE_SPEECH_KEY;
  const azureRegion = process.env.AZURE_SPEECH_REGION;
  if (!azureKey || !azureRegion) {
    throw new Error('No TTS provider configured (FISH_AUDIO_API_KEY or AZURE_SPEECH_KEY)');
  }

  const voice = AZURE_CANTONESE_VOICES.includes(requestedVoice as never)
    ? (requestedVoice as string)
    : AZURE_CANTONESE_VOICES[0];

  const ratePercent = Math.round((speed - 1) * 100);
  const ssml =
    `<speak version="1.0" xml:lang="zh-HK">` +
    `<voice name="${voice}">` +
    `<prosody rate="${ratePercent >= 0 ? '+' : ''}${ratePercent}%">` +
    escapeXml(text) +
    `</prosody></voice></speak>`;

  const response = await fetch(
    `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'cantonese-learner',
      },
      body: ssml,
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Azure TTS error ${response.status}: ${errorText.slice(0, 200)}`);
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

    // Fish Audio first, Azure as fallback
    let provider = 'fish-audio';
    let audioBuffer = await synthesizeWithFish(trimmed, speed);
    if (!audioBuffer) {
      provider = 'azure';
      audioBuffer = await synthesizeWithAzure(trimmed, speed, body.voice);
    }

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
      voice: provider === 'fish-audio'
        ? `fish:${process.env.FISH_AUDIO_VOICE_ID || 'default'}`
        : AZURE_CANTONESE_VOICES[0],
      provider,
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
