// src/utils/speechToText.ts
// Speech-to-text utility for Cantonese voice input

interface STTOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  timeout?: number // Timeout in milliseconds
}

interface STTResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

class SpeechToTextService {
  private recognition: SpeechRecognition | null = null
  private supported = false

  constructor() {
    if (typeof window !== 'undefined') {
      // Check for different browser implementations
      const SpeechRecognition = window.SpeechRecognition || 
                               (window as any).webkitSpeechRecognition ||
                               (window as any).mozSpeechRecognition ||
                               (window as any).msSpeechRecognition

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.supported = true
        this.setupRecognition()
      }
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return

    // Set default options
    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.maxAlternatives = 3
    this.recognition.lang = 'zh-HK' // Hong Kong Chinese (Cantonese)
    
    // Try to extend the recognition session
    // Some browsers have shorter default timeouts
    if ('webkitSpeechRecognition' in window) {
      // For webkit browsers, we can try to set a longer timeout
      (this.recognition as any).maxAlternatives = 5
    }
  }

  // Check if speech recognition is supported
  isSupported(): boolean {
    return this.supported
  }

  // Get available languages for debugging
  getAvailableLanguages(): string[] {
    return [
      'zh-HK', // Hong Kong Chinese (Cantonese)
      'zh-TW', // Taiwan Chinese (Traditional)
      'zh-CN', // Mainland Chinese (Simplified)
      'yue-HK', // Cantonese (Hong Kong)
      'yue-CN', // Cantonese (China)
    ]
  }

  // Start listening for speech input
  startListening(
    onResult: (result: STTResult) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    options: STTOptions = {}
  ): void {
    if (!this.recognition || !this.supported) {
      onError('Speech recognition not supported in this browser')
      return
    }

    // Configure recognition with options
    this.recognition.lang = options.lang || 'zh-HK'
    this.recognition.continuous = false // Keep as false to avoid accumulation issues
    this.recognition.interimResults = options.interimResults || true
    this.recognition.maxAlternatives = options.maxAlternatives || 3

    // Set up timeout with a longer duration to account for browser delays
    const timeout = options.timeout || 15000 // Default 15 seconds (increased from 10)
    const timeoutId = setTimeout(() => {
      if (this.recognition) {
        console.log('Speech recognition timeout reached, stopping...')
        this.recognition.stop()
      }
    }, timeout)

    // Set up event handlers
    this.recognition.onstart = () => {
      console.log('Speech recognition started')
    }

    this.recognition.onaudiostart = () => {
      console.log('Audio capture started')
    }

    this.recognition.onspeechstart = () => {
      console.log('Speech detected')
    }

    this.recognition.onspeechend = () => {
      console.log('Speech ended')
    }

    this.recognition.onaudioend = () => {
      console.log('Audio capture ended')
    }

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      const transcript = result[0].transcript
      const confidence = result[0].confidence
      const isFinal = result.isFinal

      console.log('Speech recognition result:', { transcript, confidence, isFinal })

      onResult({
        transcript: transcript.trim(),
        confidence,
        isFinal
      })
    }

    this.recognition.onerror = (event) => {
      // Clear timeout on error
      clearTimeout(timeoutId)
      
      console.log('Speech recognition error:', event.error)
      
      let errorMessage = 'Speech recognition error'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'Microphone access denied. Please check permissions.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.'
          break
        case 'network':
          errorMessage = 'Network error. Please check your connection.'
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available.'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }
      
      onError(errorMessage)
    }

    this.recognition.onend = () => {
      // Clear timeout when speech recognition ends
      clearTimeout(timeoutId)
      console.log('Speech recognition ended')
      onEnd()
    }

    // Start listening
    try {
      console.log('Starting speech recognition...')
      this.recognition.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      onError('Failed to start speech recognition')
    }
  }

  // Stop listening
  stopListening(): void {
    if (this.recognition && this.supported) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
    }
  }

  // Abort listening
  abortListening(): void {
    if (this.recognition && this.supported) {
      try {
        this.recognition.abort()
      } catch (error) {
        console.error('Error aborting speech recognition:', error)
      }
    }
  }

  // Check if currently listening
  isListening(): boolean {
    // Note: SpeechRecognition doesn't have a state property in all browsers
    // We'll track this manually with a flag
    return false // This will be managed by the component state
  }
}

// Export singleton instance
export const sttService = new SpeechToTextService()

// Utility functions
export const startListening = (
  onResult: (result: STTResult) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  options?: STTOptions
) => {
  sttService.startListening(onResult, onError, onEnd, options)
}

export const stopListening = () => {
  sttService.stopListening()
}

export const abortListening = () => {
  sttService.abortListening()
}

export const isSTTSupported = () => {
  return sttService.isSupported()
}

export const isListening = () => {
  return sttService.isListening()
}
