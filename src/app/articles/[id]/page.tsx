'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ttsService, speakCantonese, stopSpeech } from '@/utils/textToSpeech';
import { speakAndPlayCantonese as speakWithOpenAI, stopOpenAITTS, isOpenAITTSAvailable } from '@/utils/openaiTTS';
import ChatMessage from '@/components/chat/ChatMessage';
import { processArticleIntoSentences, type SentenceCard } from '@/utils/sentenceProcessor';

interface Article {
  id: string;
  title: string;
  sourceUrl?: string;
  originalContent: string[];
  translatedContent: string[];
  wordDefinitions: Record<string, any>;
}

interface ReadingSession {
  id: string;
  currentPosition: number;
  readingSpeed: number;
  showTranslation: boolean;
}

/**
 * Article reading page
 * Provides TTS, highlighting, translation toggle, etc.
 */
export default function ArticleReadingPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  // State management
  const [article, setArticle] = useState<Article | null>(null);
  const [readingSession, setReadingSession] = useState<ReadingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sentences, setSentences] = useState<SentenceCard[]>([]);
  
  // Reading controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // Vocabulary definition modal
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDefinition, setWordDefinition] = useState<any>(null);
  
  // TTS related
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

// Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesis.current = window.speechSynthesis;
    }
    
    // Initialize Cantonese TTS services
    if (isOpenAITTSAvailable()) {
      console.log('Article TTS: OpenAI TTS service available for Cantonese');
    } else if (ttsService.isSupported()) {
      console.log('Article TTS: Web Speech TTS service available (fallback)');
    } else {
      console.warn('Article TTS: No TTS service available');
    }
    
    // Cleanup function
    return () => {
      stopSpeech(); // Stop any ongoing Web Speech TTS
      stopOpenAITTS(); // Stop any ongoing OpenAI TTS
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }
    };
  }, []);

  // Load article data
  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  /**
   * Fetch article content and reading session
   */
  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/articles/${articleId}`);
      if (!response.ok) throw new Error('獲取文章失敗');
      
      const data = await response.json();
      console.log('Article display: Received article data:', data.article);
      console.log('Article display: Original content (first 2 lines):', data.article.originalContent?.slice(0, 2));
      console.log('Article display: Translated content (first 2 lines):', data.article.translatedContent?.slice(0, 2));
      
      setArticle(data.article);
      setReadingSession(data.readingSession);
      setCurrentLineIndex(data.readingSession.currentPosition);
      // Default to Chinese view for bubbles (do not auto-enable English)
      setPlaybackSpeed(data.readingSession.readingSpeed);

      // Process article into sentence-level cards for chat-style bubbles
      try {
        const processed = processArticleIntoSentences(
          data.article.originalContent ?? [],
          data.article.translatedContent ?? []
        );
        setSentences(processed.sentences);
      } catch (e) {
        console.warn('Sentence processing failed, falling back to paragraph-level.', e);
        // Fallback: map paragraph pairs into pseudo-sentences
        const fallbackSentences: SentenceCard[] = (data.article.translatedContent ?? []).map((cn: string, i: number) => ({
          chinese: cn,
          english: (data.article.originalContent ?? [])[i] ?? '',
          cardIndex: i,
        }));
        setSentences(fallbackSentences);
      }
    } catch (error) {
      console.error('獲取文章失敗:', error);
      toast.error('Unable to load article');
      router.push('/articles');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Play/Pause TTS
   */
  const togglePlayback = () => {
    if (!article) return;

    if (isPlaying) {
      // Pause playback
      stopSpeech();
      stopOpenAITTS();
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }
      setIsPlaying(false);
    } else {
      // Start playback
      playFromLine(currentLineIndex);
      setIsPlaying(true);
    }
  };

  /**
   * Play from specified line
   */
  const playFromLine = async (lineIndex: number) => {
    if (!article) return;

    // Cancel current playback
    stopSpeech();
    stopOpenAITTS();
    if (speechSynthesis.current?.speaking) {
      speechSynthesis.current.cancel();
    }

    // Get the text to speak (Chinese)
    const textToSpeak = article.translatedContent[lineIndex];
    if (!textToSpeak) return;

    try {
      // Set current line index
      setCurrentLineIndex(lineIndex);

      // Prefer Web Speech TTS (like chat/flashcards, better Cantonese support)
      if (ttsService.isSupported()) {
        console.log(`Article TTS: Playing line ${lineIndex + 1} with Web Speech TTS`);
        
        // Play using Web Speech TTS
        await speakCantonese(textToSpeak, {
          rate: playbackSpeed,
          lang: 'zh-HK' // Hong Kong Cantonese
        });
        
        // After playback finishes, play the next line
        if (lineIndex < article.translatedContent.length - 1) {
          setTimeout(() => playFromLine(lineIndex + 1), 500); // Brief pause
        } else {
          // Playback complete
          setIsPlaying(false);
          updateReadingProgress(article.translatedContent.length - 1);
        }
      } else if (isOpenAITTSAvailable()) {
        // Fallback to OpenAI TTS
        console.log(`Article TTS: Playing line ${lineIndex + 1} with OpenAI TTS`);
        
        // Play using OpenAI TTS
        await speakWithOpenAI(textToSpeak, {
          speed: playbackSpeed,
          voice: 'nova' // Voice suitable for Chinese
        });
        
        // After playback finishes, play the next line
        if (lineIndex < article.translatedContent.length - 1) {
          setTimeout(() => playFromLine(lineIndex + 1), 500); // Brief pause
        } else {
          // Playback complete
          setIsPlaying(false);
          updateReadingProgress(article.translatedContent.length - 1);
        }
      } else {
        // Final fallback to basic TTS
        console.log(`Article TTS: Using fallback TTS for line ${lineIndex + 1}`);
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'zh-HK'; // Try Hong Kong Chinese
        utterance.rate = playbackSpeed;
        
        utterance.onstart = () => {
          setCurrentLineIndex(lineIndex);
        };
        
        utterance.onend = () => {
          // Play the next line
          if (lineIndex < article.translatedContent.length - 1) {
            setTimeout(() => playFromLine(lineIndex + 1), 500);
          } else {
            // Playback complete
            setIsPlaying(false);
            updateReadingProgress(article.translatedContent.length - 1);
          }
        };
        
        utterance.onerror = (event) => {
          console.error('TTS 錯誤:', event);
          toast.error('Speech playback error');
          setIsPlaying(false);
        };

        currentUtterance.current = utterance;
        speechSynthesis.current?.speak(utterance);
      }
    } catch (error) {
      console.error('TTS 播放錯誤:', error);
      toast.error('Speech playback error');
      setIsPlaying(false);
    }
  };

  /**
   * Highlight the current word being played
   * Note: simplified version; a real implementation needs more complex logic
   */
  const highlightCurrentWord = (utterance: SpeechSynthesisUtterance, text: string) => {
    // Implement word-level highlighting here
    // Requires using the utterance boundary events
  };

  /**
   * Play a specific line on click
   */
  const playLine = async (lineIndex: number) => {
    if (!article) return;

    const textToSpeak = article.translatedContent[lineIndex];
    if (!textToSpeak) return;

    try {
      // Cancel current playback
      stopSpeech();
      stopOpenAITTS();
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }

      // Prefer Web Speech TTS (like chat/flashcards, better Cantonese support)
      if (ttsService.isSupported()) {
        console.log(`Article TTS: Playing single line ${lineIndex + 1} with Web Speech TTS`);
        await speakCantonese(textToSpeak, {
          rate: playbackSpeed,
          lang: 'zh-HK' // Hong Kong Cantonese
        });
      } else if (isOpenAITTSAvailable()) {
        // Fallback to OpenAI TTS
        console.log(`Article TTS: Playing single line ${lineIndex + 1} with OpenAI TTS`);
        await speakWithOpenAI(textToSpeak, {
          speed: playbackSpeed,
          voice: 'nova' // Voice suitable for Chinese
        });
      } else {
        // Final fallback to basic TTS
        console.log(`Article TTS: Using fallback TTS for single line ${lineIndex + 1}`);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'zh-HK'; // Try Hong Kong Chinese
        utterance.rate = playbackSpeed;
        speechSynthesis.current?.speak(utterance);
      }
    } catch (error) {
      console.error('TTS 播放錯誤:', error);
      toast.error('Speech playback error');
    }
  };

  /**
   * Change playback speed
   */
  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    
    // If currently playing, restart the current line
    if (isPlaying) {
      // Stop current playback and restart
      stopSpeech();
      stopOpenAITTS();
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }
      setTimeout(() => playFromLine(currentLineIndex), 100);
    }
  };

  /**
   * Show vocabulary definition
   */
  const showWordDefinition = (word: string) => {
    if (!article?.wordDefinitions) return;
    
    const definition = article.wordDefinitions[word];
    if (definition) {
      setSelectedWord(word);
      setWordDefinition(definition);
    }
  };

  /**
   * Update reading progress
   */
  const updateReadingProgress = async (position: number) => {
    // TODO: Call API to update reading progress
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f2ec' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Article does not exist
  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f2ec' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Article Not Found</h2>
          <button
            onClick={() => router.push('/articles')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Articles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f2ec' }}>
      {/* Article header (Figma-aligned) */}
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between h-[29px] mb-2">
          <h1 className="text-[24px] font-semibold tracking-[-0.48px] text-black truncate">
            {article.title}
          </h1>
          <div className="bg-[#5a5a5a] text-white h-[24px] px-[8px] py-[4px] rounded-[8px] flex items-center">
            <span className="text-[10px] leading-[14px]">To read</span>
          </div>
        </div>
        <div className="relative h-[40px] w-full">
          <div className="h-full flex items-center text-[14px] leading-[1.4] text-[#757575] overflow-hidden gap-1">
            {article.sourceUrl && (
              <>
                <span className="shrink-0">
                  {(() => { try { return new URL(article.sourceUrl!).hostname } catch { return null } })()}
                </span>
                <span className="shrink-0">-</span>
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline underline-offset-2"
                >
                  {article.sourceUrl}
                </a>
              </>
            )}
          </div>
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderBottom: '1px solid #f2e2c4' }} />
        </div>
      </div>

      {/* Article content (display each sentence as chat bubbles) */}
      <div className="max-w-[480px] mx-auto px-4 py-8">
        {/* Align narrow width and spacing with the chat page */}
        <div className="space-y-4">
          {sentences.map((s, idx) => (
            <ChatMessage
              key={idx}
              message={{
                id: String(idx),
                role: 'assistant',
                content: s.chinese,
                translation: s.english,
                timestamp: new Date(),
              }}
              showTranslation={showTranslation}
            />
          ))}
        </div>
      </div>

      {/* Vocabulary definition modal */}
      {selectedWord && wordDefinition && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedWord(null);
            setWordDefinition(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                {selectedWord}
              </h3>
              <button
                onClick={() => {
                  setSelectedWord(null);
                  setWordDefinition(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {wordDefinition.pinyin && (
              <div className="mb-3">
                <span className="text-sm text-gray-600">Pinyin:</span>
                <span className="text-lg">{wordDefinition.pinyin}</span>
              </div>
            )}
            
            {wordDefinition.english && (
              <div className="mb-3">
                <span className="text-sm text-gray-600">English:</span>
                <span className="text-lg">{wordDefinition.english}</span>
              </div>
            )}
            
            <button
              onClick={async () => {
                // Play pronunciation of a single character/word
                try {
                  // Prefer Web Speech TTS (like chat/flashcards, better Cantonese support)
                  if (ttsService.isSupported()) {
                    console.log(`Article TTS: Playing word "${selectedWord}" with Web Speech TTS`);
                    await speakCantonese(selectedWord, {
                      rate: 0.8, // Slower speed for learning
                      lang: 'zh-HK' // Hong Kong Cantonese
                    });
                  } else if (isOpenAITTSAvailable()) {
                    console.log(`Article TTS: Playing word "${selectedWord}" with OpenAI TTS`);
                    await speakWithOpenAI(selectedWord, {
                      speed: 0.8, // Slower speed for learning
                      voice: 'nova' // Voice suitable for Chinese
                    });
                  } else if (speechSynthesis.current) {
                    console.log(`Article TTS: Using fallback TTS for word "${selectedWord}"`);
                    const utterance = new SpeechSynthesisUtterance(selectedWord);
                    utterance.lang = 'zh-HK'; // Try Hong Kong Chinese
                    utterance.rate = 0.8; // Slower speed for learning
                    speechSynthesis.current.speak(utterance);
                  }
                } catch (error) {
                  console.error('TTS 播放錯誤:', error);
                  toast.error('Speech playback error');
                }
              }}
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-lg font-semibold hover:shadow-md transition-all"
            >
              🔊 Play Cantonese Pronunciation
            </button>
          </div>
        </div>
      )}

      {/* Floating action buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3">
        {/* Back to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          title="Back to top"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
        
        {/* Fullscreen mode */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          title="Fullscreen mode"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}