// src/components/home/stat-carousel.tsx
// Home: swipeable progress stats — one pastel card per stat, snapped to the
// viewport, with dot indicators underneath.
//
// Scrolling is native CSS scroll-snap rather than a drag library: it gets
// momentum, trackpad, and keyboard behaviour for free, and the dots only ever
// read from (and scroll) the container.

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Zh } from "@/components/shared/zh"
import { cn } from "@/lib/utils"

export type StatTone = "sky" | "mint" | "blush"

export interface Stat {
  id: string
  /** The number itself. Formatted with the locale separator on render. */
  value: number
  /** Primary label, Traditional Chinese. */
  label: string
  /** Supporting label, English. */
  labelEnglish: string
  /** Optional third line — a delta or qualifier, e.g. "+12 this week". */
  caption?: string
  tone: StatTone
}

interface StatCarouselProps {
  stats: Stat[]
  /** Labels the scroll region for screen readers. */
  label?: string
  className?: string
}

const TONES: Record<StatTone, string> = {
  sky: "bg-deck-sky",
  mint: "bg-deck-mint",
  blush: "bg-deck-blush",
}

export function StatCarousel({
  stats,
  label = "Your progress",
  className,
}: StatCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // Derive the active slide from scroll position: whichever card starts
  // closest to the left edge. Works regardless of card width or gap, so the
  // layout can change without touching this. (The scroller is `relative` so
  // that a slide's offsetLeft is measured from the scroller itself — the same
  // origin as scrollLeft. Without it both this and goTo are off by whatever
  // padding sits between the page and the scroller.)
  const syncActive = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const slides = Array.from(scroller.children) as HTMLElement[]
    let nearest = 0
    let best = Infinity
    slides.forEach((slide, i) => {
      const distance = Math.abs(slide.offsetLeft - scroller.scrollLeft)
      if (distance < best) {
        best = distance
        nearest = i
      }
    })
    setActive(nearest)
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.addEventListener("scroll", syncActive, { passive: true })
    return () => scroller.removeEventListener("scroll", syncActive)
  }, [syncActive])

  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current
    const slide = scroller?.children[index] as HTMLElement | undefined
    if (!scroller || !slide) return
    scroller.scrollTo({ left: slide.offsetLeft, behavior: "smooth" })
  }, [])

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault()
            goTo(Math.min(active + 1, stats.length - 1))
          } else if (e.key === "ArrowLeft") {
            e.preventDefault()
            goTo(Math.max(active - 1, 0))
          }
        }}
        className="no-scrollbar relative flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-xl"
      >
        {stats.map((stat, i) => (
          <div
            key={stat.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${stats.length}: ${stat.labelEnglish}`}
            className={cn(
              "flex min-h-40 w-full shrink-0 snap-start flex-col justify-between rounded-xl p-5",
              TONES[stat.tone]
            )}
          >
            <p className="text-5xl font-semibold tabular-nums text-foreground">
              {stat.value.toLocaleString()}
            </p>
            <div>
              <p className="font-medium text-foreground">
                <Zh>{stat.label}</Zh>
              </p>
              <p className="text-sm text-muted-foreground">{stat.labelEnglish}</p>
              {stat.caption && (
                <p className="mt-1 text-xs text-muted-foreground">{stat.caption}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center">
        {stats.map((stat, i) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show ${stat.labelEnglish}`}
            aria-current={i === active}
            // Visually a small dot; the button keeps a tall touch target so it
            // clears the 44px floor on the axis a thumb actually misses.
            className="grid h-11 w-7 place-items-center"
          >
            <span
              className={cn(
                "size-2 rounded-full transition-colors",
                i === active ? "bg-foreground" : "bg-foreground/25"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
