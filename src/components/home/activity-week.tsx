// src/components/home/activity-week.tsx
// Home: "did you practise today?" strip — seven day circles plus a streak count.
//
// A day counts as practised when the learner did *at least one* exercise that
// day: a deck review, a chat, or a reading session. Which of the three doesn't
// change how the day renders — it only enriches the accessible label — so the
// strip stays a single, unambiguous yes/no per day.

import { Check, Flame } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Zh } from "@/components/shared/zh"
import { cn } from "@/lib/utils"

export type ActivityKind = "review" | "chat" | "read"

export interface ActivityDay {
  /** Local-time calendar date, `YYYY-MM-DD`. */
  date: string
  /** Exercises completed that day. Empty means a rest day. */
  activities: ActivityKind[]
}

interface ActivityWeekProps {
  /** Exactly seven days, Monday → Sunday. */
  days: ActivityDay[]
  /** Today's local date, `YYYY-MM-DD` — drives the highlighted column. */
  today: string
  /** Consecutive practised days, counted across full history, not just this week. */
  streak: number
  className?: string
}

/**
 * Monday-first weekday labels. Chinese leads (DESIGN.md "Bilingual first");
 * the English initial sits one step down the scale beneath it, and the full
 * English name rides along in the per-day accessible label.
 */
const WEEKDAYS = [
  { zh: "一", en: "M", full: "Monday" },
  { zh: "二", en: "T", full: "Tuesday" },
  { zh: "三", en: "W", full: "Wednesday" },
  { zh: "四", en: "T", full: "Thursday" },
  { zh: "五", en: "F", full: "Friday" },
  { zh: "六", en: "S", full: "Saturday" },
  { zh: "日", en: "S", full: "Sunday" },
] as const

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  review: "a deck review",
  chat: "a chat",
  read: "a reading session",
}

type DayState = "done" | "today" | "missed" | "upcoming"

// ISO dates sort lexicographically, so plain string compares are enough here —
// no Date parsing, and no timezone to get wrong.
function dayState(day: ActivityDay, today: string): DayState {
  if (day.activities.length > 0) return "done"
  if (day.date === today) return "today"
  return day.date < today ? "missed" : "upcoming"
}

function describeDay(
  day: ActivityDay,
  state: DayState,
  label: string,
  isToday: boolean
): string {
  const done = day.activities.map((a) => ACTIVITY_LABELS[a]).join(", ")
  const name = isToday ? `${label}, today` : label
  if (state === "done") return `${name}: practised — ${done}`
  if (state === "today") return `${name}: no practice yet`
  if (state === "missed") return `${name}: no practice`
  return `${name}: upcoming`
}

const TODAY_RING = "ring-2 ring-ring ring-offset-2 ring-offset-card"

const CIRCLE_STATES: Record<DayState, string> = {
  // Practised — the one filled, celebratory state.
  done: "bg-deck-mint text-foreground",
  // Today, still open: an empty ring inviting the day to be filled in.
  today: `bg-card text-muted-foreground ${TODAY_RING}`,
  missed: "bg-muted text-muted-foreground",
  upcoming: "bg-card border border-dashed border-border text-muted-foreground",
}

export function ActivityWeek({ days, today, streak, className }: ActivityWeekProps) {
  const practised = days.filter((d) => d.activities.length > 0).length

  return (
    <Card className={cn("gap-3", className)}>
      <CardContent className="flex items-center justify-between">
        <h2 className="font-medium text-foreground">
          <Zh>本週</Zh>{" "}
          <span className="text-muted-foreground font-normal">This week</span>
        </h2>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-4xl bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <Flame className="size-3.5" aria-hidden="true" />
            {streak}
            <span className="sr-only">
              {` day${streak === 1 ? "" : "s"} in a row`}
            </span>
            <Zh aria-hidden="true">天</Zh>
          </span>
        )}
      </CardContent>

      <CardContent>
        <ul className="flex items-start justify-between">
          {days.map((day, i) => {
            const weekday = WEEKDAYS[i]
            const state = dayState(day, today)
            // Tracked separately from `state`: a practised today is `done`, and
            // without this the day the learner is standing on loses its marker
            // the moment they practise — exactly when they look at the strip.
            const isToday = day.date === today
            return (
              <li key={day.date} className="flex flex-col items-center gap-1.5">
                <span className="flex flex-col items-center leading-none">
                  <Zh
                    className={cn(
                      "text-sm",
                      isToday ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {weekday.zh}
                  </Zh>
                  <span
                    className={cn(
                      "mt-0.5 text-[10px]",
                      isToday ? "text-muted-foreground" : "text-muted-foreground/70"
                    )}
                    aria-hidden="true"
                  >
                    {weekday.en}
                  </span>
                </span>
                <span
                  role="img"
                  aria-label={describeDay(day, state, weekday.full, isToday)}
                  className={cn(
                    "grid size-10 place-items-center rounded-full transition-colors",
                    CIRCLE_STATES[state],
                    isToday && state === "done" && TODAY_RING
                  )}
                >
                  {state === "done" && <Check className="size-5" aria-hidden="true" />}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          <Zh>本週練習咗 {practised} 日</Zh>
          <span aria-hidden="true"> · </span>
          {practised === 1 ? "1 day practised" : `${practised} days practised`}
        </p>
      </CardContent>
    </Card>
  )
}
