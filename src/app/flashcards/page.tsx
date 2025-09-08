// src/app/flashcards/page.tsx
// Main flashcards page where users can view and manage their flashcard sets

"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
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
function Deck({ set, onClick }: { set: FlashcardSet; onClick: () => void }) {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden">
      <div className="flex flex-col items-center justify-center p-6">
        {/* Illustration */}
        <div className="mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center shadow-inner overflow-hidden">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{set.name}</h3>
          <p className="text-sm text-gray-600 mb-6">{set.flashcardCount} cards</p>
          
          {/* Button */}
          <Button 
            variant="Primary"
            text="Start lesson"
            onClick={onClick}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
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
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
        selected 
          ? 'bg-purple-100 text-purple-700' 
          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
      }`}
      onClick={onClick}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
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

  // Show loading while checking authentication
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-lg text-gray-600 font-medium">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (redirect is happening)
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-md mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg font-bold">C</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Flashcards</h1>
            </div>
            
            {/* Upload Button */}
            <button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex items-center justify-center transition-colors duration-200"
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
              <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
                <div className="p-8 text-center">
                  <div className="mb-6">
                    <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <span className="text-6xl">📚</span>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No flashcard sets yet</h2>
                  <p className="text-gray-600 mb-8">Create your first set to start learning Cantonese</p>
                  
                  <Button 
                    variant="Primary"
                    text="Upload First Set"
                    onClick={() => setShowUploadForm(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
                  />
                </div>
              </Card>
            ) : (
              // Flashcard Sets
              flashcardSets.map((set) => (
                <Deck 
                  key={set.id} 
                  set={set} 
                  onClick={() => handleDeckClick(set.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-purple-100">
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