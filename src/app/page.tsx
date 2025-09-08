// src/app/page.tsx
// Homepage for the Cantonese learning app

import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                粵語學習 <span className="text-sm font-normal text-gray-600">Cantonese Learner</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                登入 Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                註冊 Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block text-gray-900">學粵語</span>
            <span className="block text-indigo-600 text-3xl sm:text-4xl md:text-5xl mt-2">
              Learn Cantonese the Smart Way
            </span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
            Master Cantonese with AI-powered conversations, smart flashcards, and spaced repetition learning. 
            From beginner to fluent - start your journey today!
          </p>
          
          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="Primary"
              text="🚀 開始學習 Get Started Free"
              asChild
              className="transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Link href="/auth/signup" />
            </Button>
            <Button
              variant="Secondary"
              text="已有帳戶 Sign In"
              asChild
            >
              <Link href="/auth/signin" />
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">為什麼選擇我們？ Why Choose Us?</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our scientifically-backed approach makes learning Cantonese faster and more enjoyable than ever before.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 - Flashcards */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">📚</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">智能閃卡 Smart Flashcards</h4>
              <p className="text-gray-600 leading-relaxed">
                Learn vocabulary with intelligent spaced repetition. Upload your own card sets or use our curated collections. 
                <span className="font-medium text-indigo-600"> Traditional Chinese characters supported!</span>
              </p>
            </div>

            {/* Feature 2 - AI Chat */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">AI對話 AI Conversations</h4>
              <p className="text-gray-600 leading-relaxed">
                Practice real conversations with our AI tutor. Get corrections, pronunciation help, and contextual learning. 
                <span className="font-medium text-green-600"> Speech-to-text included!</span>
              </p>
            </div>

            {/* Feature 3 - Progress */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">進度追踪 Progress Tracking</h4>
              <p className="text-gray-600 leading-relaxed">
                Monitor your learning journey with detailed analytics. See your vocabulary growth, conversation skills, and areas for improvement.
                <span className="font-medium text-purple-600"> Gamified experience!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Learning Path Preview */}
        <div className="mt-24 bg-white rounded-2xl shadow-xl p-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">學習路徑 Your Learning Journey</h3>
            <p className="text-lg text-gray-600">Start from basics and progress to fluent conversations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👋</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">1. 基礎詞彙 Basic Vocabulary</h4>
              <p className="text-gray-600">Start with essential words and phrases for daily conversations</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">2. 對話練習 Practice Conversations</h4>
              <p className="text-gray-600">Engage in AI-powered conversations to build confidence</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">3. 流利表達 Fluent Expression</h4>
              <p className="text-gray-600">Master complex conversations and cultural nuances</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">準備好開始了嗎？ Ready to Start?</h3>
          <p className="text-lg text-gray-600 mb-8">Join thousands of learners mastering Cantonese every day</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-10 py-4 text-lg font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            開始免費學習 Start Learning Free →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2025 Cantonese Learner. Made with ❤️ for language learners.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}