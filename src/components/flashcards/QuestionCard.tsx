'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ResponseQuality } from '@/lib/srs/sm2';
import { speakCantonese, stopSpeech, isTTSSupported } from '@/utils/textToSpeech';

interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation?: string | null
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

// Shared shell classes for the two card faces (3D flip via native Tailwind v4
// utilities: perspective-* on the container, backface-hidden + rotate-y-* on
// each face, transitioned over 600ms).
const cardFace =
  'absolute inset-0 w-full h-full rounded-xl shadow-[0px_0px_50px_0px_rgba(0,0,0,0.15)] transition-transform duration-[600ms] ease-in-out backface-hidden';

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

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Card Container */}
      <div
        ref={cardRef}
        className="relative w-full h-[574px] cursor-pointer perspective-[1000px]"
        onClick={handleFlip}
      >
        {/* Card Front (Question - Chinese) */}
        <div
          className={`${cardFace} bg-deck-sky flex flex-col justify-center items-center text-center ${
            isFlipped ? 'rotate-y-180' : 'rotate-y-0'
          }`}
        >
          {/* Chinese Word */}
          <div className="text-[48px] font-bold text-foreground leading-[1.2] tracking-[-0.96px] mb-6">
            {flashcard.chineseWord}
          </div>

          {/* Buttons Container */}
          <div className="flex flex-col gap-5 items-center">
            {/* Pronounce Button */}
            {ttsSupported && (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlaying) {
                    handleStopSpeech();
                  } else {
                    handleSpeak();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                    Playing...
                  </div>
                ) : isPlaying ? (
                  'Stop'
                ) : (
                  'Pronounce'
                )}
              </Button>
            )}

            {/* Show Answer Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleFlip();
              }}
            >
              Show Answer
            </Button>
          </div>
        </div>

        {/* Card Back (Answer - English) */}
        <div
          className={`${cardFace} bg-card flex flex-col justify-between px-5 py-0 ${
            isFlipped ? 'rotate-y-0' : 'rotate-y-180'
          }`}
        >
          {/* Main Content */}
          <div className="flex flex-col gap-5 items-center justify-end py-10 flex-1">
            {/* Chinese Word */}
            <div className="text-[48px] font-bold text-foreground leading-[1.2] tracking-[-0.96px]">
              {flashcard.chineseWord}
            </div>

            {/* Answer Section */}
            <div className="flex flex-col gap-2 items-center justify-center p-5 w-full">
              {/* English Translation */}
              <div className="text-muted-foreground text-[16px] font-medium text-center">
                {flashcard.englishTranslation}
              </div>

              {/* Pronunciation with Audio Button */}
              <div className="flex gap-2 items-center justify-center">
                <div className="text-muted-foreground/70 text-[16px] font-medium text-center">
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
                      <div className="w-4 h-4 border-2 border-muted-foreground/70 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.BLACKOUT);
                }}
                disabled={isSubmitting}
                className="h-12 w-full justify-start gap-2 p-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                No idea
              </Button>

              {/* Wrong guess */}
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.INCORRECT);
                }}
                disabled={isSubmitting}
                className="h-12 w-full justify-start gap-2 p-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Wrong guess
              </Button>

              {/* Barely got it */}
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.HARD);
                }}
                disabled={isSubmitting}
                className="h-12 w-full justify-start gap-2 p-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Barely got it
              </Button>

              {/* Got it right */}
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.GOOD);
                }}
                disabled={isSubmitting}
                className="h-12 w-full justify-start gap-2 p-3 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Got it right
              </Button>

              {/* Too easy */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onResponse(ResponseQuality.EASY);
                }}
                disabled={isSubmitting}
                className="h-12 w-full justify-start gap-2 p-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Too easy
              </Button>
            </div>
          </div>

          {/* Bottom Border */}
          <div className="border-t border-background"></div>
        </div>
      </div>

      {/* Card Counter */}
      <div className="text-muted-foreground text-[16px] font-medium text-center mt-5">
        {cardNumber} of {totalCards}
      </div>
    </div>
  );
}
