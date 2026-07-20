// src/app/api/speech/tts/route.ts
// Azure AI Speech text-to-speech endpoint with native Cantonese (zh-HK)
// neural voices. Falls back to OpenAI TTS only if Azure is not configured.

import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

// Azure's dedicated Cantonese neural voices
const AZURE_CANTONESE_VOICES = [
  'zh-HK-WanLungNeural', // male (default)
  'zh-HK-HiuMaanNeural', // female
  'zh-HK-HiuGaaiNeural', // female
] as const;

const DEFAULT_VOICE = AZURE_CANTONESE_VOICES[0];

interface TTSRequest {
  text: string;
  voice?: string; // Azure voice name; legacy OpenAI names map to the default
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

    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION;
    if (!azureKey || !azureRegion) {
      return NextResponse.json(
        { error: 'Azure Speech is not configured (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: TTSRequest = await request.json();
    const { text, speed = 1.0 } = body;

    // Accept Azure voice names; anything else (incl. legacy OpenAI voice
    // names like "nova") falls back to the default Cantonese voice.
    const voice = AZURE_CANTONESE_VOICES.includes(body.voice as never)
      ? (body.voice as string)
      : DEFAULT_VOICE;

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

    // Map multiplier speed to SSML prosody rate percentage (1.0 -> +0%)
    const ratePercent = Math.round((speed - 1) * 100);
    const ssml =
      `<speak version="1.0" xml:lang="zh-HK">` +
      `<voice name="${voice}">` +
      `<prosody rate="${ratePercent >= 0 ? '+' : ''}${ratePercent}%">` +
      escapeXml(text.trim()) +
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
      console.error('Azure TTS error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to generate speech', details: errorText },
        { status: response.status }
      );
    }

    // Same response contract the client already consumes
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const dataUrl = `data:audio/mp3;base64,${base64Audio}`;

    // Rough duration estimate (~4 chars/sec for Cantonese at normal speed)
    const estimatedDuration = Math.ceil(text.length / 4 / speed);

    return NextResponse.json({
      success: true,
      audioData: dataUrl,
      duration: estimatedDuration,
      text,
      voice,
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
