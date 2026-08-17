'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { speakCantonese, stopSpeech } from '@/utils/textToSpeech';
import ChatMessage from '@/components/chat/ChatMessage';
import { processArticleIntoSentences, type SentenceCard } from '@/utils/sentenceProcessor';
import { createClient } from '@/lib/supabase/client';
import { getArticleWithSession } from '@/lib/data/articles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArticleAudioPlayer,
  type ArticleAudioPlayerHandle,
} from '@/components/articles/article-audio-player';

interface Article {
  id: string;
  title: string;
  sourceUrl?: string | null;
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

  // Read-aloud: index of the block currently being read (null = not playing)
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const playerRef = useRef<ArticleAudioPlayerHandle | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // Vocabulary definition modal
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDefinition, setWordDefinition] = useState<any>(null);

  // Stop any lingering per-bubble speech when leaving the page
  useEffect(() => {
    return () => stopSpeech();
  }, []);

  // Highlight + scroll the block being read into view
  const handleActiveBlockChange = (index: number | null) => {
    setActiveBlock(index);
    if (index !== null) {
      document
        .getElementById(`sentence-${index}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Load article data
  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  /**
   * Fetch article content and reading session
   */
  const fetchArticle = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      const data = await getArticleWithSession(supabase, user.id, articleId);
      if (!data) throw new Error('獲取文章失敗');

      const originalContent = (data.article.originalContent as string[]) ?? [];
      const translatedContent = (data.article.translatedContent as string[]) ?? [];
      const loadedArticle: Article = {
        id: data.article.id,
        title: data.article.title,
        sourceUrl: data.article.sourceUrl,
        originalContent,
        translatedContent,
        wordDefinitions: (data.article.wordDefinitions as Record<string, any>) ?? {},
      };

      setArticle(loadedArticle);
      setReadingSession(data.readingSession);

      // Process article into sentence-level cards for chat-style bubbles
      try {
        const processed = processArticleIntoSentences(originalContent, translatedContent);
        setSentences(processed.sentences);
      } catch (e) {
        console.warn('Sentence processing failed, falling back to paragraph-level.', e);
        // Fallback: map paragraph pairs into pseudo-sentences
        const fallbackSentences: SentenceCard[] = translatedContent.map((cn: string, i: number) => ({
          chinese: cn,
          english: originalContent[i] ?? '',
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  // Article does not exist
  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h2>
          <Button
            onClick={() => router.push('/articles')}
            className="mt-4 px-6"
          >
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Article header (Figma-aligned) */}
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between h-[29px] mb-2">
          <h1
            lang="zh-HK"
            className="text-[24px] font-semibold tracking-[-0.48px] text-foreground truncate"
          >
            {article.title}
          </h1>
          <Badge className="h-[24px] px-[8px] py-[4px] rounded-sm">
            <span className="text-[10px] leading-[14px]">To read</span>
          </Badge>
        </div>
        <div className="relative h-[40px] w-full">
          <div className="h-full flex items-center text-[14px] leading-[1.4] text-muted-foreground overflow-hidden gap-1">
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
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none border-b border-border" />
        </div>
      </div>

      {/* Article content (display each sentence as chat bubbles).
          Extra bottom padding keeps the last bubbles above the player bar. */}
      <div className="max-w-[480px] mx-auto px-4 py-8 pb-24">
        {/* Align narrow width and spacing with the chat page */}
        <div className="space-y-4">
          {sentences.map((s, idx) => (
            <div
              key={idx}
              id={`sentence-${idx}`}
              // Tapping a bubble plays it alone — pause the read-aloud first
              onClickCapture={() => playerRef.current?.pause()}
              className={cn(
                'rounded-lg transition-all duration-300',
                activeBlock === idx &&
                  'ring-2 ring-primary/50 bg-accent/50 -mx-2 px-2 py-1'
              )}
            >
              <ChatMessage
                message={{
                  id: String(idx),
                  role: 'assistant',
                  content: s.chinese,
                  translation: s.english,
                  timestamp: new Date(),
                }}
                showTranslation={showTranslation}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Read-aloud player bar (sits above the bottom nav) */}
      <ArticleAudioPlayer
        ref={playerRef}
        sentences={sentences}
        onActiveBlockChange={handleActiveBlockChange}
        className="bottom-[84px] border-b"
      />

      {/* Vocabulary definition modal */}
      <Dialog
        open={!!selectedWord}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWord(null);
            setWordDefinition(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle lang="zh-HK" className="text-2xl font-bold text-foreground">
              {selectedWord}
            </DialogTitle>
          </DialogHeader>

          {wordDefinition?.pinyin && (
            <div className="mb-3">
              <span className="text-sm text-muted-foreground">Pinyin:</span>
              <span className="text-lg">{wordDefinition.pinyin}</span>
            </div>
          )}

          {wordDefinition?.english && (
            <div className="mb-3">
              <span className="text-sm text-muted-foreground">English:</span>
              <span className="text-lg">{wordDefinition.english}</span>
            </div>
          )}

          <Button
            onClick={async () => {
              // Play pronunciation of a single character/word.
              // speakCantonese handles Fish/Azure server TTS with Web Speech fallback.
              if (!selectedWord) return;
              try {
                playerRef.current?.pause();
                await speakCantonese(selectedWord);
              } catch (error) {
                console.error('TTS 播放錯誤:', error);
                toast.error('Speech playback error');
              }
            }}
            className="w-full mt-4 font-semibold"
          >
            🔊 Play Cantonese Pronunciation
          </Button>
        </DialogContent>
      </Dialog>

      {/* Floating action buttons (kept clear of the player bar + nav) */}
      <div className="fixed bottom-40 right-8 flex flex-col gap-3">
        {/* Back to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          title="Back to top"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          title="Fullscreen mode"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}