'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { speakCantonese, stopSpeech } from '@/utils/textToSpeech';
import ChatMessage from '@/components/chat/ChatMessage';
import { processArticleIntoSentences, type SentenceCard } from '@/utils/sentenceProcessor';
import { createClient } from '@/lib/supabase/client';
import { getArticleWithSession, updateReadingProgress } from '@/lib/data/articles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/spinner';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { displayStatus, type GenerationStatus } from '@/lib/generation';
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
  // An article is readable only once translation has finished; it can be
  // reached by deep link or a stale tab before then.
  status: GenerationStatus;
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

  // Reading progress: the furthest sentence that has been on screen (1-based
  // count, not an index) and the last value written to the reading session.
  // Refs rather than state — these change on every scroll frame and must never
  // re-render the article.
  const furthestReadRef = useRef(0);
  const savedPositionRef = useRef(0);

  // Read-aloud: index of the block currently being read (null = not playing)
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
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
  const handleActiveBlockChange = useCallback((index: number | null) => {
    setActiveBlock(index);
    if (index === null) return;

    const el = document.getElementById(`sentence-${index}`);
    if (!el) return;

    // Only scroll when the block isn't already comfortably on screen. Without
    // this, tapping a visible bubble to set the start point would yank the
    // page to re-centre it — the reader stays put and only follows along when
    // sequential playback runs off the bottom. Margins clear the header and
    // the player bar + bottom nav.
    const rect = el.getBoundingClientRect();
    const inView = rect.top >= 72 && rect.bottom <= window.innerHeight - 160;
    if (!inView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlayerPlaying(playing);
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
        status: displayStatus(data.article),
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

  // Seed the high-water mark from the session so re-opening an article can
  // only ever move progress forward.
  useEffect(() => {
    const stored = readingSession?.currentPosition ?? 0;
    savedPositionRef.current = stored;
    furthestReadRef.current = Math.max(furthestReadRef.current, stored);
  }, [readingSession?.id, readingSession?.currentPosition]);

  /**
   * Track how far the learner has actually got. An observer over the sentence
   * bubbles catches silent reading, which is the common case; it also covers
   * the read-aloud player for free, since that scrolls each active block into
   * view as it goes.
   */
  useEffect(() => {
    if (sentences.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.sentenceIndex);
          if (Number.isNaN(index)) continue;
          furthestReadRef.current = Math.max(furthestReadRef.current, index + 1);
        }
      },
      // Half the bubble visible counts as reached — a sentence clipped at the
      // bottom edge on the way past shouldn't count.
      { threshold: 0.5 }
    );

    sentences.forEach((_, index) => {
      const el = document.getElementById(`sentence-${index}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sentences]);

  /**
   * Persist progress periodically, when the app goes to the background, and on
   * the way out — not on every scroll, which would be a write per frame.
   */
  useEffect(() => {
    const sessionId = readingSession?.id;
    if (!sessionId) return;

    const save = () => {
      const position = furthestReadRef.current;
      if (position <= savedPositionRef.current) return;
      savedPositionRef.current = position;
      updateReadingProgress(createClient(), sessionId, position).catch((error) => {
        // Progress is best-effort — a failed save shouldn't interrupt reading,
        // and the next flush retries from the same high-water mark.
        console.error('Failed to save reading progress', error);
        savedPositionRef.current = Math.min(savedPositionRef.current, position - 1);
      });
    };

    const onHidden = () => {
      if (document.visibilityState === 'hidden') save();
    };

    const timer = setInterval(save, 5000);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHidden);
      save();
    };
  }, [readingSession?.id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  // Still being translated in the background — the reader would render an
  // empty page over `translated_content: []`.
  if (article && article.status !== 'ready') {
    const failed = article.status === 'failed';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{article.title}</h2>
          {failed ? (
            <p className="text-muted-foreground">
              We couldn&apos;t translate this article. Delete it from your list and try again.
            </p>
          ) : (
            <ShimmeringText text="Translating…" className="text-[16px] block" />
          )}
          <Button onClick={() => router.push('/articles')} className="mt-6 px-6">
            Back to Articles
          </Button>
        </div>
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
              data-sentence-index={idx}
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
                // Tapping a bubble moves the read-aloud start point here and
                // carries on through the rest of the article, instead of
                // firing a one-off TTS clip the player knows nothing about.
                onPlayRequest={() => playerRef.current?.toggleBlock(idx)}
                isPlaying={isPlayerPlaying && activeBlock === idx}
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
        onPlayingChange={handlePlayingChange}
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
              // speakCantonese handles MiniMax server TTS with Web Speech fallback.
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
    </div>
  );
}