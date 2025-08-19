// src/utils/openaiTTS.ts
// OpenAI Text-to-Speech service for Cantonese pronunciation

interface OpenAITTTOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
  format?: 'mp3' | 'opus' | 'aac' | 'flac'
  model?: 'tts-1' | 'tts-1-hd'
}

interface TTSResult {
  audioUrl: string
  duration: number
  text: string
}

class OpenAITTSService {
  private apiKey: string | null = null
  private isSupported: boolean = false

  constructor() {
    // Check if OpenAI API key is available
    this.checkSupport()
  }

  private checkSupport(): void {
    // We'll check for API key when making requests
    this.isSupported = true // Assume supported, will check API key on first use
  }

  /**
   * Check if OpenAI TTS is available
   */
  isAvailable(): boolean {
    return this.isSupported
  }

  /**
   * Speak text using OpenAI TTS with Cantonese pronunciation
   * Note: OpenAI TTS doesn't have specific Cantonese voices, but we can use
   * the best available voice and ensure proper Traditional Chinese text
   */
  async speakCantonese(
    text: string, 
    options: OpenAITTTOptions = {}
  ): Promise<TTSResult> {
    if (!text || text.trim() === '') {
      throw new Error('No text provided for speech synthesis')
    }

    console.log('OpenAI TTS: Speaking Cantonese text:', text)

    try {
      // Call the OpenAI TTS API
      const result = await this.callOpenAITTS(text, {
        voice: options.voice || 'nova', // 'nova' is a good voice for Chinese
        speed: options.speed || 1.0,
        format: options.format || 'mp3',
        model: options.model || 'tts-1'
      })

      return result
    } catch (error) {
      console.error('OpenAI TTS error:', error)
      throw error
    }
  }



  /**
   * Call OpenAI TTS API via our server route
   */
  private async callOpenAITTS(
    text: string, 
    options: OpenAITTTOptions
  ): Promise<TTSResult> {
    const response = await fetch('/api/speech/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: options.voice || 'nova',
        speed: options.speed || 1.0,
        format: options.format || 'mp3',
        model: options.model || 'tts-1',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`TTS API error: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'TTS generation failed')
    }

    // Create a blob URL from the base64 data
    const audioBlob = await this.base64ToBlob(data.audioData)
    const audioUrl = URL.createObjectURL(audioBlob)

    return {
      audioUrl,
      duration: data.duration,
      text: data.text
    }
  }

  /**
   * Convert base64 data URL to blob
   */
  private async base64ToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl)
    return response.blob()
  }

  /**
   * Estimate audio duration based on text length and speed
   */
  private estimateDuration(text: string, speed: number): number {
    // Rough estimation: ~150 characters per minute at normal speed
    const baseDuration = (text.length / 150) * 60 // seconds
    return baseDuration / speed
  }

  /**
   * Play audio from URL
   */
  async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl) // Clean up
        resolve()
      }
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl) // Clean up
        reject(new Error(`Audio playback error: ${error}`))
      }
      
      audio.play().catch(reject)
    })
  }

  /**
   * Speak and play text immediately
   */
  async speakAndPlay(
    text: string, 
    options: OpenAITTTOptions = {}
  ): Promise<void> {
    const result = await this.speakCantonese(text, options)
    await this.playAudio(result.audioUrl)
  }

  /**
   * Stop any ongoing audio playback
   */
  stop(): void {
    // Stop all audio elements
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
  }

  /**
   * Test the TTS service
   */
  async test(): Promise<void> {
    console.log('Testing OpenAI TTS...')
    
    try {
      await this.speakAndPlay('你好', { speed: 0.8 })
      console.log('OpenAI TTS test successful')
    } catch (error) {
      console.error('OpenAI TTS test failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const openaiTTSService = new OpenAITTSService()

// Utility functions
export const speakCantoneseWithOpenAI = async (
  text: string, 
  options?: OpenAITTTOptions
): Promise<TTSResult> => {
  return openaiTTSService.speakCantonese(text, options)
}

export const playCantoneseAudio = async (audioUrl: string): Promise<void> => {
  return openaiTTSService.playAudio(audioUrl)
}

export const speakAndPlayCantonese = async (
  text: string, 
  options?: OpenAITTTOptions
): Promise<void> => {
  return openaiTTSService.speakAndPlay(text, options)
}

export const stopOpenAITTS = (): void => {
  openaiTTSService.stop()
}

export const isOpenAITTSAvailable = (): boolean => {
  return openaiTTSService.isAvailable()
}

export const testOpenAITTS = (): Promise<void> => {
  return openaiTTSService.test()
}
