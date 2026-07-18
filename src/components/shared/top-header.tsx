// src/components/shared/top-header.tsx
// Fixed top app bar with centered logo and contextual "+" action per route.

"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const showFlashcardsAdd = useMemo(() => pathname?.startsWith("/flashcards") ?? false, [pathname])
  const showArticlesAdd = useMemo(() => pathname === "/articles", [pathname])
  const showChatNew = useMemo(() => pathname === "/chat", [pathname])

  const toggleFlashcardsUpload = () => {
    const isOpen = searchParams.get("upload") === "1"
    router.push(isOpen ? "/flashcards" : "/flashcards?upload=1")
  }

  const action = showFlashcardsAdd
    ? { onClick: toggleFlashcardsUpload, label: "Add flashcard deck" }
    : showArticlesAdd
      ? { onClick: () => router.push("/articles/new"), label: "Add article" }
      : showChatNew
        ? { onClick: () => router.push("/chat?new=1"), label: "Start new chat" }
        : null

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div
        className="max-w-md mx-auto h-[72px] px-4 sm:px-6 flex items-center justify-between"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Left spacer keeps the logo centered when an action is present */}
        <div className="size-10" />

        {/* Center logo */}
        <div className="flex-1 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header_logo.svg" alt="Cantonese Learner" className="h-7" />
        </div>

        {/* Right-side contextual action */}
        <div className="size-10 flex items-center justify-center">
          {action && (
            <Button
              variant="outline"
              size="icon"
              onClick={action.onClick}
              className="rounded-full text-muted-foreground"
              aria-label={action.label}
              title={action.label}
            >
              <Plus />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
