// src/app/chat/page.tsx
// Main chat page - this is where users will have conversations with the AI tutor
// This page demonstrates: React hooks, state management, API calls, and real-time UI updates

"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatInput from '@/components/chat/ChatInput'
import ThemeSelector from '@/components/chat/ThemeSelector'
import TTSDebugger from '@/components/chat/TTSDebugger'
import { stopSpeech, isTTSSupported, speakCantonese } from '@/utils/textToSpeech'
import { isOpenAISTTSupported } from '@/utils/openaiSpeechToText'

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
  const [showTranslations, setShowTranslations] = useState(false)
  const [autoTTS, setAutoTTS] = useState(true) // Auto-play TTS for AI responses
  const [showTTSDebugger, setShowTTSDebugger] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ttsSupported = isTTSSupported()
  const openaiSTTSupported = isOpenAISTTSupported()
  
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading chat...</p>
      </div>
    )
  }

  // ============ AUTHENTICATION REQUIRED ============
  if (!session) {
    return null // Redirect is happening
  }

  // ============ MAIN CHAT UI ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 AI對話 Cantonese Chat
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Practice Cantonese with your AI tutor
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="Secondary"
                text={`${showTranslations ? '隱藏翻譯 Hide' : '顯示翻譯 Show'} Translations`}
                onClick={() => setShowTranslations(!showTranslations)}
                className="flex items-center gap-2"
              >
                <span className="text-sm">
                  {showTranslations ? '🔇' : '🔊'}
                </span>
              </Button>
              {ttsSupported && (
                <Button
                  variant="Secondary"
                  text={autoTTS ? 'Auto TTS On' : 'Auto TTS Off'}
                  onClick={() => setAutoTTS(!autoTTS)}
                  className={`flex items-center gap-2 ${autoTTS ? 'bg-green-50 border-green-200' : ''}`}
                >
                  <span className="text-sm">
                    {autoTTS ? '🔊' : '🔇'}
                  </span>
                </Button>
              )}
              {ttsSupported && (
                <Button
                  variant="Secondary"
                  text="Stop Speech"
                  onClick={stopSpeech}
                  className="flex items-center gap-2"
                  title="Stop all speech"
                >
                  <span className="text-sm">🔇</span>
                </Button>
              )}
              <Button
                variant="Secondary"
                text="← Back to Dashboard"
                onClick={() => router.push('/dashboard')}
              />
              <Button
                variant="Secondary"
                text="🆕 New Chat"
                onClick={startNewChat}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Theme Selection (only show if no active session) */}
        {!currentSession && (
          <Card className="mb-6 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              選擇對話主題 Choose Chat Theme
            </h3>
            <ThemeSelector
              selectedTheme={selectedTheme}
              onThemeSelect={setSelectedTheme}
            />
          </Card>
        )}

        {/* Chat Session Info */}
        {currentSession && (
          <Card className="mb-4 p-4 bg-blue-50 border-blue-200">
            <div>
              <span className="font-medium text-blue-900">
                Theme: {currentSession.theme}
              </span>
              {currentSession.targetWords.length > 0 && (
                <div className="text-sm text-blue-700 mt-1">
                  Target words: {currentSession.targetWords.join(', ')}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-4 p-4 bg-red-50 border-red-200">
            <p className="text-red-700">Error: {error}</p>
            <Button
              variant="Secondary"
              text="Dismiss"
              onClick={() => setError(null)}
              className="mt-2"
            />
          </Card>
        )}

        {/* Chat Messages Container */}
        <Card className="mb-4">
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  你好！Hello there!
                </h3>
                <p className="text-gray-600">
                  Ready to practice your Cantonese? Start by sending me a message!
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try saying: "你好，我想學廣東話" (Hello, I want to learn Cantonese)
                </p>
              </div>
            )}

            {/* Message List */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                showTranslation={showTranslations}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse">🤖</div>
                    <span className="text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll target */}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isLoading}
          placeholder="Type your message in Cantonese or English..."
        />

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            💡 Tip: Try mixing Cantonese and English - your AI tutor will help you improve!
          </p>
          {ttsSupported && (
            <p className="text-sm text-gray-500 mt-1">
              🔊 AI responses are automatically spoken aloud. Toggle "Auto TTS" to control this feature
            </p>
          )}
          {openaiSTTSupported && (
            <p className="text-sm text-gray-500 mt-1">
              🎤 Click the microphone button to speak in Cantonese (廣東話) and convert to text (Enhanced with translation)
            </p>
          )}
        </div>

        {/* TTS Debugger */}
        <div className="mt-4">
          <Button
            variant="Secondary"
            text={`${showTTSDebugger ? '🔽 Hide' : '🔼 Show'} TTS Debugger`}
            onClick={() => setShowTTSDebugger(!showTTSDebugger)}
            className="w-full"
          />
          {showTTSDebugger && (
            <div className="mt-2">
              <TTSDebugger />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}