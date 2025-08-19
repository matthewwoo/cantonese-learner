'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CompletionScreenProps {
  sessionStats: {
    totalCards: number;
    completedCards: number;
    cardsFlipped: number;
    totalTime: number; // in seconds
    averageTimePerCard: number; // in seconds
  };
  articleTitle: string;
  onRetry: () => void;
  onBackToArticles: () => void;
}

export default function CompletionScreen({
  sessionStats,
  articleTitle,
  onRetry,
  onBackToArticles,
}: CompletionScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const router = useRouter();

  // Trigger animations
  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowStats(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate achievements
  const perfectCards = sessionStats.totalCards - sessionStats.cardsFlipped;
  const perfectPercentage = Math.round((perfectCards / sessionStats.totalCards) * 100);
  
  const getAchievement = () => {
    if (perfectPercentage === 100) return { title: 'Perfect! 🏆', color: 'text-yellow-600' };
    if (perfectPercentage >= 80) return { title: 'Excellent! 🌟', color: 'text-blue-600' };
    if (perfectPercentage >= 60) return { title: 'Good Job! 👍', color: 'text-green-600' };
    return { title: 'Keep Learning! 📚', color: 'text-purple-600' };
  };

  const achievement = getAchievement();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-10">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              >
                <div className={`w-2 h-2 rounded-full ${
                  ['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-pink-400', 'bg-purple-400'][Math.floor(Math.random() * 5)]
                }`} />
              </div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className={`bg-white rounded-3xl shadow-2xl p-8 text-center transition-all duration-1000 ${
          showStats ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
        }`}>
          {/* Achievement Badge */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              🎉
            </div>
            <h1 className={`text-3xl font-bold ${achievement.color} mb-2`}>
              {achievement.title}
            </h1>
            <p className="text-gray-600 text-lg">
              You've completed "{articleTitle}"!
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600">
                {sessionStats.completedCards}
              </div>
              <div className="text-sm text-blue-600">Cards Completed</div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600">
                {perfectCards}
              </div>
              <div className="text-sm text-green-600">Perfect Cards</div>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(sessionStats.totalTime / 60)}
              </div>
              <div className="text-sm text-purple-600">Minutes Spent</div>
            </div>
            
            <div className="bg-orange-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-orange-600">
                {perfectPercentage}%
              </div>
              <div className="text-sm text-orange-600">Perfect Score</div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Performance Insights
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-600">Average time per card:</span>
                <span className="font-medium">{Math.round(sessionStats.averageTimePerCard)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cards that needed translation:</span>
                <span className="font-medium">{sessionStats.cardsFlipped}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reading speed:</span>
                <span className="font-medium">
                  {Math.round(sessionStats.totalCards / (sessionStats.totalTime / 60))} cards/min
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onRetry}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
            
            <button
              onClick={onBackToArticles}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              More Articles
            </button>
          </div>

          {/* Motivational Message */}
          <div className="mt-6 text-gray-500 text-sm">
            {perfectPercentage === 100 && (
              <p>🎯 Perfect score! You're mastering Cantonese!</p>
            )}
            {perfectPercentage >= 80 && perfectPercentage < 100 && (
              <p>🌟 Almost perfect! Keep up the great work!</p>
            )}
            {perfectPercentage >= 60 && perfectPercentage < 80 && (
              <p>👍 Good progress! Practice makes perfect!</p>
            )}
            {perfectPercentage < 60 && (
              <p>📚 Keep practicing! Every session makes you better!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
