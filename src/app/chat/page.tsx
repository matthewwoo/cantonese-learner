// src/app/chat/page.tsx
// Main chat page - this is where users will have conversations with the AI tutor
// This page demonstrates: React hooks, state management, API calls, and real-time UI updates

"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatInput from '@/components/chat/ChatInput'
import { isTTSSupported, speakCantonese } from '@/utils/textToSpeech'

// Define types for our chat data structures
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  translation?: string // For showing English translations
}

interface ChatSession {
  id: string
  theme: string
  targetWords: string[]
  createdAt: Date
}

export default function ChatPage() {
  // ============ REACT HOOKS FOR STATE MANAGEMENT ============
  
  // Authentication and routing
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Chat session state
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState('daily_conversation')
  const [showTranslations] = useState(false)
  const [autoTTS, setAutoTTS] = useState(true) // Auto-play TTS for AI responses
  const [error, setError] = useState<string | null>(null)
  const ttsSupported = isTTSSupported()
  
  // Reference to the messages container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ============ AUTHENTICATION CHECK ============
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // ============ AUTO-SCROLL TO LATEST MESSAGE ============
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ============ FUNCTION: SEND MESSAGE TO AI ============
  const sendMessage = async (messageContent: string) => {
    // Don't send empty messages
    if (!messageContent.trim()) return

    // Clear any previous errors
    setError(null)
    setIsLoading(true)

    // Add user message to UI immediately (optimistic update)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Make API call to our chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId: currentSession?.id,
          theme: selectedTheme,
          targetWords: currentSession?.targetWords || []
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Update session info if we got a new session ID
      if (!currentSession && data.sessionId) {
        setCurrentSession({
          id: data.sessionId,
          theme: data.theme,
          targetWords: data.targetWords,
          createdAt: new Date()
        })
      }

      // Add AI response to messages
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        translation: data.translation || undefined,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Auto-play TTS for AI response if enabled
      if (autoTTS && ttsSupported && data.message) {
        // Small delay to ensure message is displayed first
        setTimeout(async () => {
          try {
            // Extract Chinese text from the response for TTS
            const chineseText = extractChineseText(data.message)
            if (chineseText && chineseText.trim()) {
              console.log('Auto-playing TTS for AI response:', chineseText)
              await speakCantonese(chineseText, { rate: 0.8 })
            }
          } catch (error) {
            console.warn('Auto-TTS failed:', error)
          }
        }, 500) // 500ms delay
      }

    } catch (error) {
      console.error('Chat error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // ============ HELPER FUNCTION: EXTRACT CHINESE TEXT ============
  const extractChineseText = (text: string): string => {
    // Extract Chinese characters (including Cantonese characters)
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]+/g
    const chineseMatches = text.match(chineseRegex)
    
    if (chineseMatches && chineseMatches.length > 0) {
      // Join all Chinese text segments
      return chineseMatches.join(' ')
    }
    
    // If no Chinese text found, return empty string (don't play English TTS)
    return ''
  }

  // ============ FUNCTION: START NEW CHAT SESSION ============
  const startNewChat = () => {
    setCurrentSession(null)
    setMessages([])
    setError(null)
  }

  // ============ LOADING STATE ============
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f2ec]">
        <p className="text-lg text-[#6e6c66]">Loading chat...</p>
      </div>
    )
  }

  // ============ AUTHENTICATION REQUIRED ============
  if (!session) {
    return null // Redirect is happening
  }

  // ============ MAIN CHAT UI ============
  return (
    <div className="min-h-screen bg-[#f9f2ec]">
      {/* Top header with blur and subtle border */}
      <div className="fixed top-0 left-0 right-0 h-[72px] bg-[rgba(255,252,249,0.6)] backdrop-blur-[10px] border-b border-[#f2e2c4] flex items-center justify-center z-30">
        <div className="text-2xl">🥟</div>
      </div>

      {/* Messages area */}
      <div className="mx-auto w-full max-w-[480px] px-4 pt-[88px] pb-[220px]">
        {/* Welcome message */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-10 text-[#6e6c66]">
            <div className="text-4xl mb-3">👋</div>
            <p>開始傾計啦！Send a message to start chatting.</p>
          </div>
        )}

        {/* Message List */}
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              showTranslation={showTranslations}
            />
          ))}
          {isLoading && (
            <div className="text-[#6e6c66]">AI is thinking…</div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat input - floating above bottom nav */}
      <div className="fixed left-1/2 bottom-[88px] -translate-x-1/2 w-full max-w-[480px] px-3 z-30">
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isLoading}
          placeholder=""
        />
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-5 py-2 backdrop-blur-[10px] bg-[rgba(249,242,236,0.6)] z-30">
        <div className="flex items-center justify-center gap-2">
          <Link href="/" className="w-[70px] h-[61px] rounded-[8px] flex flex-col items-center justify-center text-[#6e6c66]">
            <div className="text-xl">🏠</div>
            <div className="text-[14px] leading-[21px]">Home</div>
          </Link>
          <Link href="/flashcards" className="w-[70px] h-[61px] rounded-[8px] flex flex-col items-center justify-center text-[#6e6c66]">
            <div className="text-xl">🗂️</div>
            <div className="text-[14px] leading-[21px]">Cards</div>
          </Link>
          <Link href="/chat" className="w-[70px] h-[61px] rounded-[8px] bg-white flex flex-col items-center justify-center text-[#6e6c66]">
            <div className="text-xl">💬</div>
            <div className="text-[14px] leading-[21px]">Chat</div>
          </Link>
          <Link href="/articles" className="w-[70px] h-[61px] rounded-[8px] flex flex-col items-center justify-center text-[#6e6c66]">
            <div className="text-xl">📖</div>
            <div className="text-[14px] leading-[21px]">Read</div>
          </Link>
        </div>
      </div>
    </div>
  )
}