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

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
      this.loadVoices()
      
      // Listen for voice changes
      this.synthesis.onvoiceschanged = () => {
        this.loadVoices()
      }
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return
    
    this.voices = this.synthesis.getVoices()
    this.isLoaded = true
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
  async waitForVoices(timeout = 3000): Promise<void> {
    if (this.areVoicesLoaded()) return

    return new Promise((resolve, reject) => {
      const checkVoices = () => {
        this.loadVoices()
        if (this.areVoicesLoaded()) {
          resolve()
        }
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for voices to load'))
      }, timeout)

      if (this.synthesis) {
        this.synthesis.onvoiceschanged = () => {
          clearTimeout(timeoutId)
          checkVoices()
        }
      }

      // Check immediately in case voices are already loaded
      checkVoices()
    })
  }

  // Speak Chinese text with Cantonese pronunciation
  async speakCantonese(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported')
    }

    // Wait for voices to load
    try {
      await this.waitForVoices()
    } catch {
      console.warn('Voice loading timeout, proceeding with available voices')
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis!.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Try to get the best Cantonese voice
      const cantoneseVoices = this.getCantoneseVoices()
      const chineseVoices = this.getChineseVoices()
      
      if (cantoneseVoices.length > 0) {
        utterance.voice = cantoneseVoices[0]
      } else if (chineseVoices.length > 0) {
        utterance.voice = chineseVoices[0]
      }
      
      // Set language
      utterance.lang = options.lang || 'zh-HK' // Hong Kong Chinese (Cantonese)
      
      // Set speech parameters
      utterance.rate = options.rate || 0.8 // Slower for learning
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0

      // Set up event handlers
      utterance.onend = () => resolve()
      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      // Speak the text
      this.synthesis!.speak(utterance)
    })
  }

  // Stop current speech
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
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