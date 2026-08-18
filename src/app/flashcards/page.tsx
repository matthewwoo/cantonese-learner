// src/app/flashcards/page.tsx
// Main flashcards page where users can view and manage their flashcard sets

"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useUser } from "@/lib/supabase/use-user"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import UploadForm from "@/components/flashcards/UploadForm"
import { Skeleton } from "@/components/ui/skeleton"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { listFlashcardSets, deleteFlashcardSet } from "@/lib/data/flashcards"
import { displayStatus, type GenerationStatus } from "@/lib/generation"
import { usePollWhilePending } from "@/lib/hooks/use-poll-while-pending"

// Define the structure of a flashcard set
interface FlashcardSet {
  id: string
  name: string
  toneClass?: string // client-side deck pastel class, attached at render time
  imageUrl: string | null
  flashcardCount: number
  status: GenerationStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

// Deck pastel background classes (design tokens), cycled per deck
const DECK_TONES = ["bg-deck-sky", "bg-deck-mint", "bg-deck-blush"]

// Illustration component for deck cards
function Illustration({ illustration = "empty" }: { illustration?: string }) {
  if (illustration === "doctor") {
    return (
      <div className="relative size-full" data-name="illustration=doctor">
        <div className="absolute flex inset-[8.5%_9.4%_8.99%_10.21%] items-center justify-center">
          <div className="flex-none h-[130px] rotate-[75deg] w-[136px]">
            <div className="relative size-full" data-name="Vector">
              <svg width="136" height="130" viewBox="0 0 136 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M68 65C68 65 68 65 68 65Z" fill="currentColor" className="text-deck-sky" />
              </svg>
            </div>
          </div>
        </div>
        <div className="absolute contents inset-[12%_12.51%_11.59%_12.5%]" data-name="artwork">
          {/* Simplified doctor illustration - you can replace with actual SVG paths */}
          <div className="absolute inset-[26.86%_72.12%_58.41%_13.24%]">
            <div className="w-full h-full bg-blue-200 rounded-full"></div>
          </div>
          <div className="absolute inset-[26.09%_71.4%_57.68%_12.5%]">
            <div className="w-full h-full bg-blue-300 rounded-full"></div>
          </div>
          <div className="absolute inset-[31.69%_76.84%_63.24%_18.04%]">
            <div className="w-full h-full bg-blue-400 rounded-full"></div>
          </div>
          <div className="absolute inset-[12.62%_12.51%_37.69%_41.29%]">
            <div className="w-full h-full bg-blue-500 rounded-full"></div>
          </div>
          <div className="absolute inset-[12%_38.56%_83.3%_55.97%]">
            <div className="w-full h-full bg-blue-600 rounded-full"></div>
          </div>
          <div className="absolute inset-[14.86%_21.99%_80.28%_72.46%]">
            <div className="w-full h-full bg-blue-700 rounded-full"></div>
          </div>
          <div className="absolute inset-[40.82%_43.77%_11.59%_16.42%]">
            <div className="w-full h-full bg-blue-800 rounded-full"></div>
          </div>
          <div className="absolute inset-[82.43%_61.1%_14.61%_30.3%]">
            <div className="w-full h-full bg-blue-900 rounded-full"></div>
          </div>
          <div className="absolute inset-[40.16%_22.21%_36.07%_43.93%]">
            <div className="w-full h-full bg-indigo-200 rounded-full"></div>
          </div>
          <div className="absolute inset-[39.4%_21.48%_35.34%_43.21%]">
            <div className="w-full h-full bg-indigo-300 rounded-full"></div>
          </div>
          <div className="absolute inset-[40.66%_37.99%_35.69%_44.15%] mix-blend-multiply">
            <div className="w-full h-full bg-indigo-400 rounded-full"></div>
          </div>
          <div className="absolute inset-[28.12%_78.61%_58.03%_13.25%] mix-blend-multiply">
            <div className="w-full h-full bg-indigo-500 rounded-full"></div>
          </div>
          <div className="absolute inset-[20.93%_69.01%_74.48%_26.29%]">
            <div className="w-full h-full bg-indigo-600 rounded-full"></div>
          </div>
          <div className="absolute inset-[24.42%_66.7%_72.53%_29.53%]">
            <div className="w-full h-full bg-indigo-700 rounded-full"></div>
          </div>
          <div className="absolute inset-[30.58%_74.7%_64.24%_21.76%]">
            <div className="w-full h-full bg-indigo-800 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Default illustration
  return (
    <div className="relative size-full flex items-center justify-center">
      <div className="w-40 h-40 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
        <span className="text-4xl">📚</span>
      </div>
    </div>
  )
}

// Deck card component
function Deck({ set, onClick, onDelete, onView }: { set: FlashcardSet; onClick: () => void; onDelete: (setId: string) => void; onView: (setId: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  // A deck appears the moment generation starts, so most of this card is a
  // placeholder until the background job fills it in.
  const state = displayStatus(set)
  const isReady = state === "ready"

  return (
    <Card className={`gap-0 py-0 ring-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 rounded-xl overflow-hidden relative ${set.toneClass ?? "bg-deck-sky"}`}>
      {/* Icon button in upper right */}
      <div className="absolute top-4 right-4 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Deck options"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:bg-card"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="14" cy="8" r="1.5" fill="currentColor"/>
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem disabled={!isReady} onSelect={() => onView(set.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              See all cards
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flashcard set?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to delete "${set.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(set.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col items-center justify-center p-6">
        {/* Illustration */}
        <div className="mb-6">
          <div className="w-32 h-32 rounded-full bg-white/70 flex items-center justify-center shadow-inner overflow-hidden">
            {state === "pending" ? (
              // The cover art is generated alongside the cards
              <Skeleton className="w-full h-full rounded-full" />
            ) : set.imageUrl ? (
              <img
                src={set.imageUrl}
                alt={`${set.name} deck image`}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  console.error("Deck image failed to load:", set.imageUrl)
                  // Hide the broken image and render fallback illustration
                  e.currentTarget.style.display = 'none'
                  const container = e.currentTarget.parentElement
                  if (container) {
                    const fallback = document.createElement('div')
                    fallback.className = 'w-full h-full flex items-center justify-center bg-white/70'
                    fallback.innerHTML = '<span class="text-4xl">📚</span>'
                    container.appendChild(fallback)
                  }
                }}
              />
            ) : (
              <Illustration illustration="doctor" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-center w-full">
          <h3 className="text-[16px] leading-[24px] font-medium text-foreground">{set.name}</h3>

          {state === "pending" ? (
            <ShimmeringText
              text="Generating cards…"
              className="text-[14px] leading-[21px] mb-6 block"
            />
          ) : state === "failed" ? (
            <p className="text-[14px] leading-[21px] mb-6 text-muted-foreground">
              {set.errorMessage
                ? "Couldn't generate this deck. Delete it and try again."
                : "Generation didn't finish. Delete it and try again."}
            </p>
          ) : (
            <p className="text-[14px] leading-[21px] mb-6 text-muted-foreground">{set.flashcardCount} cards</p>
          )}

          {/* Button */}
          <Button onClick={onClick} disabled={!isReady} className="w-fit mx-auto">
            Start lesson
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Navigation item component
function NavItem({ selected = false, icon, label, onClick }: { selected?: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex flex-col items-center justify-center px-5 py-2 rounded-sm h-[61px] text-muted-foreground transition-colors duration-200 ${
        selected
          ? 'bg-card shadow-sm'
          : 'hover:bg-card/60'
      }`}
      onClick={onClick}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <span className="text-[14px] leading-[21px]">{label}</span>
    </button>
  )
}

function FlashcardsBody({
  flashcardSets,
  onUploadSuccess,
  onDeckClick,
  onDeleteDeck,
  onViewDeck,
  onCloseUpload,
}: {
  flashcardSets: FlashcardSet[]
  onUploadSuccess: () => void
  onDeckClick: (setId: string) => void
  onDeleteDeck: (setId: string) => Promise<void>
  onViewDeck: (setId: string) => void
  onCloseUpload: () => void
}) {
  const searchParams = useSearchParams()
  const showUploadForm = searchParams.get("upload") === "1"

  return (
    <>
      {/* Upload Form (conditionally shown) */}
      {showUploadForm && (
        <div className="mb-8">
          <UploadForm
            onUploadSuccess={onUploadSuccess}
            onClose={onCloseUpload}
          />
        </div>
      )}

      {/* Decks - Only show when not uploading */}
      {!showUploadForm && (
        <div className="space-y-6">
          {flashcardSets.length === 0 ? (
            // Empty State
            <Card className="gap-0 py-0 ring-0 bg-card shadow-lg rounded-xl overflow-hidden">
              <div className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-32 h-32 bg-white/70 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <span className="text-6xl">📚</span>
                  </div>
                </div>

                <h2 className="text-xl font-semibold mb-2 text-foreground">No flashcard sets yet</h2>
                <p className="mb-8 text-muted-foreground">Create your first set to start learning Cantonese</p>

                <Button onClick={() => onCloseUpload()} className="px-8 font-medium">
                  Generate First Deck
                </Button>
              </div>
            </Card>
          ) : (
            // Flashcard Sets
            flashcardSets.map((set, idx) => {
              // Cycle deck pastel token classes
              const toneClass = DECK_TONES[idx % DECK_TONES.length]
              // Attach class to set.toneClass so Deck can read it without changing props
              const themedSet = { ...set, toneClass }
              return (
                <Deck
                  key={set.id}
                  set={themedSet}
                  onClick={() => onDeckClick(set.id)}
                  onDelete={onDeleteDeck}
                  onView={onViewDeck}
                />
              )
            })
          )}
        </div>
      )}
    </>
  )
}

export default function FlashcardsPage() {
  // Authentication and navigation
  const { user: session, status } = useUser()
  const router = useRouter()

  // Component state
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  // Only the first load takes the screen over. Polling refetches must be
  // silent, or every tick would blank the list the user is looking at.
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Function to fetch flashcard sets from Supabase
  const fetchFlashcardSets = useCallback(async () => {
    try {
      const sets = await listFlashcardSets(createClient())
      setFlashcardSets(sets)
    } catch (error) {
      console.error('Error fetching flashcard sets:', error)
      toast.error('Failed to load flashcard sets')
    } finally {
      setIsInitialLoad(false)
    }
  }, [])

  // Fetch user's flashcard sets when component mounts
  useEffect(() => {
    if (session) {
      fetchFlashcardSets()
    }
  }, [session, fetchFlashcardSets])

  // Keep decks that are still generating up to date without the user acting
  usePollWhilePending(flashcardSets, fetchFlashcardSets)

  // Handle successful upload - refresh the list and hide form
  const handleUploadSuccess = () => {
    fetchFlashcardSets()
    router.push("/flashcards")
  }

  // Handle deck click - navigate directly to study page
  const handleDeckClick = (setId: string) => {
    router.push(`/flashcards/study/${setId}`)
  }

  // Handle deck view - navigate to set view page
  const handleViewDeck = (setId: string) => {
    router.push(`/flashcards/set/${setId}`)
  }

  // Handle deck deletion
  const handleDeleteDeck = async (setId: string) => {
    try {
      await deleteFlashcardSet(createClient(), setId)

      // Refresh the list after successful deletion — the row disappearing is
      // the confirmation, so there is nothing to announce
      fetchFlashcardSets()
    } catch (error) {
      console.error('Error deleting flashcard set:', error)
      toast.error('Failed to delete flashcard set')
    }
  }

  // Show loading while checking authentication
  if (status === "loading" || isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (redirect is happening)
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 pb-24 sm:px-6">
        <Suspense fallback={<div />}>
          <FlashcardsBody
            flashcardSets={flashcardSets}
            onUploadSuccess={handleUploadSuccess}
            onDeckClick={handleDeckClick}
            onDeleteDeck={handleDeleteDeck}
            onViewDeck={handleViewDeck}
            onCloseUpload={() => router.push('/flashcards?upload=1')}
          />
        </Suspense>
      </div>

      {/* Bottom Navigation removed; now rendered globally in Providers */}
    </div>
  )
}
