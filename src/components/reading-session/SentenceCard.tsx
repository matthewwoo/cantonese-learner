'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ttsService, speakCantonese, stopSpeech } from '@/utils/textToSpeech';
import { speakAndPlayCantonese as speakWithOpenAI, stopOpenAITTS, isOpenAITTSAvailable } from '@/utils/openaiTTS';

interface SentenceCardProps {
  chinese: string;
  english: string;
  cardNumber: number;
  totalCards: number;
  autoPlayTTS: boolean;
  ttsSpeed: number;
  onComplete: () => void;
  onFlip: (flipped: boolean) => void;
  onReplay: () => void;
}

const gradientColors = [
  'from-blue-400 to-cyan-400',
  'from-purple-400 to-pink-400',
  'from-green-400 to-emerald-400',
  'from-orange-400 to-yellow-400',
  'from-indigo-400 to-blue-400',
  'from-pink-400 to-rose-400',
];

export default function SentenceCard({
  chinese,
  english,
  cardNumber,
  totalCards,
  autoPlayTTS,
  ttsSpeed,
  onComplete,
  onFlip,
  onReplay,
}: SentenceCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const gradientIndex = (cardNumber - 1) % gradientColors.length;

  // Play audio function
  const playAudio = useCallback(async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    setIsLoading(true);
    onReplay();
    
    try {
      // Stop any existing audio
      stopSpeech();
      stopOpenAITTS();
      
      // Play Chinese text
      if (ttsService.isSupported()) {
        console.log(`SentenceCard TTS: Playing with Web Speech TTS`);
        await speakCantonese(chinese, {
          rate: ttsSpeed,
          lang: 'zh-HK'
        });
      } else if (isOpenAITTSAvailable()) {
        console.log(`SentenceCard TTS: Playing with OpenAI TTS`);
        await speakWithOpenAI(chinese, {
          speed: ttsSpeed,
          voice: 'nova'
        });
      } else {
        console.log(`SentenceCard TTS: Using fallback TTS`);
        const utterance = new SpeechSynthesisUtterance(chinese);
        utterance.lang = 'zh-HK';
        utterance.rate = ttsSpeed;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS playback error:', error);
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [chinese, ttsSpeed, isPlaying, onReplay]);

  // Auto-play TTS when card loads or when card is reset to Chinese side
  useEffect(() => {
    if (autoPlayTTS && !isFlipped) {
      const timer = setTimeout(() => {
        playAudio();
      }, 500); // Small delay to let card animation complete
      
      return () => {
        clearTimeout(timer);
        // Stop any playing audio when component unmounts or dependencies change
        stopSpeech();
        stopOpenAITTS();
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [autoPlayTTS, isFlipped, chinese, cardNumber, playAudio]); // Added playAudio as dependency

  // Stop TTS when card changes
  useEffect(() => {
    return () => {
      // Stop any playing audio when card changes
      stopSpeech();
      stopOpenAITTS();
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cardNumber]);

  // Handle card flip
  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
    onFlip(!isFlipped);
    
    // Don't auto-play TTS when flipped - let user manually replay if needed
  }, [isFlipped, onFlip]);

  // Handle card completion
  const handleComplete = useCallback(() => {
    // Stop any playing audio
    stopSpeech();
    stopOpenAITTS();
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // Reset card to Chinese side before completing
    setIsFlipped(false);
    
    onComplete();
  }, [onComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleFlip();
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        playAudio();
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        handleComplete();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        // This will be handled by the parent component for previous card
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, onComplete, handleFlip, playAudio, handleComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div
        ref={cardRef}
        className={`relative w-full aspect-[4/3] cursor-pointer perspective-1000 ${
          isFlipped ? 'flipped' : ''
        }`}
        onClick={handleFlip}
      >
        {/* Card Front (Chinese) */}
        <div className={`absolute inset-0 w-full h-full rounded-3xl shadow-2xl transform transition-transform duration-600 ease-in-out backface-hidden bg-gradient-to-br ${gradientColors[gradientIndex]} p-8 flex flex-col justify-center items-center text-center`}>
          {/* Card Number */}
          <div className="absolute top-4 left-4 bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm font-semibold text-white">
            {cardNumber} / {totalCards}
          </div>
          
          {/* Chinese Text */}
          <div className="text-4xl md:text-5xl font-bold text-white leading-relaxed mb-6">
            {chinese}
          </div>
          
          {/* Audio Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playAudio();
              }}
              disabled={isLoading}
              className={`w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center transition-all hover:bg-opacity-30 ${
                isLoading ? 'animate-pulse' : ''
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Tap to Flip Hint */}
          <div className="absolute bottom-4 left-4 text-white text-opacity-70 text-sm">
            Tap to flip
          </div>
        </div>

        {/* Card Back (English) */}
        <div className={`absolute inset-0 w-full h-full rounded-3xl shadow-2xl transform transition-transform duration-600 ease-in-out backface-hidden rotate-y-180 bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex flex-col justify-center items-center text-center`}>
          {/* Card Number */}
          <div className="absolute top-4 left-4 bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
            {cardNumber} / {totalCards}
          </div>
          
          {/* English Translation */}
          <div className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed mb-6">
            {english}
          </div>
          
          {/* Chinese Text (smaller) */}
          <div className="text-lg text-gray-600 mb-8">
            {chinese}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playAudio();
              }}
              disabled={isLoading}
              className={`px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold transition-all hover:bg-blue-600 flex items-center gap-2 ${
                isLoading ? 'opacity-50' : ''
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
              Replay
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleComplete();
              }}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold transition-all hover:bg-green-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Got it!
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Space</kbd> to flip • <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">R</kbd> to replay audio • <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">→</kbd> next card</p>
      </div>
    </div>
  );
}

// Add CSS for 3D flip animation
const style = document.createElement('style');
style.textContent = `
  .perspective-1000 {
    perspective: 1000px;
  }
  
  .backface-hidden {
    backface-visibility: hidden;
  }
  
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
  
  .flipped .backface-hidden:first-child {
    transform: rotateY(180deg);
  }
  
  .flipped .backface-hidden:last-child {
    transform: rotateY(0deg);
  }
  
  .duration-600 {
    transition-duration: 600ms;
  }
  
  .ease-in-out {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}
