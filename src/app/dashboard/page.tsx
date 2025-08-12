// src/app/dashboard/page.tsx
// Simple dashboard page to test successful authentication

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
        <p>Loading...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              歡迎! Welcome to Cantonese Learner!
            </h1>
            <p className="text-gray-600">
              Authentication successful! You are signed in as: <strong>{session.user?.email}</strong>
            </p>
            {session.user?.name && (
              <p className="text-gray-600">Name: <strong>{session.user.name}</strong></p>
            )}
          </div>

          <div className="flex justify-center space-x-4">
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
            <Button disabled>
              Flashcards (Coming Soon)
            </Button>
            <Button disabled>
              AI Chat (Coming Soon)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}