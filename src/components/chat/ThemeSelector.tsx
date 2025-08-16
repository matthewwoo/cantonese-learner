// src/components/chat/ThemeSelector.tsx
// Component for selecting chat themes and target vocabulary
// This teaches: Component composition, data structures, event handling

import React from 'react'
import { Button } from '@/components/ui/Button'

// Define available chat themes with their vocabulary
const CHAT_THEMES = {
  daily_conversation: {
    name: '日常對話 Daily Conversation',
    description: 'Basic greetings, small talk, everyday situations',
    icon: '💬',
    targetWords: ['你好', '多謝', '點樣', '食飯', '返屋企']
  },
  food_and_dining: {
    name: '飲食 Food & Dining',
    description: 'Ordering food, restaurant conversations, cooking',
    icon: '🍜',
    targetWords: ['食飯', '飲茶', '好味', '買嘢', '餐廳']
  },
  shopping: {
    name: '購物 Shopping',
    description: 'Market conversations, bargaining, buying items',
    icon: '🛍️',
    targetWords: ['買嘢', '幾多錢', '平啲', '貴', '唔要']
  },
  transportation: {
    name: '交通 Transportation',
    description: 'Getting around, asking for directions, public transport',
    icon: '🚌',
    targetWords: ['去邊度', '點去', '巴士', '地鐵', '的士']
  },
  work_study: {
    name: '工作學習 Work & Study',
    description: 'Professional situations, school conversations',
    icon: '💼',
    targetWords: ['返工', '讀書', '開會', '老師', '同事']
  },
  family_friends: {
    name: '家庭朋友 Family & Friends',
    description: 'Personal relationships, family gatherings',
    icon: '👨‍👩‍👧‍👦',
    targetWords: ['屋企人', '朋友', '爸爸', '媽媽', '見面']
  }
}

interface ThemeSelectorProps {
  selectedTheme: string
  onThemeSelect: (theme: string) => void
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selectedTheme, onThemeSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Loop through each theme and create a card */}
      {Object.entries(CHAT_THEMES).map(([themeKey, theme]) => (
        <div
          key={themeKey}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedTheme === themeKey
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => onThemeSelect(themeKey)}
        >
          {/* Theme header */}
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">{theme.icon}</span>
            <h4 className="font-semibold text-gray-900">{theme.name}</h4>
          </div>
          
          {/* Theme description */}
          <p className="text-sm text-gray-600 mb-3">
            {theme.description}
          </p>
          
          {/* Target vocabulary preview */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Target vocabulary:</p>
            <div className="flex flex-wrap gap-1">
              {theme.targetWords.map((word, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
          
          {/* Selection indicator */}
          <div className="flex justify-end">
            {selectedTheme === themeKey ? (
              <div className="text-blue-500 text-sm font-medium">
                ✓ Selected
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                Click to select
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Export the themes so other components can use them
export { CHAT_THEMES }
export default ThemeSelector