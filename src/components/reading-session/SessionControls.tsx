'use client';

interface SessionControlsProps {
  hasPreviousCard: boolean;
  hasNextCard: boolean;
  autoPlayTTS: boolean;
  ttsSpeed: number;
  showTranslation: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleAutoPlay: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleTranslation: () => void;
  onExit: () => void;
}

const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2.0, label: '2x' },
];

export default function SessionControls({
  hasPreviousCard,
  hasNextCard,
  autoPlayTTS,
  ttsSpeed,
  showTranslation,
  onPrevious,
  onNext,
  onToggleAutoPlay,
  onSpeedChange,
  onToggleTranslation,
  onExit,
}: SessionControlsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onPrevious}
          disabled={!hasPreviousCard}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            hasPreviousCard
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <button
          onClick={onNext}
          disabled={!hasNextCard}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            hasNextCard
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Settings Controls */}
      <div className="space-y-4">
        {/* TTS Speed Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            TTS Speed
          </label>
          <div className="flex gap-2">
            {speedOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSpeedChange(option.value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  ttsSpeed === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-play TTS Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Auto-play TTS
          </label>
          <button
            onClick={onToggleAutoPlay}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoPlayTTS ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoPlayTTS ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Show Translation Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Show Translation
          </label>
          <button
            onClick={onToggleTranslation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showTranslation ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showTranslation ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Exit Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onExit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Exit Session
        </button>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>
          <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">←</kbd> Previous •{' '}
          <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">→</kbd> Next •{' '}
          <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Space</kbd> Flip •{' '}
          <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">R</kbd> Replay
        </p>
      </div>
    </div>
  );
}
