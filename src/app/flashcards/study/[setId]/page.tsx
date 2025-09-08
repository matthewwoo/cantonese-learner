// src/app/flashcards/study/[setId]/page.tsx
// Study page for a specific flashcard set

"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import StudySession from "@/components/flashcards/StudySession"
import { toast } from "react-hot-toast"

// Types for study session data
interface StudyCard {
  id: string
  position: number
  flashcard: {
    id: string
    chineseWord: string
    englishTranslation: string
    pronunciation?: string
    exampleSentence?: string
  }
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
  wasCorrect: boolean | null
}

interface StudySessionData {
  id: string
  totalCards: number
  flashcardSetName: string
  theme: string
  studyCards: StudyCard[]
}

export default function StudyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const setId = params.setId as string

  // Component state
  const [studySession, setStudySession] = useState<StudySessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Start a new study session with 15 cards
  const startStudySession = useCallback(async () => {
    if (!setId) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/study/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          flashcardSetId: setId,
          maxCards: 15, // Always use 15 cards
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start study session')
      }

      const data = await response.json()
      setStudySession(data.studySession)
      toast.success(`Started studying ${data.studySession.totalCards} cards!`)

    } catch (error) {
      console.error('Error starting study session:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start study session')
      // Redirect back to flashcards on error
      router.push('/flashcards')
    } finally {
      setIsLoading(false)
    }
  }, [setId, router])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Automatically start a study session when component mounts
  useEffect(() => {
    if (session && setId && !studySession && !isLoading) {
      startStudySession()
    }
  }, [session, setId, studySession, isLoading, startStudySession])

  // Handle session completion
  const handleSessionComplete = () => {
    // Redirect back to flashcards after completion
    router.push('/flashcards')
  }

  // Show loading while checking authentication or starting session
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-200 to-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            {status === "loading" ? "Loading..." : "Starting your lesson..."}
          </p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!session) {
    return null
  }

  // Show active study session
  if (studySession) {
    return (
      <StudySession 
        studySessionData={studySession}
        onSessionComplete={handleSessionComplete}
      />
    )
  }

  // This shouldn't be reached, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg text-gray-600">Something went wrong. Redirecting...</p>
    </div>
  )
}