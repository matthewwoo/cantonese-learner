'use client';

interface ProgressBarProps {
  completedCards: number;
  totalCards: number;
  currentCardIndex: number;
  onCardClick?: (cardIndex: number) => void;
}

export default function ProgressBar({
  completedCards,
  totalCards,
  currentCardIndex,
  onCardClick,
}: ProgressBarProps) {
  const progressPercentage = (completedCards / totalCards) * 100;

  return (
    <div className="w-full">
      {/* Progress Text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Progress: {completedCards} / {totalCards} cards
        </span>
        <span className="text-sm font-medium text-gray-700">
          {Math.round(progressPercentage)}%
        </span>
      </div>

      {/* Main Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Card Segments */}
      <div className="flex gap-1">
        {Array.from({ length: totalCards }, (_, index) => {
          let cardStatus: 'completed' | 'current' | 'upcoming' = 'upcoming';
          
          if (index < completedCards) {
            cardStatus = 'completed';
          } else if (index === currentCardIndex) {
            cardStatus = 'current';
          }

          return (
            <button
              key={index}
              onClick={() => onCardClick?.(index)}
              disabled={!onCardClick}
              className={`flex-1 h-2 rounded-full transition-all duration-200 ${
                onCardClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              } ${
                cardStatus === 'completed'
                  ? 'bg-green-500'
                  : cardStatus === 'current'
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
              title={`Card ${index + 1}${cardStatus === 'completed' ? ' (Completed)' : cardStatus === 'current' ? ' (Current)' : ''}`}
            />
          );
        })}
      </div>

      {/* Status Indicators */}
      <div className="flex justify-center gap-6 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
}
