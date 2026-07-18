// src/app/flashcards/study/[setId]/page.tsx
// Study page for a specific flashcard set

"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/lib/supabase/use-user"
import { useRouter, useParams } from "next/navigation"
import StudySession from "@/components/flashcards/StudySession"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { startStudySession as startStudySessionQuery } from "@/lib/data/study"
import type { StartedStudySession } from "@/lib/data/types"

type StudySessionData = StartedStudySession

export default function StudyPage() {
  const { user: session, status } = useUser()
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const started = await startStudySessionQuery(supabase, user.id, setId, 15)
      setStudySession(started)
      toast.success(`Started studying ${started.totalCards} cards!`)

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f2ec' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
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