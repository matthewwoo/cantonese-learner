// src/components/chat/ChatMessage.tsx
// Individual chat message component
// This teaches: React component props, conditional rendering, CSS styling

import React, { useState, useEffect } from 'react'
import { IconButton } from '@/components/ui'
import { speakCantonese, stopSpeech, isTTSSupported } from '@/utils/textToSpeech'
import { toast } from 'react-hot-toast'

// Define the props (properties) this component expects
interface ChatMessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    translation?: string
  }
  showTranslation: boolean
}

// React functional component - the modern way to create components
const ChatMessage: React.FC<ChatMessageProps> = ({ message, showTranslation }) => {
  // Destructure the message properties for easier access
  const { role, content, translation } = message
  
  // Determine if this is a user message or AI message
  const isUser = role === 'user'
  
  // State for text-to-speech
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showingTranslation, setShowingTranslation] = useState<boolean>(!!showTranslation)
  const [translationText, setTranslationText] = useState<string | undefined>(translation)
  const [isTranslating, setIsTranslating] = useState<boolean>(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const ttsSupported = isTTSSupported()
  
  // Extract only Chinese text for clearer Cantonese TTS (fallback to full text)
  const extractChineseText = (text: string): string => {
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]+/g
    const chineseMatches = text.match(chineseRegex)
    return chineseMatches && chineseMatches.length > 0 ? chineseMatches.join(' ') : text
  }
  
  // Cleanup speech when component unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeech()
      }
    }
  }, [isSpeaking])
  
  // Handle text-to-speech
  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeech()
      setIsSpeaking(false)
    } else {
      // Stop any other speech first
      stopSpeech()
      setIsSpeaking(true)
      try {
        const text = extractChineseText(content)
        await speakCantonese(text, { rate: 0.75 })
      } catch (error) {
        console.error('TTS error:', error)
        toast.error('Unable to play audio. Please check your browser settings.')
      } finally {
        setIsSpeaking(false)
      }
    }
  }

  // Sync with external toggle if provided
  useEffect(() => {
    setShowingTranslation(!!showTranslation)
  }, [showTranslation])

  useEffect(() => {
    setTranslationText(translation)
  }, [translation])

  // Touch handlers for swipe gestures
  const SWIPE_THRESHOLD = 40 // px

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const x = e.touches[0]?.clientX ?? 0
    setTouchStartX(x)
    setTouchDeltaX(0)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return
    const x = e.touches[0]?.clientX ?? 0
    setTouchDeltaX(x - touchStartX)
  }

  const handleTouchEnd = () => {
    if (touchStartX === null) return
    if (touchDeltaX <= -SWIPE_THRESHOLD) {
      // Swipe left → show English
      setShowingTranslation(true)
      if (!translationText && !isTranslating) {
        void requestTranslation()
      }
    } else if (touchDeltaX >= SWIPE_THRESHOLD) {
      // Swipe right → show Chinese
      setShowingTranslation(false)
    }
    setTouchStartX(null)
    setTouchDeltaX(0)
  }

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    setTouchStartX(e.clientX)
    setTouchDeltaX(0)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || touchStartX === null) return
    setTouchDeltaX(e.clientX - touchStartX)
  }

  const endMouseDrag = () => {
    if (!isDragging) return
    if (touchStartX !== null) {
      if (touchDeltaX <= -SWIPE_THRESHOLD) {
        setShowingTranslation(true)
        if (!translationText && !isTranslating) {
          void requestTranslation()
        }
      } else if (touchDeltaX >= SWIPE_THRESHOLD) {
        setShowingTranslation(false)
      }
    }
    setIsDragging(false)
    setTouchStartX(null)
    setTouchDeltaX(0)
  }

  // Lazy translation fetcher
  const requestTranslation = async () => {
    try {
      setIsTranslating(true)
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetLanguage: 'en' })
      })
      const data = await res.json()
      if (!res.ok || !data?.translatedText) {
        throw new Error(data?.error || 'Translation failed')
      }
      setTranslationText(data.translatedText as string)
    } catch (err) {
      console.error('Translate error:', err)
      toast.error('Unable to fetch translation')
      setShowingTranslation(false)
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-[12px] ${isUser ? 'bg-white border border-[#efefef]' : 'bg-[#dff5e8]'} shadow-sm`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endMouseDrag}
        onMouseLeave={endMouseDrag}
        style={{ transform: touchDeltaX !== 0 ? `translateX(${Math.max(Math.min(touchDeltaX, 16), -16)}px)` : undefined }}
      >
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            {ttsSupported && (
              <IconButton
                aria-label={isSpeaking ? 'Stop pronunciation' : 'Play pronunciation'}
                size="32px"
                className={`rounded-full ${isUser ? 'bg-[#f6f6f6]' : 'bg-white/70'} text-[#6e6c66]`}
                onClick={handleSpeak}
                title={isSpeaking ? 'Stop pronunciation' : 'Listen'}
              >
                <span className="text-[14px]">{isSpeaking ? '⏸' : '▶'}</span>
              </IconButton>
            )}
            <div className={`text-[14px] leading-[21px] ${isUser ? 'text-[#1e1e1e]' : 'text-[#1e1e1e]'}`}>
              {showingTranslation ? (translationText ?? (isTranslating ? 'Translating…' : content)) : content}
            </div>
          </div>
          
        </div>
      </div>
      {/* Decorative dots under bubbles */}
      <div className="basis-full" />
    </div>
  )
}

export default ChatMessage