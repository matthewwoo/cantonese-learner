// src/components/flashcards/StudySession.tsx
// Interactive flashcard study component with spaced repetition

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ResponseQuality } from "@/utils/spaced-repetition"
import { toast } from "react-hot-toast"
import QuestionCard from "./QuestionCard"

// Types for study session data
interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation?: string
  exampleSentenceEnglish?: string | null
  exampleSentenceChinese?: string | null
}

interface StudyCard {
  id: string
  position: number
  flashcard: Flashcard
  wasCorrect: boolean | null
}

interface StudySessionData {
  id: string
  totalCards: number
  flashcardSetName: string
  theme: string
  studyCards: StudyCard[]
}

interface StudySessionProps {
  studySessionData: StudySessionData
  onSessionComplete: () => void
}

export default function StudySession({ studySessionData, onSessionComplete }: StudySessionProps) {
  // State for current card and session progress
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [answeredCards, setAnsweredCards] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)

  // Get current card
  const currentCard = studySessionData.studyCards[currentCardIndex]
  const isLastCard = currentCardIndex === studySessionData.studyCards.length - 1

  // Start timing when component mounts or new card is shown
  useEffect(() => {
    setStartTime(new Date())
  }, [currentCardIndex])


  // Handle user response to flashcard
  const handleResponse = async (quality: ResponseQuality) => {
    if (!currentCard || !startTime) return

    setIsSubmitting(true)

    try {
      // Calculate response time
      const responseTime = Date.now() - startTime.getTime()

      // Send response to API
      const response = await fetch('/api/study/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studyCardId: currentCard.id,
          responseQuality: quality,
          responseTime,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record response')
      }

      const data = await response.json()

      // Update local state
      setAnsweredCards(data.sessionProgress.answered)

      // Move to next card or complete session
      if (isLastCard || data.sessionProgress.isCompleted) {
        // Session completed
        toast.success(`Study session completed! You studied ${answeredCards + 1} cards.`)
        onSessionComplete()
      } else {
        // Move to next card
        setCurrentCardIndex(prev => prev + 1)
        toast.success(getResponseFeedback(quality))
      }

    } catch (error) {
      console.error('Error recording response:', error)
      toast.error('Failed to record response')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get encouraging feedback based on response quality
  const getResponseFeedback = (quality: ResponseQuality): string => {
    switch (quality) {
      case ResponseQuality.EASY:
        return "Perfect! 完美! That was easy!"
      case ResponseQuality.GOOD:
        return "Good job! 好! You got it right!"
      case ResponseQuality.HARD:
        return "Correct but difficult. Keep practicing!"
      case ResponseQuality.INCORRECT:
        return "Not quite right. You'll get it next time!"
      case ResponseQuality.BLACKOUT:
        return "No worries! Learning takes time."
      default:
        return "Response recorded!"
    }
  }


  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading next card...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f2ec] relative">
      {/* Header */}
      <div className="bg-[rgba(255,252,249,0.6)] backdrop-blur-[10px] h-[72px] relative">
        <div className="absolute border-[#f2e2c4] border-b inset-0 pointer-events-none" />
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-center bg-cover bg-no-repeat" 
             style={{ backgroundImage: "url('http://localhost:3845/assets/fdb3a6be3d610c36b9af162f236678b083a346db.png')" }} />
        <div className="absolute right-3.5 top-6 w-[30px] h-[30px]">
          <div className="w-full h-full rounded-full border border-gray-300 flex items-center justify-center">
            <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center pt-[103px] pb-20">
        <QuestionCard
          flashcard={currentCard.flashcard}
          cardNumber={currentCardIndex + 1}
          totalCards={studySessionData.totalCards}
          onResponse={handleResponse}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[393px] bg-[rgba(249,242,236,0.6)] backdrop-blur-[10px] px-5 py-2">
        <div className="flex gap-2 items-center justify-center w-full">
          {/* Home */}
          <div className="flex flex-col items-center justify-center h-[61px] px-5 py-2 rounded-[8px] w-[70px]">
            <div className="w-6 h-6 mb-1">
              <div className="w-full h-full bg-gray-400 rounded"></div>
            </div>
            <div className="text-[#6e6c66] text-[14px] font-normal">Home</div>
          </div>
          
          {/* Cards (Active) */}
          <div className="flex flex-col items-center justify-center h-[61px] px-5 py-2 rounded-[8px] w-[70px] bg-white">
            <div className="w-6 h-6 mb-1">
              <div className="w-full h-full bg-gray-400 rounded"></div>
            </div>
            <div className="text-[#6e6c66] text-[14px] font-normal">Cards</div>
          </div>
          
          {/* Chat */}
          <div className="flex flex-col items-center justify-center h-[61px] px-5 py-2 rounded-[8px] w-[70px]">
            <div className="w-6 h-6 mb-1">
              <div className="w-full h-full bg-gray-400 rounded"></div>
            </div>
            <div className="text-[#6e6c66] text-[14px] font-normal">Chat</div>
          </div>
          
          {/* Profile */}
          <div className="flex flex-col items-center justify-center h-[61px] px-5 py-2 rounded-[8px] w-[70px]">
            <div className="w-6 h-6 mb-1">
              <div className="w-full h-full bg-gray-400 rounded"></div>
            </div>
            <div className="text-[#6e6c66] text-[14px] font-normal">Profile</div>
          </div>
        </div>
      </div>
    </div>
  )
}