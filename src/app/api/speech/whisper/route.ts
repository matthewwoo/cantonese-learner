// src/app/api/speech/whisper/route.ts
// OpenAI Whisper API endpoint for speech-to-text
// 
// CANTONESE OPTIMIZATION FEATURES:
// 1. Enhanced prompt with Cantonese-specific vocabulary and grammar patterns
// 2. Temperature set to 0.0 for consistent results
// 3. Compression ratio threshold optimized for dialect recognition
// 4. Log probability threshold adjusted for dialect variations
// 5. No speech threshold optimized for Cantonese speech patterns
// 6. Common Cantonese words included in prompt for better recognition

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server';

interface WhisperRequest {
  audio: string // Base64 encoded audio
  language?: string // Language code (e.g., 'zh', 'en', 'yue')
  audioType?: string // Audio MIME type (e.g., 'audio/webm', 'audio/mp4')
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

    // Parse request body
    const body: WhisperRequest = await request.json()
    const { audio, language = 'zh', audioType = 'audio/webm' } = body // Default to Chinese (zh) - Whisper doesn't support 'yue'

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      )
    }

    // Validate base64 audio data
    try {
      // Check if it's valid base64
      if (typeof audio !== 'string' || audio.length === 0) {
        return NextResponse.json(
          { error: 'Invalid audio data format' },
          { status: 400 }
        )
      }

      // Try to decode base64 to check if it's valid
      const decoded = atob(audio)
      if (decoded.length === 0) {
        return NextResponse.json(
          { error: 'Invalid base64 audio data' },
          { status: 400 }
        )
      }

      console.log('Audio data validation passed. Size:', decoded.length, 'bytes')
    } catch (error) {
      console.error('Audio data validation failed:', error)
      return NextResponse.json(
        { error: 'Invalid base64 audio data' },
        { status: 400 }
      )
    }

    // Call OpenAI Whisper API
    console.log('About to call OpenAI Whisper API with language:', language)
    
    const formData = createFormData(audio, language, audioType)
    console.log('FormData created, checking entries...')
    
    // Debug FormData contents
    for (const [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log('FormData file entry:', key, 'size:', (value as Blob).size, 'type:', (value as Blob).type)
      } else {
        console.log('FormData entry:', key, value)
      }
    }
    
    // Test the API key format
    console.log('API key starts with:', openaiApiKey.substring(0, 7) + '...')
    console.log('API key length:', openaiApiKey.length)
    
    // Log the request details
    console.log('Making request to OpenAI Whisper API...')
    console.log('Request method: POST')
    console.log('Request URL: https://api.openai.com/v1/audio/transcriptions')
    console.log('Authorization header present:', !!openaiApiKey)
    
    // Try a different approach - use node-fetch compatible method
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      let errorData
      let errorText = ''
      
      console.error('OpenAI Whisper API failed with status:', response.status)
      console.error('Response status text:', response.statusText)
      
      try {
        errorData = await response.json()
        console.error('OpenAI Whisper API error (JSON):', errorData)
      } catch (e) {
        console.error('Failed to parse JSON error response:', e)
        try {
          errorText = await response.text()
          console.error('OpenAI Whisper API error (text):', errorText)
        } catch (textError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`
          console.error('OpenAI Whisper API error (status):', errorText)
        }
        errorData = { error: errorText }
      }
      
      // Log all response headers for debugging
      const headers: { [key: string]: string } = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })
      console.error('Response headers:', headers)
      // Single-line summary (multi-line objects get truncated in Vercel logs)
      console.error(
        `Whisper upstream ${response.status} audioType=${audioType} file=audio.${extensionForAudioType(audioType)}: ${JSON.stringify(errorData).slice(0, 500)}`
      )

      return NextResponse.json(
        { error: 'Failed to transcribe audio', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      transcript: data.text,
      language: data.language || language
    })

  } catch (error) {
    console.error('Whisper API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to process audio transcription', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to create form data for Whisper API
function createFormData(base64Audio: string, language: string, audioType: string = 'audio/webm'): FormData {
  try {
    const formData = new FormData()
    
    // Convert base64 to blob using the provided audio type
    const audioBlob = base64ToBlob(base64Audio, audioType)
    console.log('Audio blob created. Size:', audioBlob.size, 'bytes, Type:', audioBlob.type)
    
    // Check if blob is valid
    if (audioBlob.size === 0) {
      throw new Error('Audio blob is empty')
    }
    
    // Whisper validates the container by file extension, so it must match the
    // bytes: the web sends WebM/Opus, native iOS sends AAC in an M4A container.
    // (An .mp3 name on M4A bytes is rejected with "Invalid file format".)
    const fileName = `audio.${extensionForAudioType(audioType)}`

    formData.append('file', audioBlob, fileName)
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'json')
    
    // Additional parameters for better Cantonese recognition
    if (language === 'zh') {
      formData.append('temperature', '0.0') // Lower temperature for more consistent results
      formData.append('compression_ratio_threshold', '2.4') // Helps with dialect recognition
      formData.append('logprob_threshold', '-1.0') // More permissive for dialect variations
      formData.append('no_speech_threshold', '0.6') // Better handling of Cantonese speech patterns
    }
    
    // Enhanced prompt for better Cantonese recognition
    if (language === 'zh') {
      formData.append('prompt', 'This is Cantonese (廣東話) speech from Hong Kong. The speaker is using Cantonese dialect, not Mandarin Chinese. Cantonese has different pronunciation, vocabulary, and grammar patterns from Mandarin. Common Cantonese words include: 你 (nei5), 我 (ngo5), 佢 (keoi5), 係 (hai6), 唔 (m4), 嘅 (ge3), 咗 (zo2), 緊 (gan2), 過 (gwo3).')
    }
    
    console.log('FormData created successfully with language:', language, 'fileName:', fileName)
    return formData
  } catch (error) {
    console.error('Error creating FormData:', error)
    throw new Error('Failed to create audio form data')
  }
}

// Map a MIME type to the file extension Whisper expects for that container.
function extensionForAudioType(audioType: string): string {
  const mime = audioType.split(';')[0].trim().toLowerCase()
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'video/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'm4a',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/oga': 'oga',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
  }
  return map[mime] ?? 'webm'
}

// Helper function to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  try {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })
    
    console.log('Blob created successfully. Size:', blob.size, 'bytes, Type:', blob.type)
    return blob
  } catch (error) {
    console.error('Error converting base64 to blob:', error)
    throw new Error('Failed to convert audio data to blob')
  }
}
