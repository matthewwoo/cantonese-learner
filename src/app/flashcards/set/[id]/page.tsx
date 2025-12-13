"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { IconButton } from "@/components/ui/IconButton"
import { cn } from "@/lib/utils"

interface Flashcard {
  id: string
  chineseWord: string
  englishTranslation: string
  pronunciation?: string
  exampleSentence?: string
  nextReviewDate: string | null
  lastWasCorrect: boolean | null
}

interface FlashcardSet {
  id: string
  name: string
  description: string | null
  flashcards: Flashcard[]
}

const FIGMA_COLORS = {
  surfaceBackground: '#f9f2ec',
  textPrimary: '#171515',
  textSecondary: '#6e6c66',
}

// Helper to format date relative to now
function formatReviewDate(dateString: string | null) {
  if (!dateString) return "New card"
  const date = new Date(dateString)
  const now = new Date()
  
  // Set times to midnight for accurate day comparison
  const d = new Date(date)
  d.setHours(0,0,0,0)
  const n = new Date(now)
  n.setHours(0,0,0,0)
  
  const diffTime = d.getTime() - n.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return "Overdue"
  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  return `Due in ${diffDays} days`
}

export default function FlashcardSetPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [set, setSet] = useState<FlashcardSet | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && id) {
      const fetchSet = async () => {
        try {
          setIsLoading(true)
          const response = await fetch(`/api/flashcards/${id}`)
          if (!response.ok) throw new Error('Failed to fetch set')
          const data = await response.json()
          setSet(data.flashcardSet)
        } catch (error) {
          console.error(error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchSet()
    }
  }, [session, id])

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-lg font-medium" style={{ color: FIGMA_COLORS.textSecondary }}>Loading cards...</p>
        </div>
      </div>
    )
  }

  if (!set) return null

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
      <div className="max-w-md mx-auto px-10 py-6">
        <div className="flex items-center mb-6">
            <IconButton 
              onClick={() => router.back()} 
              className="mr-2 -ml-2"
              variant="ghost"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </IconButton>
            <h1 className="text-xl font-bold" style={{ color: FIGMA_COLORS.textPrimary }}>{set.name}</h1>
        </div>
        
        <div className="space-y-4">
            {set.flashcards.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    No cards in this set.
                </div>
            ) : (
                set.flashcards.map((card, idx) => (
                    <Card key={card.id} className="p-4 bg-white border-0 shadow-sm rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-full">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold mb-1" style={{ color: FIGMA_COLORS.textPrimary }}>{card.chineseWord}</h3>
                                    <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                                </div>
                                <p className="mb-1" style={{ color: FIGMA_COLORS.textSecondary }}>{card.englishTranslation}</p>
                                {card.pronunciation && (
                                    <p className="text-sm italic text-gray-500">{card.pronunciation}</p>
                                )}
                            </div>
                        </div>

                        {/* Review Status Footer */}
                        <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Review:</span>
                                <span className={cn(
                                    "font-medium",
                                    !card.nextReviewDate ? "text-blue-500" :
                                    new Date(card.nextReviewDate) <= new Date() ? "text-orange-600" : "text-green-600"
                                )}>
                                    {formatReviewDate(card.nextReviewDate)}
                                </span>
                            </div>
                            {card.lastWasCorrect !== null && (
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-400">Last:</span>
                                    <span className={cn(
                                        "font-medium px-1.5 py-0.5 rounded",
                                        card.lastWasCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {card.lastWasCorrect ? "Correct" : "Incorrect"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                ))
            )}
        </div>
      </div>
    </div>
  )
}
