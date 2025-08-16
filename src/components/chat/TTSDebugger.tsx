// src/components/chat/TTSDebugger.tsx
// TTS Debugger component for testing and diagnosing TTS issues

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { ttsService, speakCantonese, stopSpeech, isTTSSupported } from '@/utils/textToSpeech'

const TTSDebugger: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<Array<{name: string, lang: string}>>([])
  const [cantoneseVoices, setCantoneseVoices] = useState<Array<{name: string, lang: string}>>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [testText, setTestText] = useState('你好')
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  useEffect(() => {
    const checkSupport = async () => {
      const supported = isTTSSupported()
      setIsSupported(supported)
      
      if (supported) {
        try {
          await ttsService.waitForVoices(3000)
          const allVoices = ttsService.getAvailableVoices()
          const cantonese = ttsService.getCantoneseVoices().map(v => ({ name: v.name, lang: v.lang }))
          
          setVoices(allVoices)
          setCantoneseVoices(cantonese)
          
          addDebugInfo(`TTS Supported: ${supported}`)
          addDebugInfo(`Total voices: ${allVoices.length}`)
          addDebugInfo(`Cantonese voices: ${cantonese.length}`)
        } catch (error) {
          addDebugInfo(`Error loading voices: ${error}`)
        }
      } else {
        addDebugInfo('TTS not supported in this browser')
      }
    }

    checkSupport()
  }, [])

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  const handleTest = async () => {
    if (!testText.trim()) return
    
    setIsSpeaking(true)
    addDebugInfo(`Testing TTS with: "${testText}"`)
    
    try {
      await speakCantonese(testText, { rate: 0.8 })
      addDebugInfo('TTS test successful')
    } catch (error) {
      addDebugInfo(`TTS test failed: ${error}`)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleStop = () => {
    stopSpeech()
    setIsSpeaking(false)
    addDebugInfo('TTS stopped')
  }

  const handleTestVoices = async () => {
    const testWords = ['你好', '多謝', '再見', '早晨']
    
    for (const word of testWords) {
      addDebugInfo(`Testing voice with: ${word}`)
      try {
        await speakCantonese(word, { rate: 0.8 })
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        addDebugInfo(`Failed to speak ${word}: ${error}`)
      }
    }
  }

  const clearDebug = () => {
    setDebugInfo([])
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">TTS Not Supported</h3>
        <p className="text-red-600">
          Your browser doesn't support the Web Speech API. Try using Chrome, Edge, or Safari.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">TTS Debugger</h3>
      
      {/* Voice Information */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Voice Information</h4>
        <p className="text-sm text-gray-600">Total voices: {voices.length}</p>
        <p className="text-sm text-gray-600">Cantonese voices: {cantoneseVoices.length}</p>
        
        {cantoneseVoices.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Cantonese Voices:</p>
            <ul className="text-xs text-gray-600 ml-2">
              {cantoneseVoices.map((voice, index) => (
                <li key={index}>{voice.name} ({voice.lang})</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Test Controls</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to test"
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
          />
          <Button
            onClick={handleTest}
            disabled={isSpeaking}
            className="px-3 py-1 text-sm"
          >
            {isSpeaking ? 'Speaking...' : 'Test'}
          </Button>
          <Button
            onClick={handleStop}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600"
          >
            Stop
          </Button>
        </div>
        
        <Button
          onClick={handleTestVoices}
          className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white"
        >
          Test Common Words
        </Button>
      </div>

      {/* Debug Log */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Debug Log</h4>
          <Button
            onClick={clearDebug}
            className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white"
          >
            Clear
          </Button>
        </div>
        <div className="bg-white border border-gray-300 rounded p-2 h-32 overflow-y-auto text-xs">
          {debugInfo.length === 0 ? (
            <p className="text-gray-500">No debug info yet...</p>
          ) : (
            debugInfo.map((info, index) => (
              <div key={index} className="mb-1">
                {info}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Browser Info */}
      <div className="text-xs text-gray-500">
        <p>Browser: {navigator.userAgent}</p>
        <p>User Interaction Required: {typeof window !== 'undefined' && 'speechSynthesis' in window ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}

export default TTSDebugger
