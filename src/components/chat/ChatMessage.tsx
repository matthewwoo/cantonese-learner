// src/components/chat/ChatMessage.tsx
// Individual chat message component
// This teaches: React component props, conditional rendering, CSS styling

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
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
  const { role, content, timestamp, translation } = message
  
  // Determine if this is a user message or AI message
  const isUser = role === 'user'
  
  // State for text-to-speech
  const [isSpeaking, setIsSpeaking] = useState(false)
  const ttsSupported = isTTSSupported()
  
  // Format timestamp for display
  const timeString = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
  
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
        await speakCantonese(content, { rate: 0.7 }) // Slower rate for learning
      } catch (error) {
        console.error('TTS error:', error)
        toast.error('Unable to play audio. Please check your browser settings.')
      } finally {
        setIsSpeaking(false)
      }
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-white border border-gray-200'
      }`}>
        {/* Message header with role and time */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {isUser ? '你 You' : '🤖 AI Tutor'}
          </span>
          <span className={`text-xs ${
            isUser ? 'text-blue-100' : 'text-gray-400'
          }`}>
            {timeString}
          </span>
        </div>
        
        {/* Main message content with speech button for AI messages */}
        <div className="flex items-start justify-between gap-2">
          <div className={`text-sm flex-1 ${
            isUser ? 'text-white' : 'text-gray-800'
          }`}>
            {content}
          </div>
          
          {/* Speech button for AI messages */}
          {!isUser && ttsSupported && (
            <Button
              onClick={handleSpeak}
              variant="ghost"
              size="sm"
              className={`flex-shrink-0 p-1 h-auto min-w-0 transition-all duration-200 ${
                isSpeaking 
                  ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={isSpeaking ? "Stop pronunciation" : "Listen to Cantonese pronunciation"}
            >
              <span className="text-lg">
                {isSpeaking ? '🔇' : '🔊'}
              </span>
            </Button>
          )}
        </div>
        
        {/* Translation (if available and enabled) - only show for AI messages */}
        {!isUser && showTranslation && translation && (
          <div className={`mt-2 text-xs italic border-t pt-2 ${
            'text-gray-500 border-gray-200'
          }`}>
            Translation: {translation}
          </div>
        )}
        
        {/* Show indicator when translation is available but hidden */}
        {!isUser && !showTranslation && translation && (
          <div className="mt-2 text-xs text-gray-400">
            💡 Translation available - click the 🔊 button to show
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage