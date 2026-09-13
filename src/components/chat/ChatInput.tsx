// src/components/chat/ChatInput.tsx
// Chat composer: a VoicePill that expands into a live waveform while
// recording, then transcribes through OpenAI Whisper and sends the transcript
// as the message, plus a camera button for sending a photo the tutor will
// describe and teach from. There is no text field.

"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'

import { VoicePill, type VoicePillState } from '@/components/ui/voice-pill'
import {
  startOpenAIRecording,
  stopOpenAIRecording,
  isOpenAISTTSupported,
} from '@/utils/openaiSpeechToText'

interface ChatInputProps {
  onSendMessage: (message: string) => void  // Called with the transcript
  /** Called with base64 JPEGs (no data: prefix) and matching data URLs for the bubble. */
  onSendPhotos?: (photos: { base64: string; previewUrl: string }[]) => void
  disabled: boolean                         // True while the AI is replying
}

/** Pill auto-stops here; the recorder's own timeout is a longer backstop. */
const MAX_UTTERANCE_SECONDS = 15

/** Longest side after downscaling; keeps the upload well under Vercel's body cap. */
const MAX_PHOTO_SIDE = 1600
const PHOTO_JPEG_QUALITY = 0.6
/** Per-message cap (matches the API). */
const MAX_PHOTOS = 4

/** Downscale a picked image to a JPEG data URL via canvas. */
async function encodePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height, 1))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onSendPhotos, disabled }) => {
  const [state, setState] = useState<VoicePillState>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoPicked = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    // Reset so picking the same photos again fires onChange.
    e.target.value = ''
    if (files.length === 0 || !onSendPhotos) return
    if (files.length > MAX_PHOTOS) {
      toast.error(`Up to ${MAX_PHOTOS} photos per message`)
      return
    }
    try {
      const photos = await Promise.all(files.map(async (file) => {
        const previewUrl = await encodePhoto(file)
        return { base64: previewUrl.split(',')[1] ?? '', previewUrl }
      }))
      onSendPhotos(photos)
    } catch (err) {
      console.error('Photo encode error:', err)
      toast.error("Couldn't read those photos")
    }
  }, [onSendPhotos])

  // MediaRecorder support can only be read in the browser — assume yes for the
  // server render so the pill's label doesn't mismatch during hydration.
  const [sttSupported, setSttSupported] = useState(true)
  useEffect(() => setSttSupported(isOpenAISTTSupported()), [])

  // Read inside callbacks without re-subscribing the recorder to state changes.
  const stateRef = useRef(state)
  stateRef.current = state

  const startListening = useCallback(() => {
    setState('listening')

    startOpenAIRecording(
      (result) => {
        if (!result.isFinal) return

        const transcript = result.transcript.trim()
        if (transcript) {
          onSendMessage(transcript)
          if (result.translation) {
            toast.success(`Translation: ${result.translation}`)
          }
        } else {
          toast.error('聽唔到 — nothing was transcribed')
        }
      },
      (error) => {
        toast.error(error)
        setState('idle')
      },
      () => {
        // Recording finished (manually, by timeout, or after an error).
        setState('idle')
      },
      {
        lang: 'zh',            // Cantonese prompts/params live in the util
        translateTo: 'en',
        timeout: (MAX_UTTERANCE_SECONDS + 5) * 1000,
      }
    )
  }, [onSendMessage])

  // Stop capture and hold `processing` until the transcript comes back.
  const stopListening = useCallback(() => {
    stopOpenAIRecording()
    setState('processing')
  }, [])

  // Release the mic if the composer unmounts mid-utterance.
  useEffect(() => {
    return () => {
      if (stateRef.current === 'listening') {
        stopOpenAIRecording()
      }
    }
  }, [])

  return (
    // No composer bar — the pill floats over the transcript and expands on press.
    <div className="flex items-center justify-center gap-3 px-4 py-2">
      <VoicePill
        state={state}
        disabled={disabled || !sttSupported}
        maxDurationSeconds={MAX_UTTERANCE_SECONDS}
        labels={{
          idle: sttSupported
            ? { zh: '按一下講', en: 'Tap to speak' }
            : { zh: '唔支援錄音', en: 'Recording unsupported' },
          processing: { zh: '轉文字中', en: 'Transcribing' },
        }}
        onStart={startListening}
        onStop={stopListening}
        onError={(error) => {
          toast.error(error.message)
          setState('idle')
        }}
      />
      {onSendPhotos && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoPicked}
          />
          <button
            type="button"
            aria-label="Send photos"
            title="Send photos"
            disabled={disabled || state !== 'idle'}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm disabled:opacity-60"
          >
            <Camera className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  )
}

export default ChatInput
