"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/lib/supabase/use-user"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getFlashcardSet } from "@/lib/data/flashcards"
import type { FlashcardSetDetail } from "@/lib/data/types"

type FlashcardSet = FlashcardSetDetail

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
  const { user: session, status } = useUser()
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
          const detail = await getFlashcardSet(createClient(), id)
          setSet(detail)
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading cards...</p>
        </div>
      </div>
    )
  }

  if (!set) return null

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2 -ml-2"
              aria-label="Go back"
            >
              <svg className="size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
            <h1 className="text-xl font-bold text-foreground">{set.name}</h1>
        </div>

        <div className="space-y-4">
            {set.flashcards.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No cards in this set.
                </div>
            ) : (
                set.flashcards.map((card, idx) => (
                    <Card key={card.id} className="gap-0 p-4 ring-0 bg-card text-base shadow-sm rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-full">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold mb-1 text-foreground">{card.chineseWord}</h3>
                                    <span className="text-xs font-mono text-muted-foreground/70">#{idx + 1}</span>
                                </div>
                                <p className="mb-1 text-muted-foreground">{card.englishTranslation}</p>
                                {card.pronunciation && (
                                    <p className="text-sm italic text-muted-foreground">{card.pronunciation}</p>
                                )}
                            </div>
                        </div>

                        {/* Review Status Footer */}
                        <div className="mt-2 pt-3 border-t border-border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground/70">Review:</span>
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
                                    <span className="text-muted-foreground/70">Last:</span>
                                    <Badge
                                        variant={card.lastWasCorrect ? "secondary" : "destructive"}
                                        className={cn(
                                            card.lastWasCorrect && "bg-green-100 text-green-700"
                                        )}
                                    >
                                        {card.lastWasCorrect ? "Correct" : "Incorrect"}
                                    </Badge>
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
