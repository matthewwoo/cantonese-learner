// src/components/chat/ChatInput.tsx
// Voice-only chat composer: a VoicePill that expands into a live waveform while
// recording, then transcribes through OpenAI Whisper and sends the transcript
// as the message. There is no text field — speaking is the only way to compose.

"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { VoicePill, type VoicePillState } from '@/components/ui/voice-pill'
import {
  startOpenAIRecording,
  stopOpenAIRecording,
  isOpenAISTTSupported,
} from '@/utils/openaiSpeechToText'

interface ChatInputProps {
  onSendMessage: (message: string) => void  // Called with the transcript
  disabled: boolean                         // True while the AI is replying
}

/** Pill auto-stops here; the recorder's own timeout is a longer backstop. */
const MAX_UTTERANCE_SECONDS = 15

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [state, setState] = useState<VoicePillState>('idle')

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
    <div className="flex justify-center px-4 py-2">
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
    </div>
  )
}

export default ChatInput
