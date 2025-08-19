'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useReadingSession } from '@/hooks/useReadingSession';
import SentenceCard from '@/components/reading-session/SentenceCard';
import ProgressBar from '@/components/reading-session/ProgressBar';
import SessionControls from '@/components/reading-session/SessionControls';
import CompletionScreen from '@/components/reading-session/CompletionScreen';

export default function ReadingSessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = params.id as string;
  const sessionId = searchParams.get('sessionId');
  
  const [showCompletion, setShowCompletion] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Use the reading session hook
  const {
    session,
    isLoading,
    error,
    currentCard,
    currentCardIndex,
    isCardFlipped,
    progress,
    hasNextCard,
    hasPreviousCard,
    isCompleted,
    loadSession,
    nextCard,
    previousCard,
    flipCard,
    completeCard,
    trackAudioReplay,
    updateSettings,
    exitSession,
  } = useReadingSession(sessionId || '');

  // Start new session if no sessionId provided
  useEffect(() => {
    if (!sessionId && articleId) {
      startNewSession();
    }
  }, [sessionId, articleId]);

  // Track session completion
  useEffect(() => {
    if (isCompleted && !showCompletion) {
      setShowCompletion(true);
    }
  }, [isCompleted, showCompletion]);

  // Start a new reading session
  const startNewSession = async () => {
    try {
      // First, ensure article is processed into sentences
      const processResponse = await fetch(`/api/articles/${articleId}/process-sentences`, {
        method: 'POST',
      });
      
      if (!processResponse.ok) {
        throw new Error('Failed to process article');
      }

      // Create new reading session
      const sessionResponse = await fetch('/api/reading-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          autoPlayTTS: true,
          ttsSpeed: 1.0,
          showTranslation: false,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const data = await sessionResponse.json();
      if (data.success) {
        // Redirect to session with sessionId
        router.push(`/articles/${articleId}/reading-session?sessionId=${data.sessionId}`);
      }
    } catch (error) {
      console.error('Failed to start reading session:', error);
      toast.error('Failed to start reading session');
      router.push(`/articles/${articleId}`);
    }
  };

  // Handle card completion
  const handleCardComplete = () => {
    completeCard();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft' && hasPreviousCard) {
        event.preventDefault();
        previousCard();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasPreviousCard, previousCard]);

  // Handle card flip
  const handleCardFlip = (flipped: boolean) => {
    flipCard();
  };

  // Handle audio replay
  const handleAudioReplay = () => {
    trackAudioReplay();
  };

  // Handle settings updates
  const handleSettingsUpdate = async (settings: {
    autoPlayTTS?: boolean;
    ttsSpeed?: number;
    showTranslation?: boolean;
  }) => {
    await updateSettings(settings);
  };

  // Handle retry session
  const handleRetry = () => {
    setShowCompletion(false);
    // Reset session by reloading
    loadSession();
  };

  // Handle back to articles
  const handleBackToArticles = () => {
    router.push('/articles');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading reading session...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Session Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/articles/${articleId}`)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Article
          </button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (showCompletion && session) {
    const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);
    const averageTimePerCard = session.timePerCard 
      ? Object.values(session.timePerCard).reduce((a, b) => a + b, 0) / Object.values(session.timePerCard).length
      : totalTime / session.totalCards;

    return (
      <CompletionScreen
        sessionStats={{
          totalCards: session.totalCards,
          completedCards: session.completedCards.length,
          cardsFlipped: session.cardsFlipped.length,
          totalTime,
          averageTimePerCard,
        }}
        articleTitle={session.article.title}
        onRetry={handleRetry}
        onBackToArticles={handleBackToArticles}
      />
    );
  }

  // Main session interface
  if (!session || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No Session Data</h2>
          <button
            onClick={() => router.push(`/articles/${articleId}`)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Article
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={exitSession}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Exit
              </button>
              <h1 className="text-xl font-bold text-gray-800 truncate">
                {session.article.title}
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {session.article.difficulty} • ~{session.article.estimatedMinutes} min
            </div>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            completedCards={progress?.completedCards || 0}
            totalCards={session.totalCards}
            currentCardIndex={currentCardIndex}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card Area */}
          <div className="lg:col-span-2 flex items-center justify-center min-h-[600px]">
            <SentenceCard
              chinese={currentCard.chinese}
              english={currentCard.english}
              cardNumber={currentCardIndex + 1}
              totalCards={session.totalCards}
              autoPlayTTS={session.autoPlayTTS}
              ttsSpeed={session.ttsSpeed}
              onComplete={handleCardComplete}
              onFlip={handleCardFlip}
              onReplay={handleAudioReplay}
            />
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-1">
            <SessionControls
              hasPreviousCard={hasPreviousCard}
              hasNextCard={hasNextCard}
              autoPlayTTS={session.autoPlayTTS}
              ttsSpeed={session.ttsSpeed}
              showTranslation={session.showTranslation}
              onPrevious={previousCard}
              onNext={nextCard}
              onToggleAutoPlay={() => handleSettingsUpdate({ autoPlayTTS: !session.autoPlayTTS })}
              onSpeedChange={(speed) => handleSettingsUpdate({ ttsSpeed: speed })}
              onToggleTranslation={() => handleSettingsUpdate({ showTranslation: !session.showTranslation })}
              onExit={exitSession}
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Removed extra buttons since arrow keys and "Got it!" button provide navigation */}
    </div>
  );
}
