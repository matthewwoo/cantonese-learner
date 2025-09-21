// src/app/flashcards/page.tsx
// Main flashcards page where users can view and manage their flashcard sets

"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { IconButton } from "@/components/ui/IconButton"
import UploadForm from "@/components/flashcards/UploadForm"
import { toast } from "react-hot-toast"
import { featureColors } from "@/lib/design-tokens"

// Define the structure of a flashcard set
interface FlashcardSet {
  id: string
  name: string
  description: string | null
  theme: string
  imageUrl: string | null
  flashcardCount: number
  createdAt: string
  updatedAt: string
}

// Figma-derived color tokens used on the Cards page
const FIGMA_COLORS = {
  surfaceBackground: '#f9f2ec',
  surfaceBorder: '#f2e2c4',
  textPrimary: '#171515',
  textSecondary: '#6e6c66',
  deckBlue: '#e8f4ff',
  deckGreen: '#cff7d3',
  deckPink: '#fdd3d0',
  buttonBg: '#171515',
  buttonText: '#ffffff',
}

// Illustration component for deck cards
function Illustration({ illustration = "empty" }: { illustration?: string }) {
  if (illustration === "doctor") {
    return (
      <div className="relative size-full" data-name="illustration=doctor">
        <div className="absolute flex inset-[8.5%_9.4%_8.99%_10.21%] items-center justify-center">
          <div className="flex-none h-[130px] rotate-[75deg] w-[136px]">
            <div className="relative size-full" data-name="Vector">
              <svg width="136" height="130" viewBox="0 0 136 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M68 65C68 65 68 65 68 65Z" fill="#7DC4FF"/>
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
function Deck({ set, onClick, onDelete }: { set: FlashcardSet; onClick: () => void; onDelete: (setId: string) => void }) {
  const [showMenu, setShowMenu] = useState(false)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showMenu])

  return (
    <Card className="border-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 rounded-[20px] overflow-hidden relative" style={{ backgroundColor: set.theme }}>
      {/* Icon button in upper right */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <IconButton 
            size="24px" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation() // Prevent deck click when clicking icon
              setShowMenu(!showMenu)
            }}
            className="text-[#6e6c66] hover:bg-white"
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
          </IconButton>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Are you sure you want to delete "${set.name}"? This action cannot be undone.`)) {
                    onDelete(set.id)
                  }
                  setShowMenu(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6">
        {/* Illustration */}
        <div className="mb-6">
          <div className="w-32 h-32 rounded-full bg-white/70 flex items-center justify-center shadow-inner overflow-hidden">
            {set.imageUrl ? (
              <img
                src={set.imageUrl}
                alt={`${set.name} deck image`}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  console.error("Deck image failed to load:", set.imageUrl)
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <Illustration illustration="doctor" />
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="text-center w-full">
          <h3 className="text-[16px] leading-[24px] font-medium" style={{ color: FIGMA_COLORS.textPrimary }}>{set.name}</h3>
          <p className="text-[14px] leading-[21px] mb-6" style={{ color: FIGMA_COLORS.textSecondary }}>{set.flashcardCount} cards</p>
          
          {/* Button */}
          <Button 
            variant="Primary"
            text="Start lesson"
            onClick={onClick}
            className="w-fit mx-auto px-5 py-3 rounded-[8px] transition-colors duration-200"
            style={{ backgroundColor: FIGMA_COLORS.buttonBg, color: FIGMA_COLORS.buttonText }}
          />
        </div>
      </div>
    </Card>
  )
}

// Navigation item component
function NavItem({ selected = false, icon, label, onClick }: { selected?: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button 
      className={`flex flex-col items-center justify-center px-5 py-2 rounded-[8px] h-[61px] transition-colors duration-200 ${
        selected 
          ? 'bg-white shadow-sm' 
          : 'hover:bg-white/60'
      }`}
      onClick={onClick}
      style={{ color: FIGMA_COLORS.textSecondary }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <span className="text-[14px] leading-[21px]">{label}</span>
    </button>
  )
}

export default function FlashcardsPage() {
  // Authentication and navigation
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Component state
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Fetch user's flashcard sets when component mounts
  useEffect(() => {
    if (session) {
      fetchFlashcardSets()
    }
  }, [session])

  // Function to fetch flashcard sets from API
  const fetchFlashcardSets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/flashcards')
      
      if (!response.ok) {
        throw new Error('Failed to fetch flashcard sets')
      }
      
      const data = await response.json()
      setFlashcardSets(data.flashcardSets)
    } catch (error) {
      console.error('Error fetching flashcard sets:', error)
      toast.error('Failed to load flashcard sets')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle successful upload - refresh the list and hide form
  const handleUploadSuccess = () => {
    fetchFlashcardSets() // Refresh the list
    setShowUploadForm(false) // Hide the upload form
  }

  // Handle deck click - navigate directly to study page
  const handleDeckClick = (setId: string) => {
    router.push(`/flashcards/study/${setId}`)
  }

  // Handle deck deletion
  const handleDeleteDeck = async (setId: string) => {
    try {
      const response = await fetch(`/api/flashcards/${setId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete flashcard set')
      }
      
      // Refresh the list after successful deletion
      fetchFlashcardSets()
      toast.success('Flashcard set deleted successfully')
    } catch (error) {
      console.error('Error deleting flashcard set:', error)
      toast.error('Failed to delete flashcard set')
    }
  }

  // Show loading while checking authentication
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-lg font-medium" style={{ color: FIGMA_COLORS.textSecondary }}>Loading flashcards...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (redirect is happening)
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md" style={{ background: 'rgba(255,252,249,0.6)', borderBottom: `1px solid ${FIGMA_COLORS.surfaceBorder}` }}>
        <div className="max-w-md mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Center logo placeholder */}
            <div className="w-10 h-10 rounded-full bg-center bg-cover bg-no-repeat" />
            <div className="text-center flex-1">
              <div className="inline-block w-10 h-10 rounded-full bg-[#FFEFD8]" />
            </div>
            {/* Upload Button */}
            <button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ color: FIGMA_COLORS.textPrimary, border: `1px solid ${FIGMA_COLORS.surfaceBorder}` }}
              aria-label="Upload flashcards"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 pb-24 sm:px-6">
        {/* Upload Form (conditionally shown) */}
        {showUploadForm && (
          <div className="mb-8">
            <UploadForm 
              onUploadSuccess={handleUploadSuccess} 
              onClose={() => setShowUploadForm(false)}
            />
          </div>
        )}

        {/* Decks - Only show when not uploading */}
        {!showUploadForm && (
          <div className="space-y-6">
            {flashcardSets.length === 0 ? (
              // Empty State
              <Card className="bg-white border-0 shadow-lg rounded-[20px] overflow-hidden">
                <div className="p-8 text-center">
                  <div className="mb-6">
                    <div className="w-32 h-32 bg-white/70 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <span className="text-6xl">📚</span>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-2" style={{ color: FIGMA_COLORS.textPrimary }}>No flashcard sets yet</h2>
                  <p className="mb-8" style={{ color: FIGMA_COLORS.textSecondary }}>Create your first set to start learning Cantonese</p>
                  
                  <Button 
                    variant="Primary"
                    text="Upload First Set"
                    onClick={() => setShowUploadForm(true)}
                    className="font-medium py-3 px-8 rounded-[8px] transition-colors duration-200"
                    style={{ backgroundColor: FIGMA_COLORS.buttonBg, color: FIGMA_COLORS.buttonText }}
                  />
                </div>
              </Card>
            ) : (
              // Flashcard Sets
              flashcardSets.map((set, idx) => {
                // Cycle Figma deck background colors
                const bg = [FIGMA_COLORS.deckBlue, FIGMA_COLORS.deckGreen, FIGMA_COLORS.deckPink][idx % 3]
                // Attach color to set.theme so Deck can read it without changing props
                const themedSet = { ...set, theme: bg }
                return (
                  <Deck 
                    key={set.id} 
                    set={themedSet} 
                    onClick={() => handleDeckClick(set.id)}
                    onDelete={handleDeleteDeck}
                  />
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-md" style={{ background: 'rgba(249,242,236,0.6)' }}>
        <div className="max-w-md mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-around">
            <NavItem 
              icon="🏠" 
              label="Home" 
              onClick={() => router.push('/dashboard')}
            />
            <NavItem 
              icon="📚" 
              label="Cards" 
              selected={true}
              onClick={() => {}}
            />
            <NavItem 
              icon="💬" 
              label="Chat" 
              onClick={() => router.push('/chat')}
            />
            <NavItem 
              icon="📖" 
              label="Articles" 
              onClick={() => router.push('/articles')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}