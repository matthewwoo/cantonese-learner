// src/utils/textToSpeech.test.ts
// Basic test for TTS functionality (manual testing)

import { ttsService } from './textToSpeech'

// Test TTS functionality - this would be run manually in a browser environment
export const testTTS = async () => {
  console.log('Testing TTS Service...')
  
  // Check if TTS is supported
  console.log('TTS Supported:', ttsService.isSupported())
  
  if (!ttsService.isSupported()) {
    console.log('TTS not supported in this environment')
    return
  }
  
  // Wait for voices to load
  try {
    await ttsService.waitForVoices(5000)
    console.log('Voices loaded successfully')
  } catch (error) {
    console.log('Voice loading timed out, continuing with available voices')
  }
  
  // Get available voices
  const allVoices = ttsService.getAvailableVoices()
  console.log('All available voices:', allVoices)
  
  const cantoneseVoices = ttsService.getCantoneseVoices()
  console.log('Cantonese voices found:', cantoneseVoices.length)
  cantoneseVoices.forEach(voice => 
    console.log(`- ${voice.name} (${voice.lang})`)
  )
  
  const chineseVoices = ttsService.getChineseVoices()
  console.log('Chinese voices found:', chineseVoices.length)
  chineseVoices.forEach(voice => 
    console.log(`- ${voice.name} (${voice.lang})`)
  )
  
  // Test speaking some common Cantonese words
  const testWords = ['你好', '多謝', '再見', '早晨']
  
  for (const word of testWords) {
    try {
      console.log(`Speaking: ${word}`)
      await ttsService.speakCantonese(word)
      console.log(`Successfully spoke: ${word}`)
      
      // Wait a bit between words
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error speaking ${word}:`, error)
    }
  }
  
  console.log('TTS test completed')
}

// Usage: 
// In browser console: import('./utils/textToSpeech.test.js').then(module => module.testTTS())