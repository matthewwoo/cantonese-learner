// src/components/ui/TopHeader.tsx
"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const COLORS = {
  surfaceBackground: "#f9f2ec",
  surfaceBorder: "#f2e2c4",
}

export default function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const showFlashcardsAdd = useMemo(() => pathname?.startsWith("/flashcards") ?? false, [pathname])
  const showArticlesAdd = useMemo(() => pathname === "/articles", [pathname])
  const showChatNew = useMemo(() => pathname === "/chat", [pathname])

  const toggleFlashcardsUpload = () => {
    const isOpen = searchParams.get("upload") === "1"
    const base = "/flashcards"
    if (isOpen) {
      router.push(base)
    } else {
      router.push(`${base}?upload=1`)
    }
  }

  const goToAddArticle = () => {
    router.push("/articles/new")
  }

  const startNewChat = () => {
    router.push("/chat?new=1")
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: COLORS.surfaceBackground,
        borderBottom: `1px solid ${COLORS.surfaceBorder}`,
      }}
    >
      <div
        className="max-w-md mx-auto h-[72px] px-4 sm:px-6 flex items-center justify-between"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Left spacer to keep logo centered when action button is present */}
        <div className="w-10 h-10" />

        {/* Center logo */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src="/header_logo.png"
            alt="Cantonese Learner"
            className="h-7"
            aria-hidden="false"
          />
        </div>

        {/* Right-side contextual actions */}
        <div className="w-10 h-10 flex items-center justify-center">
          {showFlashcardsAdd && (
            <button
              onClick={toggleFlashcardsUpload}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ border: "1px solid #8C8B89", color: "#8C8B89" }}
              aria-label="Add flashcard deck"
              title="Add flashcard deck"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          )}
          {showArticlesAdd && (
            <button
              onClick={goToAddArticle}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ border: "1px solid #8C8B89", color: "#8C8B89" }}
              aria-label="Add article"
              title="Add article"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          )}
          {showChatNew && (
            <button
              onClick={startNewChat}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ border: "1px solid #8C8B89", color: "#8C8B89" }}
              aria-label="Start new chat"
              title="Start new chat"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


