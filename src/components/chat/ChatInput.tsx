// src/components/chat/ChatInput.tsx
// Chat input component with send button
// This teaches: Form handling, React events, controlled components

import React, { useState, KeyboardEvent, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { startOpenAIRecording, stopOpenAIRecording, isOpenAISTTSupported } from '@/utils/openaiSpeechToText'
import { toast } from 'sonner'

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
    <div className="bg-card rounded-t-xl shadow-[0_-2px_8px_rgba(0,0,0,0.06)] border-t border-secondary px-5 pt-3 pb-3 h-[80px] flex justify-end items-end">
      <div className="flex items-center justify-center gap-3 h-full w-full">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder=""
            disabled={disabled}
            rows={1}
            className="w-full h-full resize-none border-0 outline-none focus:ring-0 text-[14px] text-muted-foreground bg-transparent"
          />
          {interimTranscript && (
            <div className="mt-2 p-2 bg-accent border border-border rounded-md">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-accent-foreground font-medium">Listening... (OpenAI Whisper)</div>
                <div className="text-sm text-accent-foreground font-mono">{timeLeft}s</div>
              </div>
              <div className="text-sm text-foreground italic">{interimTranscript}</div>
            </div>
          )}

        <div className="relative h-8 w-[76px] shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSpeechStart}
            disabled={disabled || !openaiSTTSupported}
            title={isListening ? `Stop listening (${timeLeft}s left)` : `Start voice input`}
            className={`absolute left-0 top-0 rounded-full ${openaiSTTSupported ? 'bg-accent text-foreground hover:bg-accent/80' : 'bg-muted opacity-60'}`}
          >
            <span className="text-[16px]">{isListening ? '⏺️' : '🎤'}</span>
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className="absolute left-[43px] top-0 rounded-full bg-muted-foreground text-background hover:bg-muted-foreground/90"
            title="Send"
          >
            <span>➤</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput