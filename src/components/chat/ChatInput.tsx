// src/components/chat/ChatInput.tsx
// Chat input component with send button
// This teaches: Form handling, React events, controlled components

import React, { useState, KeyboardEvent, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { startOpenAIRecording, stopOpenAIRecording, isOpenAISTTSupported } from '@/utils/openaiSpeechToText'
import { toast } from 'react-hot-toast'

// Props interface - defines what properties this component accepts
interface ChatInputProps {
  onSendMessage: (message: string) => void  // Function to call when user sends message
  disabled: boolean                         // Whether input should be disabled
  placeholder: string                       // Placeholder text for input
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, placeholder }) => {
  // State to store the current input value
  // useState is a React Hook that lets us add state to functional components
  const [inputValue, setInputValue] = useState('')
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [timeLeft, setTimeLeft] = useState(15)
  const openaiSTTSupported = isOpenAISTTSupported()

  // Function to handle sending a message
  const handleSend = () => {
    // Only send if there's actual content (not just whitespace)
    if (inputValue.trim()) {
      // Call the parent component's function to send the message
      onSendMessage(inputValue.trim())
      // Clear the input field
      setInputValue('')
    }
  }

  // Function to handle Enter key press
  const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if Enter was pressed (but not Shift+Enter, which should create new line)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault() // Prevent default Enter behavior (new line)
      handleSend()
    }
  }

  // Handle speech-to-text
  const handleSpeechStart = () => {
    if (isListening) {
      stopOpenAIRecording()
      setIsListening(false)
      setInterimTranscript('')
      setTimeLeft(15)
      return
    }

    setIsListening(true)
    setInterimTranscript('')
    setTimeLeft(15)

    // Use OpenAI Whisper with translation
    startOpenAIRecording(
      (result) => {
        if (result.isFinal) {
          // Final result - add to input
          setInputValue(prev => prev + (prev ? ' ' : '') + result.transcript)
          setInterimTranscript('')
          
          // Show translation if available
          if (result.translation) {
            toast.success(`Translation: ${result.translation}`)
          }
        } else {
          // Interim result - show preview
          setInterimTranscript(result.transcript)
        }
      },
      (error) => {
        toast.error(error)
        setIsListening(false)
        setInterimTranscript('')
        setTimeLeft(15)
      },
      () => {
        // Speech ended
        setIsListening(false)
        setInterimTranscript('')
        setTimeLeft(15)
      },
      {
        lang: 'zh', // Chinese - Enhanced with Cantonese-specific prompts and parameters
        translateTo: 'en', // Translate to English
        timeout: 15000 // 15 seconds timeout
      }
    )
  }

  // Countdown timer effect
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null
    
    if (isListening && timeLeft > 0) {
      countdownInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up, stop listening
            stopOpenAIRecording()
            setIsListening(false)
            setInterimTranscript('')
            return 15
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [isListening, timeLeft])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopOpenAIRecording()
      }
    }
  }, [isListening])

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex space-x-4">
        {/* Text input area */}
        <div className="flex-1">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className="w-full resize-none border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          
          {/* Interim transcript display */}
          {interimTranscript && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-blue-600 font-medium">
                  Listening... (OpenAI Whisper)
                </div>
                <div className="text-sm text-blue-600 font-mono">
                  {timeLeft}s
                </div>
              </div>
              <div className="text-sm text-blue-800 italic">{interimTranscript}</div>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col space-y-2">
          {/* Speech-to-text button */}
          {openaiSTTSupported ? (
            <Button
              onClick={handleSpeechStart}
              disabled={disabled}
              variant="outline"
              className={`flex items-center justify-center px-4 py-2 transition-all duration-200 ${
                isListening 
                  ? 'bg-red-100 border-red-300 text-red-600 hover:bg-red-200' 
                  : 'hover:bg-gray-50'
              }`}
              title={isListening ? `Stop listening (${timeLeft}s left)` : `Start voice input (OpenAI Whisper)`}
            >
              <span className="text-lg">
                {isListening ? '🔴' : '🎤'}
              </span>
              {isListening && (
                <span className="ml-1 text-xs font-mono">
                  {timeLeft}s
                </span>
              )}
            </Button>
          ) : (
            <Button
              disabled={true}
              variant="outline"
              className="flex items-center justify-center px-4 py-2 opacity-50 cursor-not-allowed"
              title="Speech recognition not supported in this browser"
            >
              <span className="text-lg">🎤</span>
            </Button>
          )}
          
          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 px-6"
          >
            {disabled ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              '發送 Send'
            )}
          </Button>
        </div>
      </div>
      
      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line
        {openaiSTTSupported && (
          <span className="ml-2">
            • Click 🎤 to speak in Cantonese (OpenAI Whisper with translation)
          </span>
        )}
      </div>
    </div>
  )
}

export default ChatInput