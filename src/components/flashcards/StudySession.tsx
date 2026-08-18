// src/components/flashcards/StudySession.tsx
// Interactive flashcard study component with spaced repetition

"use client"

import { useState, useEffect } from "react"
import { ResponseQuality } from "@/lib/srs/sm2"
import { toast } from "sonner"
import QuestionCard from "./QuestionCard"
import { createClient } from "@/lib/supabase/client"
import { recordStudyResponse } from "@/lib/data/study"
import { Zh } from "@/components/shared/zh"

// Types for study session data
interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation?: string | null
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
  // Per-answer encouragement. It used to be a toast, and it exists mainly
  // for the live-region announcement, so it needs somewhere to live now.
  const [feedback, setFeedback] = useState<React.ReactNode>(null)

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

      // Run SM-2 locally and persist via Supabase (RLS-scoped)
      const data = await recordStudyResponse(
        createClient(),
        currentCard.id,
        quality,
        responseTime
      )

      // Update local state
      setAnsweredCards(data.sessionProgress.answered)

      // Move to next card or complete session
      if (isLastCard || data.sessionProgress.isCompleted) {
        // Session completed — the completion screen says so
        onSessionComplete()
      } else {
        // Move to next card
        setCurrentCardIndex(prev => prev + 1)
        setFeedback(getResponseFeedback(quality))
      }

    } catch (error) {
      console.error('Error recording response:', error)
      toast.error('Failed to record response')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get encouraging feedback based on response quality
  // Returns a node, not a string: the Chinese interjections need lang marking
  // so the live-region announcement doesn't read them as English.
  const getResponseFeedback = (quality: ResponseQuality): React.ReactNode => {
    switch (quality) {
      case ResponseQuality.EASY:
        return <>Perfect! <Zh>完美!</Zh> That was easy!</>
      case ResponseQuality.GOOD:
        return <>Good job! <Zh>好!</Zh> You got it right!</>
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
    <div className="min-h-screen bg-background relative">
    
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center p-4">
        <QuestionCard
          key={currentCard.id}
          flashcard={currentCard.flashcard}
          cardNumber={currentCardIndex + 1}
          totalCards={studySessionData.totalCards}
          onResponse={handleResponse}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Announced to screen readers as each card is answered. Visually the
          next card appearing is already the feedback. */}
      <div aria-live="polite" className="sr-only">
        {feedback}
      </div>
    </div>
  )
}