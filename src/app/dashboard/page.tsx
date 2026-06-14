// src/app/dashboard/page.tsx
// Main dashboard - central hub for accessing all app features

"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/Card"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { QuickActions } from "@/components/ui/QuickActions"
import { figmaColors as FIGMA_COLORS } from "@/lib/design-tokens"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin")
    }
  }, [loading, user, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}>
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-lg font-medium" style={{ color: FIGMA_COLORS.textSecondary }}>
            Loading your learning dashboard...
          </p>
          <p className="text-sm mt-2" style={{ color: FIGMA_COLORS.textSecondary }}>
            正在載入您的學習儀表板...
          </p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render anything (redirect is happening)
  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/signin")
    router.refresh()
  }

  // Feature cards data
  const featureCards = [
    {
      title: "Flashcards",
      titleChinese: "閃卡",
      description: "Study vocabulary with smart spaced repetition. Upload your own sets or browse our collection.",
      icon: "📚",
      buttonText: "Manage Flashcards",
      buttonTextChinese: "管理閃卡",
      onClick: () => router.push('/flashcards'),
      feature: "flashcards" as const,
    },
    {
      title: "AI Chat",
      titleChinese: "AI對話",
      description: "Practice conversations with AI tutor. Speech recognition and pronunciation help included.",
      icon: "🤖",
      buttonText: "Start Chat",
      buttonTextChinese: "開始對話",
      onClick: () => router.push('/chat'),
      feature: "chat" as const,
    },
    {
      title: "Articles",
      titleChinese: "文章",
      description: "Read English articles with Traditional Chinese translations. Interactive TTS included.",
      icon: "📖",
      buttonText: "Browse Articles",
      buttonTextChinese: "瀏覽文章",
      onClick: () => router.push('/articles'),
      feature: "articles" as const,
    },
    {
      title: "Account",
      titleChinese: "帳戶",
      description: "Manage your profile, learning preferences, and view your progress analytics.",
      icon: "⚙️",
      buttonText: "Coming Soon",
      buttonTextChinese: "即將推出",
      onClick: () => {},
      disabled: true,
      feature: "account" as const,
    },
  ]

  // Progress stats data
  const progressStats = [
    { label: "Flashcard Sets", value: 0, color: "flashcards" as const, icon: "📚" },
    { label: "Words Learned", value: 0, color: "flashcards" as const, icon: "📝" },
    { label: "Study Sessions", value: 0, color: "chat" as const, icon: "📊" },
    { label: "AI Conversations", value: 0, color: "chat" as const, icon: "💬" },
    { label: "Articles Read", value: 0, color: "articles" as const, icon: "📖" },
  ]

  // Quick actions data
  const quickActions = [
    {
      label: "Sign Out",
      labelChinese: "登出",
      icon: "🚪",
      onClick: handleSignOut,
      variant: "Secondary" as const,
    }
  ]

  return (
    <div 
      className="min-h-screen p-8"
      style={{ backgroundColor: FIGMA_COLORS.surfaceBackground }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <Card className="p-8 text-center">
          <h1 className="text-4xl font-bold mb-3" style={{ color: FIGMA_COLORS.textPrimary }}>
            Cantonese Learner
          </h1>
          {user.user_metadata?.name && (
            <p className="break-words whitespace-normal" style={{ color: FIGMA_COLORS.textSecondary }}>
              Name: <strong className="break-words" style={{ color: FIGMA_COLORS.textPrimary }}>{user.user_metadata.name}</strong>
            </p>
          )}
        
          
        </Card>

        <QuickActions
          title="Account"
          actions={quickActions}
        />
      </div>
    </div>
  )
}