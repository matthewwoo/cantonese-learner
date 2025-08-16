// src/app/dashboard/page.tsx
// Main dashboard - central hub for accessing all app features

"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  // If not authenticated, don't render anything (redirect is happening)
  if (!session) {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <Card className="p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              歡迎回來！ Welcome back!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Signed in as: <strong className="text-indigo-600">{session.user?.email}</strong>
            </p>
            {session.user?.name && (
              <p className="text-gray-600">
                Name: <strong className="text-indigo-600">{session.user.name}</strong>
              </p>
            )}
          </div>
        </Card>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Flashcards Section */}
          <Card className="p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📚</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                閃卡 Flashcards
              </h2>
              <p className="text-gray-600 mb-4 text-sm">
                Study vocabulary with smart spaced repetition. Upload your own sets or browse our collection.
              </p>
              <Button 
                onClick={() => router.push('/flashcards')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Manage Flashcards
              </Button>
            </div>
          </Card>

          {/* AI Chat Section */}
          <Card className="p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                AI對話 AI Chat
              </h2>
              <p className="text-gray-600 mb-4 text-sm">
                Practice conversations with AI tutor. Speech recognition and pronunciation help included.
              </p>
              <Button 
              onClick={() => router.push('/chat')}
              className="w-full bg-green-600 hover:bg-green-700"
              >
              Start Chat
              </Button>
            </div>
          </Card>

          {/* Account Section */}
          <Card className="p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                帳戶 Account
              </h2>
              <p className="text-gray-600 mb-4 text-sm">
                Manage your profile, learning preferences, and view your progress analytics.
              </p>
              <Button 
                disabled
                className="w-full opacity-50 cursor-not-allowed"
              >
                Coming Soon
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            📊 Learning Progress
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Flashcard Sets</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Words Learned</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Study Sessions</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-sm text-gray-600">AI Conversations</div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            快速操作 Quick Actions
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            <Button 
              onClick={() => router.push('/flashcards')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              📝 Create New Flashcard Set
            </Button>
            <Button 
              onClick={() => router.push('/chat')}
              className="bg-green-600 hover:bg-green-700"
            >
              💬 Start AI Conversation
            </Button>
            <Button 
              onClick={handleSignOut}
              variant="outline"
            >
              🚪 Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}