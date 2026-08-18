// src/components/shared/top-header.tsx
// Fixed top app bar with centered logo and contextual "+" action per route.

"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV_ROOTS = ["/dashboard", "/flashcards", "/chat", "/articles"] as const

export default function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  // The four bottom-nav destinations are the roots; anything below one of them
  // is a sub-page and gets a back button in the left slot. Resolving to the
  // root rather than router.back() keeps a deep link from navigating out of
  // the app entirely.
  const backHref = useMemo(() => {
    if (!pathname) return null
    const root = NAV_ROOTS.find(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    )
    return root && pathname !== root ? root : null
  }, [pathname])

  const showFlashcardsAdd = useMemo(() => pathname?.startsWith("/flashcards") ?? false, [pathname])
  const showArticlesAdd = useMemo(() => pathname === "/articles", [pathname])
  const showChatNew = useMemo(() => pathname === "/chat", [pathname])
  const showSignOut = useMemo(() => pathname === "/dashboard", [pathname])

  const toggleFlashcardsUpload = () => {
    const isOpen = searchParams.get("upload") === "1"
    router.push(isOpen ? "/flashcards" : "/flashcards?upload=1")
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/signin")
    router.refresh()
  }

  // One slot, one action per route: "+" creates on the list routes, and home —
  // which has nothing to create — carries sign-out instead.
  const action = showFlashcardsAdd
    ? { onClick: toggleFlashcardsUpload, label: "Add flashcard deck", icon: <Plus /> }
    : showArticlesAdd
      ? { onClick: () => router.push("/articles/new"), label: "Add article", icon: <Plus /> }
      : showChatNew
        ? { onClick: () => router.push("/chat?new=1"), label: "Start new chat", icon: <Plus /> }
        : showSignOut
          ? { onClick: signOut, label: "Sign out", icon: <LogOut /> }
          : null

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div
        className="max-w-md mx-auto h-[72px] px-4 sm:px-6 flex items-center justify-between"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Back on sub-pages; an empty box otherwise, so the logo stays centered */}
        <div className="size-10 flex items-center justify-center">
          {backHref && (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="rounded-full text-muted-foreground"
              aria-label="Go back"
              title="Go back"
            >
              <Link href={backHref}>
                <ArrowLeft />
              </Link>
            </Button>
          )}
        </div>

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
              {action.icon}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
