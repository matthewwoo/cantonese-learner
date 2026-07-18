// src/components/shared/bottom-nav.tsx
// Fixed bottom tab bar (Home / Cards / Chat / Read).

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  isActive: (pathname: string) => boolean
  iconSrc: string
}

const ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    isActive: (p) => p === "/dashboard" || p === "/",
    iconSrc: "/Home.svg",
  },
  {
    href: "/flashcards",
    label: "Cards",
    isActive: (p) => p.startsWith("/flashcards"),
    iconSrc: "/Cards.svg",
  },
  {
    href: "/chat",
    label: "Chat",
    isActive: (p) => p.startsWith("/chat"),
    iconSrc: "/Chat.svg",
  },
  {
    href: "/articles",
    label: "Read",
    isActive: (p) => p.startsWith("/articles"),
    iconSrc: "/Read.svg",
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border"
      aria-label="Primary"
    >
      <div
        className="max-w-md mx-auto px-4 py-3 sm:px-6"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
      >
        <ul className="flex items-center justify-around">
          {ITEMS.map((item) => {
            const active = item.isActive(pathname || "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center px-5 py-2 rounded-sm h-[61px] transition-colors duration-200",
                    active
                      ? "bg-card/70 text-foreground"
                      : "text-muted-foreground hover:bg-card/60"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.iconSrc}
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                    className={cn("mb-1", active ? "opacity-100" : "opacity-80")}
                  />
                  <span className="text-sm leading-[21px]">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
