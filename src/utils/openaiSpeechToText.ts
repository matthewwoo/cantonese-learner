// src/utils/openaiSpeechToText.ts
// OpenAI-based speech-to-text and translation service

interface STTOptions {
  lang?: string
  timeout?: number
  translateTo?: string // Target language for translation
}

interface STTResult {
  transcript: string
  confidence: number
  isFinal: boolean
  translation?: string // English translation if requested
}

interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

class OpenAISpeechToTextService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private isRecording = false
  private stream: MediaStream | null = null

  constructor() {
    // Check if MediaRecorder is supported
    if (typeof window !== 'undefined' && !window.MediaRecorder) {
      console.warn('MediaRecorder not supported in this browser')
    }
  }

  // Check if the service is supported
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           !!window.MediaRecorder && 
           !!navigator.mediaDevices?.getUserMedia
  }

  // Start recording audio
  async startRecording(
    onResult: (result: STTResult) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    options: STTOptions = {}
  ): Promise<void> {
    if (!this.isSupported()) {
      onError('MediaRecorder not supported in this browser')
      return
    }

    if (this.isRecording) {
      onError('Already recording')
      return
    }

    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Whisper works best with 16kHz
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })

      // Set up MediaRecorder with more compatible format
      let mimeType = 'audio/webm;codecs=opus'
      
      // Check if the browser supports this format
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        console.log('Falling back to basic audio/webm format')
      }
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
        console.log('Falling back to audio/mp4 format')
      }
      
      console.log('Using MediaRecorder format:', mimeType)
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      })

      this.audioChunks = []
      this.isRecording = true

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        try {
          if (this.audioChunks.length > 0) {
            console.log('Audio recording stopped. Chunks:', this.audioChunks.length)
            
            const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
            console.log('Audio blob created. Size:', audioBlob.size, 'bytes, Type:', audioBlob.type)
            
            // Enhanced validation
            if (audioBlob.size === 0) {
              throw new Error('Audio recording is empty')
            }
            
            if (audioBlob.size < 1000) {
              console.warn('Audio recording is very small:', audioBlob.size, 'bytes - this might cause issues')
            }
            
            // Check if we have actual audio data
            const arrayBuffer = await audioBlob.arrayBuffer()
            console.log('Audio array buffer size:', arrayBuffer.byteLength, 'bytes')
            
            if (arrayBuffer.byteLength === 0) {
              throw new Error('Audio data is empty after conversion')
            }
            
            const result = await this.processAudio(audioBlob, options)
            onResult(result)
          } else {
            throw new Error('No audio data recorded')
          }
        } catch (error) {
          console.error('Error in mediaRecorder.onstop:', error)
          onError(error instanceof Error ? error.message : 'Failed to process audio')
        } finally {
          this.cleanup()
          onEnd()
        }
      }

      this.mediaRecorder.onerror = (event) => {
        onError(`Recording error: ${event.error}`)
        this.cleanup()
        onEnd()
      }

      // Set up timeout
      const timeout = options.timeout || 10000 // 10 seconds default
      const timeoutId = setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording()
        }
      }, timeout)

      // Start recording
      this.mediaRecorder.start(1000) // Collect data every second
      console.log('Started recording audio for OpenAI Whisper')

    } catch (error) {
      console.error('Failed to start recording:', error)
      onError(error instanceof Error ? error.message : 'Failed to start recording')
      this.cleanup()
      onEnd()
    }
  }

  // Stop recording
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.isRecording = false
    }
  }

  // Process audio with OpenAI Whisper API
  private async processAudio(audioBlob: Blob, options: STTOptions): Promise<STTResult> {
    try {
      console.log('Processing audio with OpenAI Whisper...')
      
      // Convert audio to base64
      const base64Audio = await this.blobToBase64(audioBlob)
      console.log('Audio converted to base64, length:', base64Audio.length)
      
      // Call OpenAI Whisper API
      const transcript = await this.callWhisperAPI(base64Audio, options.lang)
      console.log('Whisper transcript received:', transcript)
      
      // If translation is requested, call translation API
      let translation: string | undefined
      if (options.translateTo) {
        console.log('Calling translation API for language:', options.translateTo)
        const translationResult = await this.translateText(transcript, options.translateTo)
        translation = translationResult.translatedText
        console.log('Translation received:', translation)
      }

      return {
        transcript,
        confidence: 0.95, // Whisper doesn't return confidence, so we use a high default
        isFinal: true,
        translation
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      throw error
    }
  }

  // Call OpenAI Whisper API
  private async callWhisperAPI(base64Audio: string, language?: string): Promise<string> {
    console.log('Calling Whisper API with language:', language || 'zh')
    console.log('Audio data length:', base64Audio.length)
    
    const requestBody = {
      audio: base64Audio,
              language: language || 'zh', // Chinese - Enhanced with Cantonese-specific prompts and parameters
      audioType: this.mediaRecorder?.mimeType || 'audio/webm'
    }
    
    console.log('Request body keys:', Object.keys(requestBody))
    
    const response = await fetch('/api/speech/whisper', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      let error
      let errorText = ''
      
      try {
        error = await response.json()
        console.error('Whisper API error response (JSON):', error)
      } catch (e) {
        // If JSON parsing fails, try to get the raw text
        try {
          errorText = await response.text()
          console.error('Whisper API error response (text):', errorText)
        } catch (textError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`
          console.error('Whisper API error response (status):', errorText)
        }
        error = { error: errorText }
      }
      
      // Log additional debugging info
      console.error('Whisper API response status:', response.status)
      console.error('Whisper API response headers:', Object.fromEntries(response.headers.entries()))
      
      throw new Error(error.error || error.details || errorText || 'Failed to transcribe audio')
    }

    const data = await response.json()
    return data.transcript
  }

  // Translate text using OpenAI Chat Completions API
  private async translateText(text: string, targetLanguage: string): Promise<TranslationResult> {
    const response = await fetch('/api/speech/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage
      }),
    })

    if (!response.ok) {
      let error
      try {
        error = await response.json()
      } catch (e) {
        error = { error: `HTTP ${response.status}: ${response.statusText}` }
      }
      console.error('Translation API error response:', error)
      throw new Error(error.error || error.details || 'Failed to translate text')
    }

    const data = await response.json()
    return data
  }

  // Convert blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const result = reader.result as string
            // Remove the data URL prefix to get just the base64 string
            const base64 = result.split(',')[1]
            if (!base64) {
              reject(new Error('Failed to extract base64 data from blob'))
              return
            }
            console.log('Blob converted to base64. Length:', base64.length)
            resolve(base64)
          } catch (error) {
            reject(new Error('Failed to process blob data'))
          }
        }
        reader.onerror = (error) => {
          console.error('FileReader error:', error)
          reject(new Error('Failed to read audio blob'))
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        reject(new Error('Failed to start blob conversion'))
      }
    })
  }

  // Clean up resources
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
    this.isRecording = false
  }

  // Check if currently recording
  isRecordingNow(): boolean {
    return this.isRecording
  }
}

// Export singleton instance
export const openaiSTTService = new OpenAISpeechToTextService()

// Utility functions
export const startOpenAIRecording = (
  onResult: (result: STTResult) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  options?: STTOptions
) => {
  openaiSTTService.startRecording(onResult, onError, onEnd, options)
}

export const stopOpenAIRecording = () => {
  openaiSTTService.stopRecording()
}

export const isOpenAISTTSupported = () => {
  return openaiSTTService.isSupported()
}

export const isOpenAIRecording = () => {
  return openaiSTTService.isRecordingNow()
}
