// src/utils/articles/enhancedTTS.ts
// Enhanced Text-to-Speech service with word-level highlighting for articles

import { ttsService } from '@/utils/textToSpeech'

// Types for enhanced TTS functionality
export interface WordHighlightData {
  wordIndex: number        // Index of the current word being spoken
  word: string            // The actual word/character being spoken
  startTime: number       // When this word started speaking (timestamp)
  duration?: number       // How long this word takes to speak (estimated)
}

export interface TTSHighlightOptions {
  rate?: number           // Speech rate (0.1 to 10)
  pitch?: number          // Speech pitch (0 to 2)
  volume?: number         // Speech volume (0 to 1)
  onWordStart?: (data: WordHighlightData) => void    // Called when word starts
  onWordEnd?: (data: WordHighlightData) => void      // Called when word ends
  onLineComplete?: () => void                        // Called when line is done
  onError?: (error: Error) => void                   // Called on TTS errors
  lang?: string           // Language code (defaults to zh-HK for Cantonese)
}

export interface ChineseWord {
  text: string            // The Chinese character(s)
  startIndex: number      // Position in original text
  endIndex: number        // End position in original text
}

/**
 * Enhanced TTS Service specifically designed for Chinese text in articles
 * Provides word-level highlighting synchronization with speech
 */
class EnhancedArticleTTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isCurrentlySpeaking = false
  private highlightTimer: NodeJS.Timeout | null = null
  private wordQueue: ChineseWord[] = []
  private currentWordIndex = 0
  private startTime = 0

  /**
   * Parse Chinese text into individual words/characters for highlighting
   * Chinese text is typically character-based, so we split by characters
   * but group certain characters that form compound words
   */
  private parseChineseText(text: string): ChineseWord[] {
    const words: ChineseWord[] = []
    let currentIndex = 0
    
    // Split by characters but preserve punctuation and spaces
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      // Skip whitespace but track position
      if (char.match(/\s/)) {
        currentIndex++
        continue
      }
      
      // Handle punctuation as separate "words"
      if (char.match(/[。，、；：？！""''（）【】《》]/)) {
        words.push({
          text: char,
          startIndex: currentIndex,
          endIndex: currentIndex + 1
        })
        currentIndex++
        continue
      }
      
      // For Chinese characters, each character is typically a word
      // But we could enhance this later to group compound words
      if (char.match(/[\u4e00-\u9fff]/)) {
        words.push({
          text: char,
          startIndex: currentIndex,
          endIndex: currentIndex + 1
        })
        currentIndex++
        continue
      }
      
      // Handle other characters (numbers, English, etc.)
      words.push({
        text: char,
        startIndex: currentIndex,
        endIndex: currentIndex + 1
      })
      currentIndex++
    }
    
    return words
  }

  /**
   * Estimate speaking duration for each word based on speech rate
   * This is an approximation since browsers don't provide exact timing
   */
  private estimateWordDuration(word: string, rate: number = 1.0): number {
    // Base duration per character in milliseconds
    const baseCharDuration = 800 // milliseconds per character at normal speed
    
    // Adjust for speech rate (lower rate = longer duration)
    const adjustedDuration = (baseCharDuration / rate) * word.length
    
    // Add extra time for punctuation pauses
    if (word.match(/[。！？]/)) {
      return adjustedDuration + 500 // Extra pause for sentence endings
    }
    if (word.match(/[，、；：]/)) {
      return adjustedDuration + 200 // Extra pause for commas
    }
    
    return Math.max(adjustedDuration, 100) // Minimum 100ms per word
  }

  /**
   * Start word-by-word highlighting simulation
   * Since browsers don't provide exact word timing, we estimate based on speech rate
   */
  private startWordHighlighting(
    words: ChineseWord[],
    options: TTSHighlightOptions
  ): void {
    this.currentWordIndex = 0
    this.wordQueue = words
    this.startTime = Date.now()
    
    const highlightNextWord = () => {
      if (this.currentWordIndex >= this.wordQueue.length || !this.isCurrentlySpeaking) {
        return // Done or stopped
      }
      
      const currentWord = this.wordQueue[this.currentWordIndex]
      const highlightData: WordHighlightData = {
        wordIndex: this.currentWordIndex,
        word: currentWord.text,
        startTime: Date.now(),
        duration: this.estimateWordDuration(currentWord.text, options.rate || 1.0)
      }
      
      // Notify that word started
      options.onWordStart?.(highlightData)
      
      // Calculate when to highlight next word
      const wordDuration = this.estimateWordDuration(currentWord.text, options.rate || 1.0)
      
      // Schedule word end notification
      setTimeout(() => {
        if (this.isCurrentlySpeaking && this.currentWordIndex < this.wordQueue.length) {
          options.onWordEnd?.(highlightData)
        }
      }, wordDuration * 0.8) // End highlight slightly before next word
      
      // Schedule next word
      this.highlightTimer = setTimeout(() => {
        this.currentWordIndex++
        highlightNextWord()
      }, wordDuration)
    }
    
    // Start the highlighting sequence
    highlightNextWord()
  }

  /**
   * Speak Chinese text with word-level highlighting
   * Main method for articles to use
   */
  async speakWithHighlighting(
    text: string,
    options: TTSHighlightOptions = {}
  ): Promise<void> {
    // Stop any current speech
    this.stopSpeaking()
    
    // Validate input
    if (!text || text.trim() === '') {
      throw new Error('No text provided for speech synthesis')
    }

    // Parse text into words for highlighting
    const words = this.parseChineseText(text)
    console.log('TTS: Parsed words for highlighting:', words)
    
    try {
      // Wait for TTS service to be ready
      await ttsService.waitForVoices(3000)
    } catch (error) {
      console.warn('TTS: Voice loading timeout, proceeding anyway')
    }

    return new Promise((resolve, reject) => {
      // Create speech utterance
      this.currentUtterance = new SpeechSynthesisUtterance(text)
      
      // Set up voice (prefer Cantonese)
      const cantoneseVoices = ttsService.getCantoneseVoices()
      if (cantoneseVoices.length > 0) {
        this.currentUtterance.voice = cantoneseVoices[0]
        console.log('TTS: Using Cantonese voice:', cantoneseVoices[0].name)
      }
      
      // Configure speech parameters
      this.currentUtterance.lang = options.lang || 'zh-HK'
      this.currentUtterance.rate = options.rate || 0.8
      this.currentUtterance.pitch = options.pitch || 1.0
      this.currentUtterance.volume = options.volume || 1.0

      // Set up event handlers
      this.currentUtterance.onstart = () => {
        console.log('TTS: Speech started with highlighting')
        this.isCurrentlySpeaking = true
        
        // Start word-by-word highlighting
        this.startWordHighlighting(words, options)
      }

      this.currentUtterance.onend = () => {
        console.log('TTS: Speech completed')
        this.isCurrentlySpeaking = false
        
        // Clean up highlighting timer
        if (this.highlightTimer) {
          clearTimeout(this.highlightTimer)
          this.highlightTimer = null
        }
        
        // Notify completion
        options.onLineComplete?.()
        resolve()
      }

      this.currentUtterance.onerror = (event) => {
        console.error('TTS: Speech error:', event.error)
        this.isCurrentlySpeaking = false
        
        // Clean up
        if (this.highlightTimer) {
          clearTimeout(this.highlightTimer)
          this.highlightTimer = null
        }
        
        const error = new Error(`Speech synthesis error: ${event.error}`)
        options.onError?.(error)
        reject(error)
      }

      this.currentUtterance.onpause = () => {
        console.log('TTS: Speech paused')
        // Don't stop highlighting completely, just pause it
      }

      this.currentUtterance.onresume = () => {
        console.log('TTS: Speech resumed')
        // Resume highlighting if needed
      }

      // Start speaking
      if (ttsService.isSupported()) {
        window.speechSynthesis.speak(this.currentUtterance)
      } else {
        reject(new Error('Speech synthesis not supported'))
      }
    })
  }

  /**
   * Stop current speech and highlighting
   */
  stopSpeaking(): void {
    console.log('TTS: Stopping speech and highlighting')
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    // Clear highlighting timer
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer)
      this.highlightTimer = null
    }
    
    // Reset state
    this.isCurrentlySpeaking = false
    this.currentUtterance = null
    this.currentWordIndex = 0
    this.wordQueue = []
  }

  /**
   * Pause current speech (highlighting continues but slower)
   */
  pauseSpeaking(): void {
    if (window.speechSynthesis && this.isCurrentlySpeaking) {
      window.speechSynthesis.pause()
    }
  }

  /**
   * Resume paused speech
   */
  resumeSpeaking(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isCurrentlySpeaking
  }

  /**
   * Get current word being highlighted
   */
  getCurrentWord(): ChineseWord | null {
    if (this.currentWordIndex < this.wordQueue.length) {
      return this.wordQueue[this.currentWordIndex]
    }
    return null
  }

  /**
   * Get progress through current text (0 to 1)
   */
  getProgress(): number {
    if (this.wordQueue.length === 0) return 0
    return this.currentWordIndex / this.wordQueue.length
  }
}

// Export singleton instance
export const enhancedTTSService = new EnhancedArticleTTSService()

// Utility functions for easy use in components
export const speakChineseWithHighlighting = async (
  text: string,
  options?: TTSHighlightOptions
) => {
  return enhancedTTSService.speakWithHighlighting(text, options)
}

export const stopChineseSpeech = () => {
  enhancedTTSService.stopSpeaking()
}

export const pauseChineseSpeech = () => {
  enhancedTTSService.pauseSpeaking()
}

export const resumeChineseSpeech = () => {
  enhancedTTSService.resumeSpeaking()
}
