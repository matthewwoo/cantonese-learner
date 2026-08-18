// src/utils/textToSpeech.ts
// Text-to-speech utility for Cantonese pronunciation.
//
// Preference order:
//   1. Server TTS (/api/speech/tts -> MiniMax Speech-02) — natural, consistent
//      Cantonese on every device.
//   2. Web Speech API — offline fallback using whatever zh-HK voice the OS has.
//
// Speed comes from CANTONESE_TTS_SPEED unless a caller overrides it, so every
// surface reads at the same pace.

import { CANTONESE_TTS_SPEED } from "@/lib/tts"

interface TTSOptions {
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
  voice?: string // MiniMax voice_id (overrides MINIMAX_VOICE_ID)
}

class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []
  private isLoaded = false
  private isInitialized = false
  private currentAudio: HTMLAudioElement | null = null
  // Generation token: every speak/stop bumps it, and any in-flight speech
  // (server fetch still resolving, Web Speech waiting on voices) checks it
  // before making sound. Prevents two engines overlapping.
  private speakSeq = 0

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

  // Check if TTS is supported.
  // Server TTS works in any browser, so this is true whenever we're
  // client-side; Web Speech availability only matters for the fallback.
  isSupported(): boolean {
    return typeof window !== 'undefined'
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

  /**
   * Speak text via the server (MiniMax).
   * Resolves when playback finishes. Throws `ServerTTSError` when synthesis
   * failed (fallback to Web Speech is sensible) and `PlaybackBlocked` when
   * the browser refused autoplay (fallback would just overlap later audio).
   */
  private async speakViaServer(text: string, seq: number, options: TTSOptions = {}): Promise<void> {
    let data: { success?: boolean; audioData?: string; error?: string }
    try {
      const response = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speed: options.rate ?? CANTONESE_TTS_SPEED,
          voice: options.voice,
        }),
      })
      if (!response.ok) {
        throw new Error(`Server TTS error: ${response.status}`)
      }
      data = await response.json()
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Server TTS failed')
      err.name = 'ServerTTSError'
      throw err
    }

    if (!data.success || !data.audioData) {
      const err = new Error(data.error || 'Server TTS failed')
      err.name = 'ServerTTSError'
      throw err
    }

    // A newer speak/stop happened while we were fetching — stay silent.
    if (seq !== this.speakSeq) return

    return new Promise((resolve, reject) => {
      const audio = new Audio(data.audioData!)
      audio.volume = options.volume ?? 1.0
      this.currentAudio = audio

      audio.onended = () => {
        if (this.currentAudio === audio) this.currentAudio = null
        resolve()
      }
      // stop() pauses and detaches the element; settle the promise so
      // callers' isSpeaking state doesn't hang
      audio.onpause = () => {
        if (this.currentAudio !== audio) resolve()
      }
      audio.onerror = () => {
        if (this.currentAudio === audio) this.currentAudio = null
        reject(new Error('Audio playback error'))
      }
      audio.play().catch((error) => {
        if (this.currentAudio === audio) this.currentAudio = null
        const err = new Error(error?.message || 'Playback blocked')
        err.name = 'PlaybackBlocked'
        reject(err)
      })
    })
  }

  // Speak Chinese text with Cantonese pronunciation.
  // Tries the MiniMax-backed server endpoint first; falls back to the
  // browser's Web Speech API only when the server itself is unavailable.
  async speakCantonese(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text || text.trim() === '') {
      throw new Error('No text provided for speech synthesis')
    }

    // Stop anything already playing and claim a new speech generation
    this.stop()
    const seq = ++this.speakSeq

    try {
      return await this.speakViaServer(text, seq, options)
    } catch (error) {
      // Autoplay was blocked: do NOT fall back — Web Speech would start
      // later and overlap the next user-initiated playback.
      if (error instanceof Error && error.name === 'PlaybackBlocked') {
        console.warn('TTS: Autoplay blocked by browser; skipping playback')
        return
      }
      // Server unreachable/misconfigured: fall back for this call only.
      console.warn('TTS: Server TTS unavailable, falling back to Web Speech:', error)
    }

    if (seq !== this.speakSeq) return
    return this.speakWithWebSpeech(text, seq, options)
  }

  // Web Speech API path (previous default), kept as fallback
  private async speakWithWebSpeech(text: string, seq: number, options: TTSOptions = {}): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported')
    }

    console.log('TTS: Attempting to speak:', text)

    // Wait for voices to load
    try {
      await this.waitForVoices()
    } catch (error) {
      console.warn('TTS: Voice loading timeout, proceeding with available voices')
    }

    // A newer speak/stop happened while voices were loading — stay silent.
    if (seq !== this.speakSeq) return

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
      } else {
        // Deliberately leave `voice` unset rather than taking the first zh
        // voice: that list matches zh-CN, so picking from it forces Mandarin.
        // An assigned voice overrides utterance.lang, so this is the only way
        // the zh-HK hint below gets a chance to be honoured.
        console.warn(
          `TTS: No Cantonese voice available (${chineseVoices.length} other Chinese voice(s) ignored to avoid Mandarin); falling back to lang hint only`
        )
      }
      
      // Set language
      utterance.lang = options.lang || 'zh-HK' // Hong Kong Chinese (Cantonese)
      
      // Set speech parameters
      utterance.rate = options.rate ?? CANTONESE_TTS_SPEED
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

  // Stop current speech (both server-audio playback and Web Speech), and
  // invalidate any in-flight speech that hasn't started making sound yet.
  stop(): void {
    this.speakSeq++
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.src = ''
      this.currentAudio = null
    }
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) return true
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
      await this.speakCantonese('你好')
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