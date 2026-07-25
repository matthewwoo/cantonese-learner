// src/components/articles/article-audio-player.tsx
// Fixed read-aloud bar for the article reader, built on the AudioPlayer
// component. Play walks through the sentence blocks sequentially: each
// block's Cantonese text is synthesized via /api/speech/tts (Fish Audio,
// Azure fallback), played, and reported to the page so it can highlight
// the block being read.

"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Pause, Play } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AudioPlayerProvider,
  AudioPlayerProgress,
  AudioPlayerTime,
  AudioPlayerDuration,
  AudioPlayerSpeed,
  useAudioPlayer,
} from "@/components/ui/audio-player"
import type { SentenceCard } from "@/utils/sentenceProcessor"

export interface ArticleAudioPlayerHandle {
  /** Pause playback (e.g. when the user taps a bubble to hear it alone). */
  pause: () => void
}

interface ArticleAudioPlayerProps {
  sentences: SentenceCard[]
  /** Called with the index being read, or null when playback stops/ends. */
  onActiveBlockChange?: (index: number | null) => void
  className?: string
}

function PlayerInner(
  { sentences, onActiveBlockChange, className }: ArticleAudioPlayerProps,
  ref: React.Ref<ArticleAudioPlayerHandle>
) {
  const api = useAudioPlayer()
  const [isFetching, setIsFetching] = useState(false)
  // Data URLs per block index, cached for replays and prefetched one ahead
  const audioCache = useRef(new Map<number, string>())
  const pendingFetches = useRef(new Map<number, Promise<string | null>>())
  // Tracks whether sequential playback is engaged (vs. fully stopped)
  const sequenceActive = useRef(false)
  // Index of the block currently loaded/playing. Kept in a ref (NOT provider
  // state) because the provider syncs its state via requestAnimationFrame,
  // which browsers pause in background tabs — sequencing must not depend on it.
  const currentIndexRef = useRef<number | null>(null)

  const fetchBlockAudio = useCallback(
    (index: number): Promise<string | null> => {
      const cached = audioCache.current.get(index)
      if (cached) return Promise.resolve(cached)
      const pending = pendingFetches.current.get(index)
      if (pending) return pending

      const text = sentences[index]?.chinese?.trim()
      if (!text) return Promise.resolve(null)

      const p = (async () => {
        try {
          const res = await fetch("/api/speech/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          })
          if (!res.ok) return null
          const data = await res.json()
          if (!data.audioData) return null
          audioCache.current.set(index, data.audioData)
          return data.audioData as string
        } catch {
          return null
        } finally {
          pendingFetches.current.delete(index)
        }
      })()
      pendingFetches.current.set(index, p)
      return p
    },
    [sentences]
  )

  const playBlock = useCallback(
    async (index: number) => {
      if (index < 0 || index >= sentences.length) return

      sequenceActive.current = true
      setIsFetching(true)
      const src = await fetchBlockAudio(index)
      setIsFetching(false)

      if (!src) {
        toast.error("Unable to synthesize audio for this block")
        sequenceActive.current = false
        onActiveBlockChange?.(null)
        return
      }
      // A stop may have happened while we were fetching
      if (!sequenceActive.current) return

      currentIndexRef.current = index
      onActiveBlockChange?.(index)
      try {
        await api.play({ id: index, src })
      } catch {
        // Autoplay restrictions or interrupted load — stop cleanly
        sequenceActive.current = false
        onActiveBlockChange?.(null)
        return
      }
      // Prefetch the next block while this one plays
      if (index + 1 < sentences.length) void fetchBlockAudio(index + 1)
    },
    [api, fetchBlockAudio, onActiveBlockChange, sentences.length]
  )

  // Advance to the next block when the current clip finishes
  useEffect(() => {
    const el = api.ref.current
    if (!el) return

    const handleEnded = () => {
      if (!sequenceActive.current) return
      const current = currentIndexRef.current ?? -1
      const next = current + 1
      if (next < sentences.length) {
        void playBlock(next)
      } else {
        sequenceActive.current = false
        currentIndexRef.current = null
        onActiveBlockChange?.(null)
      }
    }

    el.addEventListener("ended", handleEnded)
    return () => el.removeEventListener("ended", handleEnded)
  }, [api.ref, playBlock, onActiveBlockChange, sentences.length])

  const handleToggle = () => {
    // Read playback state straight off the element — provider state lags in
    // background tabs (it syncs on requestAnimationFrame).
    const el = api.ref.current
    if (el && !el.paused) {
      void api.pause()
      return
    }
    // Resume the loaded clip if there is one; otherwise start from the top
    if (currentIndexRef.current !== null) {
      sequenceActive.current = true
      onActiveBlockChange?.(currentIndexRef.current)
      void api.play()
    } else {
      void playBlock(0)
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        if (api.isPlaying) void api.pause()
      },
    }),
    [api]
  )

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur",
        className
      )}
    >
      <div className="max-w-[480px] mx-auto flex items-center gap-3 px-4 py-3">
        <Button
          size="icon"
          variant="default"
          className="rounded-full shrink-0"
          onClick={handleToggle}
          disabled={isFetching || sentences.length === 0}
          aria-label={api.isPlaying ? "Pause reading" : "Read article aloud"}
        >
          {isFetching ? (
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : api.isPlaying ? (
            <Pause />
          ) : (
            <Play />
          )}
        </Button>
        <AudioPlayerTime className="text-xs text-muted-foreground tabular-nums" />
        <AudioPlayerProgress className="flex-1" />
        <AudioPlayerDuration className="text-xs text-muted-foreground tabular-nums" />
        <AudioPlayerSpeed />
      </div>
    </div>
  )
}

const PlayerInnerWithRef = forwardRef(PlayerInner)

export const ArticleAudioPlayer = forwardRef<
  ArticleAudioPlayerHandle,
  ArticleAudioPlayerProps
>(function ArticleAudioPlayer(props, ref) {
  return (
    <AudioPlayerProvider>
      <PlayerInnerWithRef {...props} ref={ref} />
    </AudioPlayerProvider>
  )
})
