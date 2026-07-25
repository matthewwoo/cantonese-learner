// src/app/design-system/elevenlabs-section.tsx
// Gallery section for the ElevenLabs UI audio/voice components
// (installed from the @elevenlabs-ui shadcn registry into src/components/ui/).

"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AudioPlayerProvider,
  AudioPlayerButton,
  AudioPlayerProgress,
  AudioPlayerTime,
  AudioPlayerDuration,
  AudioPlayerSpeed,
} from "@/components/ui/audio-player"
import { StaticWaveform } from "@/components/ui/waveform"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { BarVisualizer } from "@/components/ui/bar-visualizer"
import { Matrix, digits } from "@/components/ui/matrix"
import { Orb } from "@/components/ui/orb"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { VoiceButton, type VoiceButtonState } from "@/components/ui/voice-button"
import { Message, MessageContent } from "@/components/ui/message"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  )
}

/**
 * AudioPlayer exhibit: the full player renders immediately; the play button
 * synthesizes a real Cantonese sample via /api/speech/tts (Fish Audio) on
 * first use, then plays it.
 */
function TTSPlayerDemo() {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "你好！歡迎嚟到粵語學習。我哋一齊講廣東話啦！" }),
      })
      const data = await res.json()
      if (data.audioData) setSrc(data.audioData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AudioPlayerProvider>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          {src ? (
            <AudioPlayerButton
              item={{ id: "tts-sample", src }}
              size="icon"
              variant="secondary"
            />
          ) : (
            <Button
              size="icon"
              variant="secondary"
              onClick={generate}
              disabled={loading}
              aria-label="Generate and play Cantonese sample"
            >
              {loading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              ) : (
                <Play />
              )}
            </Button>
          )}
          <AudioPlayerTime className="text-xs text-muted-foreground" />
          <AudioPlayerProgress className="flex-1" />
          <AudioPlayerDuration className="text-xs text-muted-foreground" />
          <AudioPlayerSpeed />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-2">
        Press play to synthesize 你好！歡迎嚟到粵語學習。 with the live Fish
        Audio voice, then scrub, replay, and change speed.
      </p>
    </AudioPlayerProvider>
  )
}

function VoiceButtonDemo() {
  const [state, setState] = useState<VoiceButtonState>("idle")

  const cycle = () => {
    setState((s) =>
      s === "idle" ? "recording" : s === "recording" ? "processing" : s === "processing" ? "success" : "idle"
    )
  }

  return (
    <div className="flex items-center gap-3">
      <VoiceButton state={state} label="Speak" trailing="⌘K" onPress={cycle} />
      <span className="text-xs text-muted-foreground">state: {state} (click to cycle)</span>
    </div>
  )
}

export function ElevenLabsSection() {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Audio &amp; voice (ElevenLabs UI)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          From the <code className="bg-muted px-1 py-0.5 rounded-sm">@elevenlabs-ui</code>{" "}
          registry — add more with{" "}
          <code className="bg-muted px-1 py-0.5 rounded-sm">
            npx shadcn add @elevenlabs-ui/&lt;name&gt;
          </code>
        </p>
      </div>

      <Section title="Audio player — live Fish Audio TTS">
        <TTSPlayerDemo />
      </Section>

      <Section title="Waveforms">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 space-y-1">
              <StaticWaveform bars={48} height={48} className="text-foreground" />
              <p className="text-xs text-muted-foreground">StaticWaveform</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <LiveWaveform active={false} processing height={48} />
              <p className="text-xs text-muted-foreground">LiveWaveform (processing)</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Agent visualizers">
        <div className="grid grid-cols-3 gap-4 items-stretch">
          <Card>
            <CardContent className="p-4 h-32 flex flex-col items-center justify-center gap-2">
              <BarVisualizer demo state="speaking" barCount={12} className="h-16 w-full" />
              <p className="text-xs text-muted-foreground">BarVisualizer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 h-32 flex flex-col items-center justify-center gap-2">
              <div className="size-20">
                <Orb agentState="listening" />
              </div>
              <p className="text-xs text-muted-foreground">Orb (three.js)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 h-32 flex flex-col items-center justify-center gap-2">
              <Matrix rows={7} cols={5} frames={digits} fps={2} autoplay loop size={6} gap={2} />
              <p className="text-xs text-muted-foreground">Matrix</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Voice button">
        <VoiceButtonDemo />
      </Section>

      <Section title="Message primitives">
        <Card>
          <CardContent className="p-4">
            <Message from="assistant">
              <MessageContent>你好！今日想學啲乜嘢？</MessageContent>
            </Message>
            <Message from="user">
              <MessageContent>我想學點餐嘅講法。</MessageContent>
            </Message>
          </CardContent>
        </Card>
      </Section>
    </section>
  )
}
