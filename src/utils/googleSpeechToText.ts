// src/utils/googleSpeechToText.ts
// Google Cloud Speech-to-Text API service for Cantonese

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

interface GoogleSTTResponse {
  results: Array<{
    alternatives: Array<{
      transcript: string
      confidence: number
    }>
    isFinal: boolean
  }>
}

class GoogleSpeechToTextService {
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
          sampleRate: 16000, // Google STT works well with 16kHz
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })

      // Set up MediaRecorder with optimal format for Google STT
      const mimeTypes = [
        'audio/webm;codecs=opus',  // Best for Google STT
        'audio/webm',              // Fallback
        'audio/mp4',               // Alternative
        'audio/ogg;codecs=opus'    // Another option
      ]
      
      let mimeType = 'audio/webm;codecs=opus' // Default
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      console.log('Using MediaRecorder format for Google STT:', mimeType)
      
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
            console.log('Audio recording stopped for Google STT. Chunks:', this.audioChunks.length)
            
            const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
            console.log('Audio blob created for Google STT. Size:', audioBlob.size, 'bytes, Type:', audioBlob.type)
            
            // Enhanced validation
            if (audioBlob.size === 0) {
              throw new Error('Audio recording is empty')
            }
            
            if (audioBlob.size < 1000) {
              console.warn('Audio recording is very small:', audioBlob.size, 'bytes - this might cause issues')
            }
            
            // Check if we have actual audio data
            const arrayBuffer = await audioBlob.arrayBuffer()
            console.log('Audio array buffer size for Google STT:', arrayBuffer.byteLength, 'bytes')
            
            if (arrayBuffer.byteLength === 0) {
              throw new Error('Audio data is empty after conversion')
            }
            
            const result = await this.processAudio(audioBlob, options)
            onResult(result)
          } else {
            throw new Error('No audio data recorded')
          }
        } catch (error) {
          console.error('Error in Google STT mediaRecorder.onstop:', error)
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
      console.log('Started recording audio for Google Cloud Speech-to-Text')

    } catch (error) {
      console.error('Failed to start Google STT recording:', error)
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

  // Map MIME types to Google Cloud encoding formats
  private getGoogleEncoding(mimeType: string): string {
    const encodingMap: { [key: string]: string } = {
      'audio/webm;codecs=opus': 'WEBM_OPUS',
      'audio/webm': 'WEBM_OPUS',
      'audio/mp4': 'MP3',
      'audio/ogg;codecs=opus': 'OGG_OPUS',
      'audio/wav': 'LINEAR16',
      'audio/flac': 'FLAC'
    }
    
    const encoding = encodingMap[mimeType] || 'WEBM_OPUS'
    console.log(`MIME type "${mimeType}" mapped to Google encoding: "${encoding}"`)
    return encoding
  }

  // Process audio with Google Cloud Speech-to-Text API
  private async processAudio(audioBlob: Blob, options: STTOptions): Promise<STTResult> {
    try {
      console.log('Processing audio with Google Cloud Speech-to-Text...')
      
      // Convert audio to base64
      const base64Audio = await this.blobToBase64(audioBlob)
      console.log('Audio converted to base64 for Google STT, length:', base64Audio.length)
      
      // Call Google Cloud Speech-to-Text API
      const transcript = await this.callGoogleSTTAPI(base64Audio, options.lang)
      console.log('Google STT transcript received:', transcript)
      
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
        confidence: 0.95, // Google STT doesn't return confidence in this format, so we use a high default
        isFinal: true,
        translation
      }

    } catch (error) {
      console.error('Error processing audio with Google STT:', error)
      throw error
    }
  }

  // Call Google Cloud Speech-to-Text API
  private async callGoogleSTTAPI(base64Audio: string, language?: string): Promise<string> {
    console.log('Calling Google Cloud Speech-to-Text API with language:', language || 'yue-Hant-HK')
    console.log('Audio data length:', base64Audio.length)
    
    const requestBody = {
      audio: {
        content: base64Audio
      },
      config: {
        encoding: this.getGoogleEncoding(this.mediaRecorder?.mimeType || 'audio/webm;codecs=opus'),
        // Don't specify sampleRateHertz for WEBM_OPUS - let Google Cloud detect it from the audio header
        languageCode: language || 'yue-Hant-HK', // Cantonese (Hong Kong) with Traditional Chinese
        alternativeLanguageCodes: ['zh-HK', 'zh-TW', 'zh-CN'], // Fallback to other Chinese variants
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        enableWordConfidence: false
        // Don't specify model - use default which supports zh-HK
      }
    }
    
    console.log('Request body keys:', Object.keys(requestBody))
    
    const response = await fetch('/api/speech/google-stt', {
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
        console.error('Google STT API error response (JSON):', error)
      } catch (e) {
        try {
          errorText = await response.text()
          console.error('Google STT API error response (text):', errorText)
        } catch (textError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`
          console.error('Google STT API error response (status):', errorText)
        }
        error = { error: errorText }
      }
      
      // Log additional debugging info
      console.error('Google STT API response status:', response.status)
      console.error('Google STT API response headers:', Object.fromEntries(response.headers.entries()))
      
      throw new Error(error.error || error.details || errorText || 'Failed to transcribe audio')
    }

    const data = await response.json()
    return data.transcript
  }

  // Translate text using OpenAI Chat Completions API (reuse existing translation)
  private async translateText(text: string, targetLanguage: string): Promise<any> {
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
            console.log('Blob converted to base64 for Google STT. Length:', base64.length)
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
export const googleSTTService = new GoogleSpeechToTextService()

// Utility functions
export const startGoogleRecording = (
  onResult: (result: STTResult) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  options?: STTOptions
) => {
  googleSTTService.startRecording(onResult, onError, onEnd, options)
}

export const stopGoogleRecording = () => {
  googleSTTService.stopRecording()
}

export const isGoogleSTTSupported = () => {
  return googleSTTService.isSupported()
}

export const isGoogleRecording = () => {
  return googleSTTService.isRecordingNow()
}
