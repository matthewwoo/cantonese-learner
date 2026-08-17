// src/app/design-system/voice-pill-section.tsx
// Gallery section for VoicePill — the collapsed-pill / expanded-waveform voice
// control intended to replace the chat tab's text composer.

"use client"

import { useState } from "react"
import { toast } from "sonner"

import { VoicePill, type VoicePillState } from "@/components/ui/voice-pill"

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  )
}

/** Uncontrolled: press once to listen (real mic), press again to stop. */
function LivePillDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <VoicePill onError={(e) => toast.error(e.message)} />
      <span className="text-xs text-muted-foreground">
        Press to open the mic — the pill expands and draws what it hears.
      </span>
    </div>
  )
}

/**
 * Composer preset: how it sits in the chat tab. Stopping hands off to a fake
 * transcription step so the `processing` state is visible.
 */
function ComposerDemo() {
  const [state, setState] = useState<VoicePillState>("idle")

  return (
    <div className="space-y-2">
      {/* No surrounding bar in the chat tab — the pill floats over the
          transcript and expands into the full width on press. */}
      <div className="flex justify-center px-4 py-2">
        <VoicePill
          state={state}
          labels={{ idle: { zh: "按一下講", en: "Tap to speak" } }}
          onStart={() => setState("listening")}
          onStop={() => {
            setState("processing")
            setTimeout(() => {
              setState("idle")
              toast.success("Transcribed 已轉成文字")
            }, 1800)
          }}
          onError={(e) => {
            setState("idle")
            toast.error(e.message)
          }}
          maxDurationSeconds={15}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Controlled, 15s cap. Stop → <code>processing</code> while the transcript
        comes back.
      </p>
    </div>
  )
}

/** The label/indicator treatment for each state, no mic involved. */
function StateMatrix() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <VoicePill state="idle" />
        <VoicePill state="processing" />
        <VoicePill state="error" />
      </div>
      <p className="text-xs text-muted-foreground">
        <code>idle</code> · <code>processing</code> · <code>error</code>.{" "}
        <code>listening</code> is omitted here because rendering it opens the
        microphone — see the two demos above.
      </p>
    </div>
  )
}

export function VoicePillSection() {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Voice pill</h2>
        <p className="text-sm text-muted-foreground mt-1">
          <code className="bg-muted px-1 py-0.5 rounded-sm">
            components/ui/voice-pill
          </code>{" "}
          — a pill that expands into a live{" "}
          <code className="bg-muted px-1 py-0.5 rounded-sm">LiveWaveform</code>{" "}
          while the mic is open. Slated to replace the chat tab composer.
        </p>
      </div>

      <Row title="Press to listen">
        <LivePillDemo />
      </Row>

      <Row title="Chat composer preset">
        <ComposerDemo />
      </Row>

      <Row title="States">
        <StateMatrix />
      </Row>
    </section>
  )
}
