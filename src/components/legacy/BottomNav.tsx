// src/components/ui/BottomNav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

// Figma-derived color tokens
const COLORS = {
  surfaceBackground: "#f9f2ec",
  textSecondary: "#6e6c66",
  textPrimary: "#171515",
  surfaceBorder: "#f2e2c4",
}

type NavItem = {
  href: string
  label: string
  isActive: (pathname: string) => boolean
  iconSrc: string
}

function IconImage({ src, active, label }: { src: string; active: boolean; label: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      className="mb-1"
      style={{ opacity: active ? 1 : 0.8 }}
    />
  )
}

export function BottomNav() {
  const pathname = usePathname()

  const items: NavItem[] = [
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 backdrop-blur-md"
      style={{ background: COLORS.surfaceBackground, borderTop: `1px solid ${COLORS.surfaceBorder}` }}
      aria-label="Primary"
    >
      <div className="max-w-md mx-auto px-4 py-3 sm:px-6" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <ul className="flex items-center justify-around">
          {items.map((item) => {
            const active = item.isActive(pathname || "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center px-5 py-2 rounded-[8px] h-[61px] transition-colors duration-200 ${active ? "bg-white/70" : "hover:bg-white/60"}`}
                  style={{ color: active ? COLORS.textPrimary : COLORS.textSecondary }}
                >
                  <IconImage src={item.iconSrc} active={active} label={item.label} />
                  <span className="text-[14px] leading-[21px]">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export default BottomNav


