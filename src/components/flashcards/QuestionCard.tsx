'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ResponseQuality } from '@/utils/spaced-repetition';
import { speakCantonese, stopSpeech, isTTSSupported } from '@/utils/textToSpeech';

interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation?: string
  exampleSentenceEnglish?: string | null
  exampleSentenceChinese?: string | null
}

interface QuestionCardProps {
  flashcard: Flashcard;
  cardNumber: number;
  totalCards: number;
  onResponse: (quality: ResponseQuality) => void;
  isSubmitting?: boolean;
}

// Figma design - light blue background
const cardBackground = 'bg-[#e8f4ff]';

export default function QuestionCard({
  flashcard,
  cardNumber,
  totalCards,
  onResponse,
  isSubmitting = false,
}: QuestionCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Check TTS support on mount
  useEffect(() => {
    setTtsSupported(isTTSSupported());
  }, []);

  // Handle card flip
  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  // Handle text-to-speech for Chinese word
  const handleSpeak = useCallback(async () => {
    if (isPlaying || !ttsSupported) return;
    
    setIsPlaying(true);
    setIsLoading(true);
    
    try {
      // Stop any existing audio
      stopSpeech();
      
      // Play Chinese word
      await speakCantonese(flashcard.chineseWord);
    } catch (error) {
      console.error('TTS playback error:', error);
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [flashcard.chineseWord, isPlaying, ttsSupported]);

  // Handle stopping speech
  const handleStopSpeech = useCallback(() => {
    stopSpeech();
    setIsPlaying(false);
  }, []);

  // Get button styling for response quality
  const getResponseButtonStyle = (quality: ResponseQuality): string => {
    switch (quality) {
      case ResponseQuality.EASY:
        return "bg-green-600 hover:bg-green-700 text-white"
      case ResponseQuality.GOOD:
        return "bg-blue-600 hover:bg-blue-700 text-white"
      case ResponseQuality.HARD:
        return "bg-yellow-600 hover:bg-yellow-700 text-white"
      case ResponseQuality.INCORRECT:
        return "bg-orange-600 hover:bg-orange-700 text-white"
      case ResponseQuality.BLACKOUT:
        return "bg-red-600 hover:bg-red-700 text-white"
      default:
        return "bg-gray-600 hover:bg-gray-700 text-white"
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Card Container */}
      <div
        ref={cardRef}
        className={`relative w-full h-[574px] cursor-pointer perspective-1000 ${
          isFlipped ? 'flipped' : ''
        }`}
        onClick={handleFlip}
      >
        {/* Card Front (Question - Chinese) */}
        <div className={`absolute inset-0 w-full h-full rounded-[20px] shadow-[0px_0px_50px_0px_rgba(0,0,0,0.15)] transform transition-transform duration-600 ease-in-out backface-hidden ${cardBackground} flex flex-col justify-center items-center text-center`}>
          {/* Chinese Word */}
          <div className="text-[48px] font-bold text-black leading-[1.2] tracking-[-0.96px] mb-6">
            {flashcard.chineseWord}
          </div>
          
          {/* Buttons Container */}
          <div className="flex flex-col gap-5 items-center">
            {/* Pronounce Button */}
            {ttsSupported && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlaying) {
                    handleStopSpeech();
                  } else {
                    handleSpeak();
                  }
                }}
                disabled={isLoading}
                className={`bg-neutral-50 border border-[#f6f6f6] rounded-[8px] px-5 py-3 text-[#171515] text-[14px] font-medium transition-all ${
                  isLoading ? 'opacity-50' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#171515] border-t-transparent rounded-full animate-spin"></div>
                    Playing...
                  </div>
                ) : isPlaying ? (
                  'Stop'
                ) : (
                  'Pronounce'
                )}
              </button>
            )}
            
            {/* Show Answer Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFlip();
              }}
              className="bg-[#171515] rounded-[8px] px-5 py-3 text-white text-[14px] font-medium"
            >
              Show Answer
            </button>
          </div>
        </div>

        {/* Card Back (Answer - English) */}
        <div className={`absolute inset-0 w-full h-full rounded-[20px] shadow-[0px_0px_50px_0px_rgba(0,0,0,0.15)] transform transition-transform duration-600 ease-in-out backface-hidden rotate-y-180 bg-[#fffcf9] flex flex-col justify-between px-5 py-0`}>
          {/* Main Content */}
          <div className="flex flex-col gap-5 items-center justify-end py-10 flex-1">
            {/* Chinese Word */}
            <div className="text-[48px] font-bold text-black leading-[1.2] tracking-[-0.96px]">
              {flashcard.chineseWord}
            </div>
            
            {/* Answer Section */}
            <div className="flex flex-col gap-2 items-center justify-center p-5 w-full">
              {/* English Translation */}
              <div className="text-[#6e6c66] text-[16px] font-medium text-center">
                {flashcard.englishTranslation}
              </div>
              
              {/* Pronunciation with Audio Button */}
              <div className="flex gap-2 items-center justify-center">
                <div className="text-[#a1a09b] text-[16px] font-medium text-center">
                  {flashcard.pronunciation || 'baak6 faan6'}
                </div>
                {ttsSupported && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPlaying) {
                        handleStopSpeech();
                      } else {
                        handleSpeak();
                      }
                    }}
                    disabled={isLoading}
                    className="w-6 h-6 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-[#a1a09b] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 text-[#a1a09b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Response Options */}
            <div className="flex flex-col gap-2 items-start justify-start w-full">
              {/* No idea */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.BLACKOUT);
                }}
                disabled={isSubmitting}
                className={`bg-white border border-[#f9f2ec] rounded-[8px] p-3 w-full flex items-center justify-between transition-all ${
                  isSubmitting ? 'opacity-50' : ''
                }`}
              >
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7d7a74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-[#7d7a74] text-[14px] font-medium">No idea</div>
                </div>
                <div className="w-20 h-6"></div>
              </button>
              
              {/* Wrong guess */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.INCORRECT);
                }}
                disabled={isSubmitting}
                className={`bg-white border border-[#f9f2ec] rounded-[8px] p-3 w-full flex items-center justify-between transition-all ${
                  isSubmitting ? 'opacity-50' : ''
                }`}
              >
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7d7a74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-[#7d7a74] text-[14px] font-medium">Wrong guess</div>
                </div>
                <div className="w-20 h-6"></div>
              </button>
              
              {/* Barely got it */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.HARD);
                }}
                disabled={isSubmitting}
                className={`bg-white border border-[#f9f2ec] rounded-[8px] p-3 w-full flex items-center justify-between transition-all ${
                  isSubmitting ? 'opacity-50' : ''
                }`}
              >
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7d7a74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-[#7d7a74] text-[14px] font-medium">Barely got it</div>
                </div>
                <div className="w-20 h-6"></div>
              </button>
              
              {/* Got it right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.GOOD);
                }}
                disabled={isSubmitting}
                className={`bg-white border border-[#f9f2ec] rounded-[8px] p-3 w-full flex items-center justify-between transition-all ${
                  isSubmitting ? 'opacity-50' : ''
                }`}
              >
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7d7a74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-[#7d7a74] text-[14px] font-medium">Got it right</div>
                </div>
                <div className="w-20 h-6"></div>
              </button>
              
              {/* Too easy */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.EASY);
                }}
                disabled={isSubmitting}
                className={`bg-white border border-[#f9f2ec] rounded-[8px] p-3 w-full flex items-center justify-between transition-all ${
                  isSubmitting ? 'opacity-50' : ''
                }`}
              >
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7d7a74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-[#7d7a74] text-[14px] font-medium">Too easy</div>
                </div>
                <div className="w-20 h-6"></div>
              </button>
            </div>
          </div>
          
          {/* Bottom Border */}
          <div className="border-t border-[#f9f2ec]"></div>
        </div>
      </div>

      {/* Card Counter */}
      <div className="text-[#757575] text-[16px] font-medium text-center mt-5">
        {cardNumber} of {totalCards}
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
