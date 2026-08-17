// src/app/page.tsx
// Homepage for the Cantonese learning app

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Zh } from "@/components/shared/zh"

export default async function Home() {
  // Check if user is logged in - if so, redirect to dashboard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="shadow-sm bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-foreground">
                <Zh>粵語學習</Zh> <span className="text-sm font-normal text-muted-foreground">Cantonese Learner</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Zh>登入</Zh> Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Zh>註冊</Zh> Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl md:text-6xl">
            <span className="block text-foreground" lang="zh-HK">學粵語</span>
            <span className="block text-muted-foreground text-3xl sm:text-4xl md:text-5xl mt-2">
              Learn Cantonese the Smart Way
            </span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            Master Cantonese with AI-powered conversations, smart flashcards, and spaced repetition learning.
            From beginner to fluent - start your journey today!
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Link href="/auth/signup">🚀 <Zh>開始學習</Zh> Get Started Free</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/auth/signin"><Zh>已有帳戶</Zh> Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4"><Zh>為什麼選擇我們？</Zh> Why Choose Us?</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our scientifically-backed approach makes learning Cantonese faster and more enjoyable than ever before.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 - Flashcards */}
            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-deck-sky rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">📚</span>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3"><Zh>智能閃卡</Zh> Smart Flashcards</h4>
              <p className="text-muted-foreground leading-relaxed">
                Learn vocabulary with intelligent spaced repetition. Upload your own card sets or use our curated collections.
                <span className="font-medium text-foreground"> Traditional Chinese characters supported!</span>
              </p>
            </div>

            {/* Feature 2 - AI Chat */}
            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-deck-mint rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">AI<Zh>對話</Zh> AI Conversations</h4>
              <p className="text-muted-foreground leading-relaxed">
                Practice real conversations with our AI tutor. Get corrections, pronunciation help, and contextual learning.
                <span className="font-medium text-foreground"> Speech-to-text included!</span>
              </p>
            </div>

            {/* Feature 3 - Progress */}
            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-deck-blush rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3"><Zh>進度追踪</Zh> Progress Tracking</h4>
              <p className="text-muted-foreground leading-relaxed">
                Monitor your learning journey with detailed analytics. See your vocabulary growth, conversation skills, and areas for improvement.
                <span className="font-medium text-foreground"> Gamified experience!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Learning Path Preview */}
        <div className="mt-24 bg-card rounded-2xl shadow-xl p-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4"><Zh>學習路徑</Zh> Your Learning Journey</h3>
            <p className="text-lg text-muted-foreground">Start from basics and progress to fluent conversations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-deck-sky rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👋</span>
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">1. <Zh>基礎詞彙</Zh> Basic Vocabulary</h4>
              <p className="text-muted-foreground">Start with essential words and phrases for daily conversations</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-deck-mint rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">2. <Zh>對話練習</Zh> Practice Conversations</h4>
              <p className="text-muted-foreground">Engage in AI-powered conversations to build confidence</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-deck-blush rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">3. <Zh>流利表達</Zh> Fluent Expression</h4>
              <p className="text-muted-foreground">Master complex conversations and cultural nuances</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4"><Zh>準備好開始了嗎？</Zh> Ready to Start?</h3>
          <p className="text-lg text-muted-foreground mb-8">Join thousands of learners mastering Cantonese every day</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-10 py-4 text-lg font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/80 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Zh>開始免費學習</Zh> Start Learning Free →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted-foreground">
            <p>© 2025 Cantonese Learner. Made with ❤️ for language learners.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
