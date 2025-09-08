// src/app/dashboard/page.tsx
// Main dashboard - central hub for accessing all app features

"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card } from "@/components/ui/Card"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { FeatureCard } from "@/components/ui/FeatureCard"
import { ProgressStats } from "@/components/ui/ProgressStats"
import { QuickActions } from "@/components/ui/QuickActions"
import { tokens } from "@/lib/design-tokens"

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-lg text-gray-600 font-medium">
            Loading your learning dashboard...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            正在載入您的學習儀表板...
          </p>
        </div>
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
      label: "Create New Flashcard Set",
      labelChinese: "創建新閃卡組",
      icon: "📝",
      onClick: () => router.push('/flashcards'),
      color: "flashcards" as const,
    },
    {
      label: "Start AI Conversation",
      labelChinese: "開始AI對話",
      icon: "💬",
      onClick: () => router.push('/chat'),
      color: "chat" as const,
    },
    {
      label: "Add New Article",
      labelChinese: "添加新文章",
      icon: "📚",
      onClick: () => router.push('/articles'),
      color: "articles" as const,
    },
    {
      label: "Sign Out",
      labelChinese: "登出",
      icon: "🚪",
      onClick: handleSignOut,
      variant: "Secondary" as const,
    },
  ]

  return (
    <div 
      className="min-h-screen p-8"
      style={{
        background: tokens.colors.background.gradient
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <Card className="p-8 text-center">
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
        </Card>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureCards.map((card, index) => (
            <FeatureCard
              key={index}
              title={card.title}
              titleChinese={card.titleChinese}
              description={card.description}
              icon={card.icon}
              buttonText={card.buttonText}
              buttonTextChinese={card.buttonTextChinese}
              onClick={card.onClick}
              disabled={card.disabled}
              feature={card.feature}
            />
          ))}
        </div>

        {/* Progress Stats */}
        <ProgressStats
          title="Learning Progress"
          titleChinese="學習進度"
          stats={progressStats}
        />

        {/* Quick Actions */}
        <QuickActions
          title="Quick Actions"
          titleChinese="快速操作"
          actions={quickActions}
        />
      </div>
    </div>
  )
}