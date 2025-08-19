'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ttsService, speakCantonese, stopSpeech } from '@/utils/textToSpeech';
import { speakAndPlayCantonese as speakWithOpenAI, stopOpenAITTS, isOpenAITTSAvailable } from '@/utils/openaiTTS';

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
 * 文章閱讀頁面
 * 提供 TTS、高亮顯示、翻譯切換等功能
 */
export default function ArticleReadingPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  // 狀態管理
  const [article, setArticle] = useState<Article | null>(null);
  const [readingSession, setReadingSession] = useState<ReadingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 閱讀控制
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // 詞彙定義彈窗
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDefinition, setWordDefinition] = useState<any>(null);
  
  // TTS 相關
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // 初始化語音合成
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
    
    // 清理函數
    return () => {
      stopSpeech(); // Stop any ongoing Web Speech TTS
      stopOpenAITTS(); // Stop any ongoing OpenAI TTS
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }
    };
  }, []);

  // 載入文章數據
  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  /**
   * 獲取文章內容和閱讀會話
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
      setShowTranslation(data.readingSession.showTranslation);
      setPlaybackSpeed(data.readingSession.readingSpeed);
    } catch (error) {
      console.error('獲取文章失敗:', error);
      toast.error('Unable to load article');
      router.push('/articles');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 播放/暫停 TTS
   */
  const togglePlayback = () => {
    if (!article) return;

    if (isPlaying) {
      // 暫停播放
      stopSpeech();
      stopOpenAITTS();
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }
      setIsPlaying(false);
    } else {
      // 開始播放
      playFromLine(currentLineIndex);
      setIsPlaying(true);
    }
  };

  /**
   * 從指定行開始播放
   */
  const playFromLine = async (lineIndex: number) => {
    if (!article) return;

    // 取消當前播放
    stopSpeech();
    stopOpenAITTS();
    if (speechSynthesis.current?.speaking) {
      speechSynthesis.current.cancel();
    }

    // 獲取要播放的文本（中文）
    const textToSpeak = article.translatedContent[lineIndex];
    if (!textToSpeak) return;

    try {
      // 設置當前行索引
      setCurrentLineIndex(lineIndex);

      // 優先使用 Web Speech TTS (像 chat/flashcards 一樣，更好的 Cantonese 支持)
      if (ttsService.isSupported()) {
        console.log(`Article TTS: Playing line ${lineIndex + 1} with Web Speech TTS`);
        
        // 使用 Web Speech TTS 播放
        await speakCantonese(textToSpeak, {
          rate: playbackSpeed,
          lang: 'zh-HK' // Hong Kong Cantonese
        });
        
        // 播放完成後，播放下一行
        if (lineIndex < article.translatedContent.length - 1) {
          setTimeout(() => playFromLine(lineIndex + 1), 500); // 短暫停頓
        } else {
          // 播放完成
          setIsPlaying(false);
          updateReadingProgress(article.translatedContent.length - 1);
        }
      } else if (isOpenAITTSAvailable()) {
        // 回退到 OpenAI TTS
        console.log(`Article TTS: Playing line ${lineIndex + 1} with OpenAI TTS`);
        
        // 使用 OpenAI TTS 播放
        await speakWithOpenAI(textToSpeak, {
          speed: playbackSpeed,
          voice: 'nova' // 適合中文的語音
        });
        
        // 播放完成後，播放下一行
        if (lineIndex < article.translatedContent.length - 1) {
          setTimeout(() => playFromLine(lineIndex + 1), 500); // 短暫停頓
        } else {
          // 播放完成
          setIsPlaying(false);
          updateReadingProgress(article.translatedContent.length - 1);
        }
      } else {
        // 最後回退到基本 TTS
        console.log(`Article TTS: Using fallback TTS for line ${lineIndex + 1}`);
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'zh-HK'; // 嘗試使用香港中文
        utterance.rate = playbackSpeed;
        
        utterance.onstart = () => {
          setCurrentLineIndex(lineIndex);
        };
        
        utterance.onend = () => {
          // 播放下一行
          if (lineIndex < article.translatedContent.length - 1) {
            setTimeout(() => playFromLine(lineIndex + 1), 500);
          } else {
            // 播放完成
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
   * 高亮當前播放的詞彙
   * 注意：這是簡化版本，實際實現需要更複雜的邏輯
   */
  const highlightCurrentWord = (utterance: SpeechSynthesisUtterance, text: string) => {
    // 這裡可以實現詞彙級別的高亮
    // 需要結合 utterance 的 boundary 事件
  };

  /**
   * 點擊某一行播放
   */
  const playLine = async (lineIndex: number) => {
    if (!article) return;

    const textToSpeak = article.translatedContent[lineIndex];
    if (!textToSpeak) return;

    try {
      // 取消當前播放
      stopSpeech();
      stopOpenAITTS();
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }

      // 優先使用 Web Speech TTS (像 chat/flashcards 一樣，更好的 Cantonese 支持)
      if (ttsService.isSupported()) {
        console.log(`Article TTS: Playing single line ${lineIndex + 1} with Web Speech TTS`);
        await speakCantonese(textToSpeak, {
          rate: playbackSpeed,
          lang: 'zh-HK' // Hong Kong Cantonese
        });
      } else if (isOpenAITTSAvailable()) {
        // 回退到 OpenAI TTS
        console.log(`Article TTS: Playing single line ${lineIndex + 1} with OpenAI TTS`);
        await speakWithOpenAI(textToSpeak, {
          speed: playbackSpeed,
          voice: 'nova' // 適合中文的語音
        });
      } else {
        // 最後回退到基本 TTS
        console.log(`Article TTS: Using fallback TTS for single line ${lineIndex + 1}`);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'zh-HK'; // 嘗試使用香港中文
        utterance.rate = playbackSpeed;
        speechSynthesis.current?.speak(utterance);
      }
    } catch (error) {
      console.error('TTS 播放錯誤:', error);
      toast.error('Speech playback error');
    }
  };

  /**
   * 更改播放速度
   */
  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    
    // 如果正在播放，重新開始當前行
    if (isPlaying) {
      // 停止當前播放並重新開始
      stopSpeech();
      stopOpenAITTS();
      if (speechSynthesis.current?.speaking) {
        speechSynthesis.current.cancel();
      }
      setTimeout(() => playFromLine(currentLineIndex), 100);
    }
  };

  /**
   * 顯示詞彙定義
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
   * 更新閱讀進度
   */
  const updateReadingProgress = async (position: number) => {
    // TODO: 調用 API 更新閱讀進度
  };

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // 文章不存在
  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50">
      {/* 頂部控制欄 */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/articles')}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-800 truncate mx-4">
              {article.title}
            </h1>
            <div className="flex items-center gap-2">
              {/* Start Reading Session Button */}
              <button
                onClick={() => router.push(`/articles/${articleId}/reading-session`)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Reading Session
              </button>
              
              {/* 顯示/隱藏翻譯 */}
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  showTranslation 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {showTranslation ? 'Hide English' : 'Show English'}
              </button>
            </div>
          </div>

          {/* 播放控制 */}
          <div className="flex items-center justify-center gap-4">
            {/* 播放/暫停按鈕 */}
            <button
              onClick={togglePlayback}
              className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full flex items-center justify-center hover:shadow-lg transition-shadow"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>

            {/* 速度控制 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Speed:</span>
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => changeSpeed(speed)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* 進度指示器 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {currentLineIndex + 1} / {article.translatedContent.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 文章內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {article.translatedContent.map((chineseLine, index) => {
            const englishLine = article.originalContent[index];
            const isCurrentLine = index === currentLineIndex && isPlaying;
            
            return (
              <div
                key={index}
                className={`mb-6 p-4 rounded-lg transition-all cursor-pointer ${
                  isCurrentLine
                    ? 'bg-blue-50 border-2 border-blue-400 shadow-md'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => playLine(index)}
              >
                {/* 中文行 */}
                <div
                  className={`text-lg leading-relaxed mb-2 ${
                    isCurrentLine ? 'text-blue-900 font-medium' : 'text-gray-800'
                  }`}
                >
                  {chineseLine.split('').map((char, charIndex) => {
                    // 檢查是否為中文字符
                    const isChinese = /[\u4e00-\u9fff]/.test(char);
                    
                    return (
                      <span
                        key={charIndex}
                        className={isChinese ? 'hover:bg-yellow-200 cursor-pointer transition-colors' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isChinese) {
                            showWordDefinition(char);
                          }
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
                
                {/* 英文翻譯 */}
                {showTranslation && englishLine && (
                  <div className="text-sm text-gray-500 italic">
                    {englishLine}
                  </div>
                )}
                
                {/* 行號和播放按鈕 */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    Line {index + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playLine(index);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                    title="Play this line"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 詞彙定義彈窗 */}
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
                // 播放單個字的發音
                try {
                  // 優先使用 Web Speech TTS (像 chat/flashcards 一樣，更好的 Cantonese 支持)
                  if (ttsService.isSupported()) {
                    console.log(`Article TTS: Playing word "${selectedWord}" with Web Speech TTS`);
                    await speakCantonese(selectedWord, {
                      rate: 0.8, // 較慢的速度以便學習
                      lang: 'zh-HK' // Hong Kong Cantonese
                    });
                  } else if (isOpenAITTSAvailable()) {
                    console.log(`Article TTS: Playing word "${selectedWord}" with OpenAI TTS`);
                    await speakWithOpenAI(selectedWord, {
                      speed: 0.8, // 較慢的速度以便學習
                      voice: 'nova' // 適合中文的語音
                    });
                  } else if (speechSynthesis.current) {
                    console.log(`Article TTS: Using fallback TTS for word "${selectedWord}"`);
                    const utterance = new SpeechSynthesisUtterance(selectedWord);
                    utterance.lang = 'zh-HK'; // 嘗試使用香港中文
                    utterance.rate = 0.8; // 較慢的速度以便學習
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

      {/* 浮動操作按鈕 */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3">
        {/* 跳到頂部 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          title="Back to top"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
        
        {/* 全屏模式 */}
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