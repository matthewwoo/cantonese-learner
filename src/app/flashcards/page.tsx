// src/app/flashcards/page.tsx
// Main flashcards page where users can view and manage their flashcard sets

"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import UploadForm from "@/components/flashcards/UploadForm"
import { toast } from "react-hot-toast"

// Define the structure of a flashcard set
interface FlashcardSet {
  id: string
  name: string
  description: string | null
  theme: string
  flashcardCount: number
  createdAt: string
  updatedAt: string
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

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Show loading while checking authentication
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading flashcards...</p>
      </div>
    )
  }

  // Don't render anything if not authenticated (redirect is happening)
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📚 閃卡管理 Flashcards
            </h1>
            <p className="text-gray-600">
              Manage your Cantonese flashcard sets and create new study sessions
            </p>
          </div>
          
          {/* Navigation */}
          <div className="flex space-x-3">
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="outline"
            >
              ← Dashboard
            </Button>
            <Button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {showUploadForm ? 'Cancel Upload' : '+ Upload New Set'}
            </Button>
          </div>
        </div>

        {/* Upload Form (conditionally shown) */}
        {showUploadForm && (
          <div className="mb-8">
            <UploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Flashcard Sets List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcardSets.length === 0 ? (
            // Empty State
            <div className="col-span-full">
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No flashcard sets yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first flashcard set to start learning Cantonese!
                </p>
                <Button 
                  onClick={() => setShowUploadForm(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Upload Your First Set
                </Button>
              </Card>
            </div>
          ) : (
            // Flashcard Sets Grid
            flashcardSets.map((set) => (
              <Card key={set.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {set.name}
                    </h3>
                    <p className="text-sm text-purple-600 font-medium mb-2">
                      Theme: {set.theme}
                    </p>
                    {set.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {set.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Set Statistics */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cards:</span>
                    <span className="font-medium">{set.flashcardCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(set.createdAt)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => router.push(`/flashcards/study/${set.id}`)}
                  >
                    🎯 Study
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => router.push(`/flashcards/view/${set.id}`)}
                  >
                    👁️ View
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Quick Stats (if user has sets) */}
        {flashcardSets.length > 0 && (
          <Card className="p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Your Learning Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {flashcardSets.length}
                </div>
                <div className="text-sm text-gray-600">Flashcard Sets</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {flashcardSets.reduce((total, set) => total + set.flashcardCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Cards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {new Set(flashcardSets.map(set => set.theme)).size}
                </div>
                <div className="text-sm text-gray-600">Themes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-gray-600">Study Sessions</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}