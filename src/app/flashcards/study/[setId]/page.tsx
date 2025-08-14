// src/app/flashcards/study/[setId]/page.tsx
// Study page for a specific flashcard set

"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import StudySession from "@/components/flashcards/StudySession"
import { toast } from "react-hot-toast"

// Types for study session data
interface StudySessionData {
  id: string
  totalCards: number
  flashcardSetName: string
  theme: string
  studyCards: any[]
}

export default function StudyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const setId = params.setId as string

  // Component state
  const [studySession, setStudySession] = useState<StudySessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSessionSetup, setShowSessionSetup] = useState(true)
  const [maxCards, setMaxCards] = useState(20) // Default 20 cards

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Start a new study session
  const startStudySession = async () => {
    if (!setId) return

    setIsLoading(true)

    try {
      console.log('Session data:', session) // Debug log
      const response = await fetch('/api/study/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          flashcardSetId: setId,
          maxCards,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start study session')
      }

      const data = await response.json()
      setStudySession(data.studySession)
      setShowSessionSetup(false)
      toast.success(`Started studying ${data.studySession.totalCards} cards!`)

    } catch (error) {
      console.error('Error starting study session:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start study session')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle session completion
  const handleSessionComplete = () => {
    // Reset state and show completion message
    setStudySession(null)
    setShowSessionSetup(true)
    
    // Redirect back to flashcards after a delay
    setTimeout(() => {
      router.push('/flashcards')
    }, 2000)
  }

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!session) {
    return null
  }

  // Show active study session
  if (studySession && !showSessionSetup) {
    return (
      <StudySession 
        studySessionData={studySession}
        onSessionComplete={handleSessionComplete}
      />
    )
  }

  // Show session setup screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎯 開始學習 Start Study Session
          </h1>
          <p className="text-gray-600">
            Ready to practice your Cantonese flashcards? Let's set up your study session!
          </p>
        </div>

        {/* Session Setup Card */}
        <Card className="p-8">
          <div className="space-y-6">
            {/* Session Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Number of Cards to Study
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[10, 15, 20, 25].map((count) => (
                  <Button
                    key={count}
                    onClick={() => setMaxCards(count)}
                    variant={maxCards === count ? "default" : "outline"}
                    className={maxCards === count ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {count} cards
                  </Button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Recommended: Start with 10-20 cards for effective learning
              </p>
            </div>

            {/* Study Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📚 How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>1. You'll see Chinese characters - try to recall the meaning</li>
                <li>2. Click "Show Answer" to reveal the English translation</li>
                <li>3. Rate how well you knew the answer (from "Blackout" to "Easy")</li>
                <li>4. Cards you find difficult will appear more frequently</li>
                <li>5. Easy cards will have longer intervals between reviews</li>
              </ul>
            </div>

            {/* Study Tips */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">💡 Study Tips:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Take your time - there's no rush!</li>
                <li>• Be honest about your responses for better learning</li>
                <li>• Try to recall the meaning before showing the answer</li>
                <li>• Focus on understanding, not just memorizing</li>
              </ul>
            </div>

            {/* Start Button */}
            <div className="pt-4">
              <Button
                onClick={startStudySession}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
              >
                {isLoading ? (
                  "Starting Session..."
                ) : (
                  `🚀 Start Studying ${maxCards} Cards`
                )}
              </Button>
            </div>

            {/* Navigation */}
            <div className="text-center pt-4 border-t">
              <Button
                onClick={() => router.push('/flashcards')}
                variant="outline"
              >
                ← Back to Flashcards
              </Button>
            </div>
          </div>
        </Card>

        {/* Motivational Message */}
        <div className="text-center mt-8">
          <p className="text-gray-600 italic">
            "The best time to plant a tree was 20 years ago. The second best time is now." <br/>
            加油！ Keep going! 💪
          </p>
        </div>
      </div>
    </div>
  )
}