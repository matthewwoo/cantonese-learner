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
    <div className="bg-white rounded-t-[20px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.12)] border-t border-[#f6f6f6] px-5 pt-3 pb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="w-full h-8 text-[14px] leading-[21px] text-[#757575] flex items-center">
            {inputValue.length === 0 ? (
              <span>{placeholder}</span>
            ) : null}
          </div>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder=""
            disabled={disabled}
            rows={1}
            className="w-full resize-none border-0 outline-none focus:ring-0 text-[14px] text-[#6e6c66] bg-transparent"
          />
          {interimTranscript && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-blue-600 font-medium">Listening... (OpenAI Whisper)</div>
                <div className="text-sm text-blue-600 font-mono">{timeLeft}s</div>
              </div>
              <div className="text-sm text-blue-800 italic">{interimTranscript}</div>
            </div>
          )}
        </div>

        <div className="relative h-8 w-[76px] shrink-0">
          <button
            onClick={handleSpeechStart}
            disabled={disabled || !openaiSTTSupported}
            title={isListening ? `Stop listening (${timeLeft}s left)` : `Start voice input`}
            className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${openaiSTTSupported ? 'bg-[#fff1c2]' : 'bg-[#cdcdcd] opacity-60'} ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <span className="text-[16px]">{isListening ? '⏺️' : '🎤'}</span>
          </button>
          <button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className="absolute left-[43px] top-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#5a5a5a] text-white disabled:opacity-50"
            title="Send"
          >
            <span>➤</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput