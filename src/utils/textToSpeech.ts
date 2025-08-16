// src/utils/textToSpeech.ts
// Text-to-speech utility for Cantonese pronunciation

interface TTSOptions {
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
}

class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []
  private isLoaded = false
  private isInitialized = false

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
      this.initialize()
    }
  }

  private initialize(): void {
    if (!this.synthesis || this.isInitialized) return
    
    // Initialize voices
    this.loadVoices()
    
    // Listen for voice changes
    this.synthesis.onvoiceschanged = () => {
      console.log('TTS: Voices changed, reloading...')
      this.loadVoices()
    }

    // Handle browser autoplay restrictions
    ;(this.synthesis as any).onstart = () => {
      console.log('TTS: Speech started')
    }

    ;(this.synthesis as any).onend = () => {
      console.log('TTS: Speech ended')
    }

    ;(this.synthesis as any).onerror = (event: any) => {
      console.error('TTS: Speech error:', event.error)
    }

    this.isInitialized = true
    console.log('TTS: Service initialized')
  }

  private loadVoices(): void {
    if (!this.synthesis) return
    
    try {
      this.voices = this.synthesis.getVoices()
      this.isLoaded = true
      console.log(`TTS: Loaded ${this.voices.length} voices`)
    } catch (error) {
      console.error('TTS: Error loading voices:', error)
    }
  }

  // Get available Cantonese voices
  getCantoneseVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => 
      voice.lang.includes('zh-HK') || 
      voice.lang.includes('zh-yue') ||
      voice.lang.includes('yue') ||
      (voice.lang.includes('zh') && voice.name.toLowerCase().includes('cantonese')) ||
      (voice.lang.includes('zh') && voice.name.toLowerCase().includes('hong kong'))
    )
  }

  // Get best available Chinese voice (fallback)
  getChineseVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => 
      voice.lang.includes('zh') || 
      voice.lang.includes('chinese')
    )
  }

  // Check if TTS is supported
  isSupported(): boolean {
    return this.synthesis !== null
  }

  // Check if voices are loaded
  areVoicesLoaded(): boolean {
    return this.isLoaded && this.voices.length > 0
  }

  // Wait for voices to load
  async waitForVoices(timeout = 5000): Promise<void> {
    if (this.areVoicesLoaded()) return

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkVoices = () => {
        this.loadVoices()
        if (this.areVoicesLoaded()) {
          console.log('TTS: Voices loaded successfully')
          resolve()
          return
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn('TTS: Voice loading timeout')
          reject(new Error('Timeout waiting for voices to load'))
          return
        }
        
        // Check again in 100ms
        setTimeout(checkVoices, 100)
      }

      // Start checking
      checkVoices()
    })
  }

  // Speak Chinese text with Cantonese pronunciation
  async speakCantonese(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported')
    }

    if (!text || text.trim() === '') {
      throw new Error('No text provided for speech synthesis')
    }

    console.log('TTS: Attempting to speak:', text)

    // Wait for voices to load
    try {
      await this.waitForVoices()
    } catch (error) {
      console.warn('TTS: Voice loading timeout, proceeding with available voices')
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis!.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Try to get the best Cantonese voice
      const cantoneseVoices = this.getCantoneseVoices()
      const chineseVoices = this.getChineseVoices()
      
      console.log('TTS: Available voices:', {
        cantonese: cantoneseVoices.length,
        chinese: chineseVoices.length,
        total: this.voices.length
      })
      
      if (cantoneseVoices.length > 0) {
        utterance.voice = cantoneseVoices[0]
        console.log('TTS: Using Cantonese voice:', cantoneseVoices[0].name)
      } else if (chineseVoices.length > 0) {
        utterance.voice = chineseVoices[0]
        console.log('TTS: Using Chinese voice:', chineseVoices[0].name)
      } else {
        console.warn('TTS: No Chinese voices found, using default')
      }
      
      // Set language
      utterance.lang = options.lang || 'zh-HK' // Hong Kong Chinese (Cantonese)
      
      // Set speech parameters
      utterance.rate = options.rate || 0.8 // Slower for learning
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0

      // Set up event handlers
      utterance.onstart = () => {
        console.log('TTS: Speech started for:', text)
      }

      utterance.onend = () => {
        console.log('TTS: Speech completed for:', text)
        resolve()
      }

      utterance.onerror = (event) => {
        console.error('TTS: Speech error:', event.error, 'for text:', text)
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      // Handle browser autoplay restrictions
      utterance.onpause = () => {
        console.log('TTS: Speech paused')
      }

      utterance.onresume = () => {
        console.log('TTS: Speech resumed')
      }

      // Speak the text
      try {
        this.synthesis!.speak(utterance)
        console.log('TTS: Speech queued successfully')
      } catch (error) {
        console.error('TTS: Error queuing speech:', error)
        reject(error)
      }
    })
  }

  // Stop current speech
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
      console.log('TTS: Speech stopped')
    }
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false
  }

  // Get list of available voice options for debugging
  getAvailableVoices(): Array<{name: string, lang: string}> {
    return this.voices.map(voice => ({
      name: voice.name,
      lang: voice.lang
    }))
  }

  // Test TTS functionality
  async test(): Promise<void> {
    console.log('TTS: Running test...')
    
    if (!this.isSupported()) {
      throw new Error('TTS not supported')
    }

    try {
      await this.speakCantonese('你好', { rate: 0.8 })
      console.log('TTS: Test successful')
    } catch (error) {
      console.error('TTS: Test failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const ttsService = new TextToSpeechService()

// Utility functions
export const speakCantonese = async (text: string, options?: TTSOptions) => {
  try {
    await ttsService.speakCantonese(text, options)
  } catch (error) {
    console.error('Text-to-speech error:', error)
    throw error
  }
}

export const stopSpeech = () => {
  ttsService.stop()
}

export const isTTSSupported = () => {
  return ttsService.isSupported()
}

export const testTTS = () => {
  return ttsService.test()
}