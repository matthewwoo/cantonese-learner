// src/app/design-system/home-section.tsx
// Gallery section for the signed-in home screen: the weekly activity strip
// and the swipeable progress stats, alone and composed.

"use client"

import { ActivityWeek, type ActivityDay } from "@/components/home/activity-week"
import { StatCarousel, type Stat } from "@/components/home/stat-carousel"

function Row({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {children}
    </div>
  )
}

// Fixed sample week — a stable date so the gallery renders the same every
// visit (and doesn't drift as the real calendar moves).
const TODAY = "2026-08-14"

const SAMPLE_WEEK: ActivityDay[] = [
  { date: "2026-08-10", activities: ["review"] },
  { date: "2026-08-11", activities: ["chat", "read"] },
  { date: "2026-08-12", activities: ["review", "chat"] },
  { date: "2026-08-13", activities: [] },
  { date: "2026-08-14", activities: [] },
  { date: "2026-08-15", activities: [] },
  { date: "2026-08-16", activities: [] },
]

const PERFECT_WEEK: ActivityDay[] = SAMPLE_WEEK.map((d) => ({
  ...d,
  activities: ["review"],
}))

const EMPTY_WEEK: ActivityDay[] = SAMPLE_WEEK.map((d) => ({ ...d, activities: [] }))

const SAMPLE_STATS: Stat[] = [
  {
    id: "mastered",
    value: 128,
    label: "已掌握詞語",
    labelEnglish: "Words mastered",
    caption: "Held for 3 weeks or longer",
    tone: "mint",
  },
  {
    id: "chats",
    value: 24,
    label: "對話次數",
    labelEnglish: "Conversations",
    caption: "With your AI tutor",
    tone: "sky",
  },
  {
    id: "lines",
    value: 462,
    label: "已讀句子",
    labelEnglish: "Lines read",
    caption: "Across your articles",
    tone: "blush",
  },
]

export function HomeSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Home screen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What a signed-in learner lands on. A day counts as practised when they
          did at least one exercise — a deck review, a chat, or a reading
          session.
        </p>
      </div>

      <Row
        title="Activity week"
        note="Mid-week, three days practised. Today is an open ring; the rest of the week is dashed."
      >
        <ActivityWeek days={SAMPLE_WEEK} today={TODAY} streak={3} />
      </Row>

      <Row
        title="Activity week — every day practised"
        note="Today keeps its ring on top of the fill, so the day you're standing on stays findable once you've practised."
      >
        <ActivityWeek days={PERFECT_WEEK} today={TODAY} streak={17} />
      </Row>

      <Row title="Activity week — nothing yet" note="No streak badge until the streak is at least 1.">
        <ActivityWeek days={EMPTY_WEEK} today={TODAY} streak={0} />
      </Row>

      <Row
        title="Progress stats"
        note="Swipe, drag, or use ← → after focusing the strip. Dots jump to a card."
      >
        <StatCarousel stats={SAMPLE_STATS} />
      </Row>

      <Row title="Composed" note="Both together, at the phone width the home screen actually uses.">
        <div className="mx-auto w-full max-w-md space-y-4 rounded-xl bg-background p-4 ring-1 ring-border">
          <div>
            <p className="text-2xl font-semibold text-foreground" lang="zh-HK">
              早晨，Matthew
            </p>
            <p className="text-sm text-muted-foreground">Good morning</p>
          </div>
          <ActivityWeek days={SAMPLE_WEEK} today={TODAY} streak={3} />
          <StatCarousel stats={SAMPLE_STATS} />
        </div>
      </Row>
    </section>
  )
}
