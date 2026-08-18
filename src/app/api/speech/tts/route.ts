// src/app/api/speech/tts/route.ts
// Cantonese text-to-speech endpoint.
//
// MiniMax Speech-02 (T2A v2) is the only provider. We pass
// `language_boost: "Chinese,Yue"`, which forces Cantonese pronunciation even
// for Standard Written Chinese (書面語) — so synthesis doesn't depend on the
// text being colloquial 口語 the way it did with the previous Fish Audio
// provider (which inferred language from the text and read 書面語 in Mandarin).
//
// Voice comes from MINIMAX_VOICE_ID (built-in Cantonese presets:
// Cantonese_GentleLady, Cantonese_podacast_host_1 [sic]; or a cloned voice id).
// Model from MINIMAX_TTS_MODEL (speech-02-hd default; speech-02-turbo is
// cheaper/faster).

import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

interface TTSRequest {
  text: string;
  voice?: string; // MiniMax voice_id; optional, defaults to MINIMAX_VOICE_ID
  speed?: number; // 0.25 to 4.0 (1.0 = normal)
  format?: 'mp3';
}

interface MiniMaxT2AResponse {
  data?: { audio?: string; status?: number };
  extra_info?: { audio_length?: number }; // ms
  base_resp?: { status_code?: number; status_msg?: string };
}

const DEFAULT_VOICE = 'Cantonese_GentleLady';

/** MiniMax Speech-02 synthesis. Returns MP3 bytes + reported duration, or throws. */
async function synthesizeWithMiniMax(
  text: string,
  speed: number,
  requestedVoice?: string
): Promise<{ audio: Buffer; voice: string; durationSec?: number }> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('No TTS provider configured (MINIMAX_API_KEY)');
  }
  const voiceId = requestedVoice || process.env.MINIMAX_VOICE_ID || DEFAULT_VOICE;

  const response = await fetch('https://api.minimax.io/v1/t2a_v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.MINIMAX_TTS_MODEL || 'speech-02-hd',
      text,
      language_boost: 'Chinese,Yue',
      voice_setting: {
        voice_id: voiceId,
        // MiniMax supports 0.5–2.0; clamp our wider range
        speed: Math.min(2, Math.max(0.5, speed)),
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: { format: 'mp3', sample_rate: 32000, bitrate: 128000, channel: 1 },
      output_format: 'hex',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`MiniMax TTS HTTP ${response.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as MiniMaxT2AResponse;
  if (json.base_resp?.status_code !== 0 || !json.data?.audio) {
    throw new Error(
      `MiniMax TTS error ${json.base_resp?.status_code}: ${json.base_resp?.status_msg || 'no audio'}`
    );
  }

  const audioLengthMs = json.extra_info?.audio_length;
  return {
    audio: Buffer.from(json.data.audio, 'hex'),
    voice: voiceId,
    durationSec: audioLengthMs ? Math.ceil(audioLengthMs / 1000) : undefined,
  };
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
    const result = await synthesizeWithMiniMax(trimmed, speed, body.voice);

    // Same response contract the client consumes
    const dataUrl = `data:audio/mp3;base64,${result.audio.toString('base64')}`;

    // Provider-reported duration when available; otherwise a rough estimate
    // (~4 chars/sec for Cantonese at normal speed).
    const duration = result.durationSec ?? Math.ceil(trimmed.length / 4 / speed);

    return NextResponse.json({
      success: true,
      audioData: dataUrl,
      duration,
      text: trimmed,
      voice: `minimax:${result.voice}`,
      provider: 'minimax',
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
