// src/components/ui/voice-pill.tsx
// A single-control voice affordance: a compact pill that expands into a live
// microphone waveform while listening. Built for the chat composer, but
// generic — it owns no transcription logic, only presentation + mic capture
// (capture lives inside LiveWaveform, which hands back the MediaStream).
//
// Design notes: colors/radii come from tokens only (see DESIGN.md). Labels are
// bilingual (Chinese leads, English supports) and overridable per state.

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiveWaveform } from "@/components/ui/live-waveform"

export type VoicePillState = "idle" | "listening" | "processing" | "error"

export type VoicePillLabel = { zh: string; en: string }

const DEFAULT_LABELS: Record<VoicePillState, VoicePillLabel> = {
  idle: { zh: "待機", en: "Standby" },
  listening: { zh: "聽緊", en: "Listening" },
  processing: { zh: "處理中", en: "Thinking" },
  error: { zh: "冇權限", en: "Mic blocked" },
}

export interface VoicePillProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onError"> {
  /**
   * Controlled state. Omit to let the pill manage `idle` ↔ `listening`
   * itself (`processing` / `error` are always caller-driven, except for the
   * mic-permission failure the pill detects on its own).
   */
  state?: VoicePillState

  /** Fired when the user starts listening (pill was idle). */
  onStart?: () => void

  /** Fired when the user stops listening (pill was listening). */
  onStop?: () => void

  /** The live mic stream, once granted — hand this to your STT pipeline. */
  onStreamReady?: (stream: MediaStream) => void

  /** Mic permission / device failure. */
  onError?: (error: Error) => void

  /** Override any state's bilingual label, e.g. `{ idle: { zh: "按一下講", en: "Tap to speak" } }`. */
  labels?: Partial<Record<VoicePillState, VoicePillLabel>>

  /** Input device from `MicSelector`, if the app offers a picker. */
  deviceId?: string

  /** Show elapsed listening time on the right edge. @default true */
  showTimer?: boolean

  /** Auto-stop after this many seconds of listening. `0` disables. @default 0 */
  maxDurationSeconds?: number

  /** Waveform gain. @default 1.6 */
  sensitivity?: number

  /** Fill the container instead of hugging its label when idle. @default false */
  fullWidth?: boolean
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export const VoicePill = React.forwardRef<HTMLButtonElement, VoicePillProps>(
  (
    {
      state: controlledState,
      onStart,
      onStop,
      onStreamReady,
      onError,
      labels,
      deviceId,
      showTimer = true,
      maxDurationSeconds = 0,
      sensitivity = 1.6,
      fullWidth = false,
      disabled,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [uncontrolledState, setUncontrolledState] =
      React.useState<VoicePillState>("idle")
    const [micError, setMicError] = React.useState(false)
    const [elapsed, setElapsed] = React.useState(0)

    const state = micError
      ? "error"
      : (controlledState ?? uncontrolledState)

    const isListening = state === "listening"
    const isProcessing = state === "processing"
    const isExpanded = isListening || isProcessing

    const label = { ...DEFAULT_LABELS[state], ...labels?.[state] }

    // Elapsed timer — runs only while listening, resets on stop.
    React.useEffect(() => {
      if (!isListening) {
        setElapsed(0)
        return
      }
      const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
      return () => clearInterval(interval)
    }, [isListening])

    const stop = React.useCallback(() => {
      if (controlledState === undefined) setUncontrolledState("idle")
      onStop?.()
    }, [controlledState, onStop])

    // Optional hard cap on a single utterance.
    React.useEffect(() => {
      if (!isListening || maxDurationSeconds <= 0) return
      if (elapsed >= maxDurationSeconds) stop()
    }, [isListening, maxDurationSeconds, elapsed, stop])

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || isProcessing) return

      if (isListening) {
        stop()
        return
      }

      setMicError(false)
      if (controlledState === undefined) setUncontrolledState("listening")
      onStart?.()
    }

    const handleMicError = React.useCallback(
      (error: Error) => {
        setMicError(true)
        if (controlledState === undefined) setUncontrolledState("idle")
        onError?.(error)
      },
      [controlledState, onError]
    )

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        aria-pressed={isListening}
        aria-label={
          isListening
            ? "Stop listening 停止收音"
            : "Start voice input 開始講嘢"
        }
        data-state={state}
        className={cn(
          // Pill shell. Height clears the 44px touch-target floor and grows
          // to make room for the waveform once expanded.
          "group relative flex h-12 items-center gap-3 overflow-hidden rounded-full border px-4",
          "border-border bg-card text-foreground shadow-sm",
          "transition-[width,height,background-color,border-color,box-shadow] duration-300 ease-out",
          "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "hover:bg-muted disabled:pointer-events-none disabled:opacity-60",
          // Collapsed width is fixed (not content-hugging) so the expansion can
          // animate — `width: fit-content` doesn't interpolate. 13rem fits every
          // default label; override via className if yours are longer.
          fullWidth ? "w-full" : "w-52 max-w-full",
          isExpanded && "h-16 w-full gap-4 bg-card shadow-md hover:bg-card",
          isListening && "border-ring/25",
          state === "error" && "border-destructive/40",
          className
        )}
        {...props}
      >
        {/* Status dot — the pill's only always-on indicator. */}
        <span
          aria-hidden
          className={cn(
            "size-2.5 shrink-0 rounded-full transition-colors duration-300",
            state === "idle" && "bg-primary",
            isListening && "bg-destructive animate-pulse",
            isProcessing && "bg-muted-foreground animate-pulse",
            state === "error" && "bg-destructive"
          )}
        />

        {/* Bilingual label: Chinese leads, English supports. Custom labels
            longer than the collapsed width ellipsize rather than clip. */}
        <span className="flex min-w-0 shrink-0 items-baseline gap-1.5">
          <span lang="zh-HK" className="text-sm font-medium whitespace-nowrap">
            {label.zh}
          </span>
          <span
            className={cn(
              "truncate text-xs text-muted-foreground transition-opacity duration-200",
              // The English support line is the first thing to yield space
              // when the waveform takes over on narrow screens.
              isExpanded && "hidden sm:inline"
            )}
          >
            {label.en}
          </span>
        </span>

        {/* Waveform region — mounts only while expanded so the mic stream is
            opened on press and released on stop. */}
        <span
          className={cn(
            "relative flex min-w-0 flex-1 items-center transition-opacity duration-300",
            isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {isExpanded && (
            <LiveWaveform
              active={isListening}
              processing={isProcessing}
              deviceId={deviceId}
              mode="static"
              barWidth={3}
              barGap={2}
              barRadius={4}
              barHeight={3}
              height={32}
              sensitivity={sensitivity}
              smoothingTimeConstant={0.85}
              fadeEdges
              fadeWidth={16}
              onError={handleMicError}
              onStreamReady={onStreamReady}
              className="animate-in fade-in text-foreground duration-300"
            />
          )}
        </span>

        {showTimer && isListening && (
          <span className="animate-in fade-in shrink-0 font-mono text-xs text-muted-foreground tabular-nums duration-300">
            {formatElapsed(elapsed)}
          </span>
        )}

        {/* Announce state changes for screen readers without duplicating the
            visible label into the accessible name. */}
        <span aria-live="polite" className="sr-only">
          {label.en}
        </span>
      </button>
    )
  }
)

VoicePill.displayName = "VoicePill"
