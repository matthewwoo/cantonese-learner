import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export interface SentenceCard {
  chinese: string;
  english: string;
  audioUrl?: string;
  cardIndex: number;
}

export interface ReadingSession {
  id: string;
  currentCardIndex: number;
  totalCards: number;
  completedCards: number[];
  autoPlayTTS: boolean;
  ttsSpeed: number;
  showTranslation: boolean;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
  cardsFlipped: number[];
  audioReplays?: Record<string, number>;
  timePerCard?: Record<string, number>;
  article: {
    id: string;
    title: string;
    sentences: SentenceCard[];
    sentenceCount: number;
    difficulty: string;
    estimatedMinutes: number;
  };
}

export interface SessionProgress {
  completedCards: number;
  totalCards: number;
  progressPercentage: number;
  cardsFlipped: number;
  isCompleted: boolean;
}

export function useReadingSession(sessionId: string) {
  const router = useRouter();
  
  // Session state
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Card state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [audioReplayCount, setAudioReplayCount] = useState(0);
  
  // Progress tracking
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  
  // Refs for tracking
  const cardStartTimeRef = useRef<number>(Date.now());
  const audioReplayCountRef = useRef<number>(0);

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reading-sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load session');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load session');
      }
      
      setSession(data.session);
      setCurrentCardIndex(data.session.currentCardIndex);
      setProgress({
        completedCards: data.session.completedCards.length,
        totalCards: data.session.totalCards,
        progressPercentage: Math.round((data.session.completedCards.length / data.session.totalCards) * 100),
        cardsFlipped: data.session.cardsFlipped.length,
        isCompleted: !!data.session.completedAt,
      });
      
      // Reset card state
      setIsCardFlipped(false);
      setCardStartTime(Date.now());
      setAudioReplayCount(0);
      cardStartTimeRef.current = Date.now();
      audioReplayCountRef.current = 0;
      
    } catch (err) {
      console.error('Failed to load reading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
      toast.error('Failed to load reading session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Load session on mount
  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId, loadSession]);

  // Update session progress
  const updateSessionProgress = useCallback(async (updates: Partial<ReadingSession>) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/reading-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update session');
      }
      
      const data = await response.json();
      if (data.success) {
        setSession(data.session);
      }
    } catch (err) {
      console.error('Failed to update session progress:', err);
      toast.error('Failed to save progress');
    }
  }, [session, sessionId]);

  // Complete current card
  const completeCard = useCallback(async () => {
    if (!session) return;
    
    try {
      const timeSpent = Math.round((Date.now() - cardStartTimeRef.current) / 1000);
      
      const response = await fetch(`/api/reading-sessions/${sessionId}/complete-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardIndex: currentCardIndex,
          timeSpent,
          wasFlipped: isCardFlipped,
          audioReplayCount: audioReplayCountRef.current,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete card');
      }
      
      const data = await response.json();
      if (data.success) {
        setSession(data.session);
        setProgress(data.progress);
        
        // Move to next card or complete session
        if (data.progress.isCompleted) {
          toast.success('Reading session completed! 🎉');
          // Could navigate to completion screen here
        } else {
          setCurrentCardIndex(data.nextCardIndex);
          setIsCardFlipped(false);
          setCardStartTime(Date.now());
          setAudioReplayCount(0);
          cardStartTimeRef.current = Date.now();
          audioReplayCountRef.current = 0;
        }
      }
    } catch (err) {
      console.error('Failed to complete card:', err);
      toast.error('Failed to complete card');
    }
  }, [session, sessionId, currentCardIndex, isCardFlipped]);

  // Navigate to next card
  const nextCard = useCallback(() => {
    if (!session || currentCardIndex >= session.totalCards - 1) return;
    
    completeCard();
  }, [session, currentCardIndex, completeCard]);

  // Navigate to previous card
  const previousCard = useCallback(() => {
    if (!session || currentCardIndex <= 0) return;
    
    setCurrentCardIndex(currentCardIndex - 1);
    setIsCardFlipped(false);
    setCardStartTime(Date.now());
    setAudioReplayCount(0);
    cardStartTimeRef.current = Date.now();
    audioReplayCountRef.current = 0;
  }, [session, currentCardIndex]);

  // Flip card to show translation
  const flipCard = useCallback(() => {
    setIsCardFlipped(true);
  }, []);

  // Track audio replay
  const trackAudioReplay = useCallback(() => {
    setAudioReplayCount(prev => prev + 1);
    audioReplayCountRef.current += 1;
  }, []);

  // Update session settings
  const updateSettings = useCallback(async (settings: {
    autoPlayTTS?: boolean;
    ttsSpeed?: number;
    showTranslation?: boolean;
  }) => {
    await updateSessionProgress(settings);
  }, [updateSessionProgress]);

  // Exit session
  const exitSession = useCallback(async () => {
    if (!session) return;
    
    try {
      // Save current progress before exiting
      const timeSpent = Math.round((Date.now() - cardStartTimeRef.current) / 1000);
      
      await fetch(`/api/reading-sessions/${sessionId}/complete-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardIndex: currentCardIndex,
          timeSpent,
          wasFlipped: isCardFlipped,
          audioReplayCount: audioReplayCountRef.current,
        }),
      });
      
      toast.success('Progress saved!');
      router.push(`/articles/${session.article.id}`);
    } catch (err) {
      console.error('Failed to save progress on exit:', err);
      toast.error('Failed to save progress');
      router.push(`/articles/${session.article.id}`);
    }
  }, [session, sessionId, currentCardIndex, isCardFlipped, router]);

  // Get current card data
  const currentCard = session?.article.sentences[currentCardIndex];

  return {
    // State
    session,
    isLoading,
    error,
    currentCard,
    currentCardIndex,
    isCardFlipped,
    progress,
    
    // Actions
    loadSession,
    nextCard,
    previousCard,
    flipCard,
    completeCard,
    trackAudioReplay,
    updateSettings,
    exitSession,
    
    // Computed values
    hasNextCard: session ? currentCardIndex < session.totalCards - 1 : false,
    hasPreviousCard: currentCardIndex > 0,
    isCompleted: progress?.isCompleted || false,
  };
}
