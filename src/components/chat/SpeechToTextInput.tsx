// src/components/chat/SpeechToTextInput.tsx
// Speech-to-text input component with OpenAI Whisper integration

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  startListening, 
  stopListening, 
  isSTTSupported as isWebSTTSupported 
} from '@/utils/speechToText'
import { 
  startOpenAIRecording, 
  stopOpenAIRecording, 
  isOpenAISTTSupported 
} from '@/utils/openaiSpeechToText'

interface SpeechToTextInputProps {
  onTranscript: (transcript: string, translation?: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

interface STTResult {
  transcript: string
  confidence: number
  isFinal: boolean
  translation?: string
}

export default function SpeechToTextInput({ 
  onTranscript, 
  onError, 
  disabled = false 
}: SpeechToTextInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [useOpenAI, setUseOpenAI] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  
  const webSTTSupported = isWebSTTSupported()
  const openaiSTTSupported = isOpenAISTTSupported()

  // Handle speech recognition results
  const handleSTTResult = (result: STTResult) => {
    console.log('STT Result:', result)
    
    if (result.isFinal) {
      setCurrentTranscript('')
      setIsProcessing(false)
      
      // Call the parent callback with transcript and translation
      onTranscript(result.transcript, result.translation)
    } else {
      // Show interim results
      setCurrentTranscript(result.transcript)
    }
  }

  // Handle speech recognition errors
  const handleSTTError = (error: string) => {
    console.error('STT Error:', error)
    setIsRecording(false)
    setIsProcessing(false)
    setCurrentTranscript('')
    onError(error)
  }

  // Handle speech recognition end
  const handleSTTEnd = () => {
    console.log('STT ended')
    setIsRecording(false)
    setIsProcessing(false)
  }

  // Start recording with selected method
  const startRecording = () => {
    if (disabled) return

    setIsRecording(true)
    setIsProcessing(true)
    setCurrentTranscript('')

    if (useOpenAI) {
      // Use OpenAI Whisper with translation
      startOpenAIRecording(
        handleSTTResult,
        handleSTTError,
        handleSTTEnd,
        {
          lang: 'zh', // Chinese
          translateTo: 'en', // Translate to English
          timeout: 15000 // 15 seconds
        }
      )
    } else {
      // Use Web Speech API
      startListening(
        handleSTTResult,
        handleSTTError,
        handleSTTEnd,
        {
          lang: 'zh-HK',
          interimResults: true,
          timeout: 15000
        }
      )
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (useOpenAI) {
      stopOpenAIRecording()
    } else {
      stopListening()
    }
    setIsRecording(false)
    setIsProcessing(false)
    setCurrentTranscript('')
  }

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Get status text
  const getStatusText = () => {
    if (isProcessing && !isRecording) {
      return 'Processing...'
    }
    if (isRecording) {
      return useOpenAI ? 'Recording (OpenAI)...' : 'Recording (Web)...'
    }
    return 'Ready to record'
  }

  // Get button text
  const getButtonText = () => {
    if (isProcessing && !isRecording) {
      return 'Processing...'
    }
    if (isRecording) {
      return 'Stop Recording'
    }
    return 'Start Recording'
  }

  // Check if any STT method is supported
  const isAnySTTSupported = webSTTSupported || openaiSTTSupported

  if (!isAnySTTSupported) {
    return (
      <Card className="p-4">
        <p className="text-red-500 text-sm">
          Speech recognition is not supported in this browser.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Options Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showOptions ? 'Hide Options' : 'Show Options'}
        </button>
      </div>

      {/* Options Panel */}
      {showOptions && (
        <div className="space-y-2 p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={!useOpenAI}
                onChange={() => setUseOpenAI(false)}
                disabled={!webSTTSupported}
                className="text-blue-600"
              />
              <span className="text-sm">
                Web Speech API {!webSTTSupported && '(Not supported)'}
              </span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={useOpenAI}
                onChange={() => setUseOpenAI(true)}
                disabled={!openaiSTTSupported}
                className="text-blue-600"
              />
              <span className="text-sm">
                OpenAI Whisper {!openaiSTTSupported && '(Not supported)'}
              </span>
            </label>
          </div>
          
          <div className="text-xs text-gray-600">
            {useOpenAI ? (
              <p>OpenAI Whisper provides better accuracy and real-time translation to English.</p>
            ) : (
              <p>Web Speech API works offline but may have limited Cantonese support.</p>
            )}
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          className={`flex-1 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span>{getButtonText()}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>{getButtonText()}</span>
              </>
            )}
          </div>
        </Button>
      </div>

      {/* Status and Interim Results */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">{getStatusText()}</p>
        
        {currentTranscript && (
          <div className="p-3 bg-blue-50 rounded border">
            <p className="text-sm font-medium text-blue-800">Interim result:</p>
            <p className="text-sm text-blue-700">{currentTranscript}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500">
        <p>• Speak clearly in Cantonese (廣東話)</p>
        <p>• {useOpenAI ? 'Audio optimized for Cantonese recognition with English translation' : 'Audio is processed locally by your browser'}</p>
        <p>• Recording will automatically stop after 15 seconds</p>
      </div>
    </Card>
  )
}
