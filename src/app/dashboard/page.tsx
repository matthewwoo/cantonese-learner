// src/app/dashboard/page.tsx
// Home — where signing in lands you. Answers two questions before anything
// else: did I practise this week, and how far have I come?

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useUser } from "@/lib/supabase/use-user"
import { createClient } from "@/lib/supabase/client"
import { getPracticeHistory, getProgressStats } from "@/lib/data/stats"
import {
  buildWeek,
  currentStreak,
  toDayKey,
  type PracticeMap,
} from "@/lib/activity/practice-days"
import { ActivityWeek, type ActivityDay } from "@/components/home/activity-week"
import { StatCarousel, type Stat } from "@/components/home/stat-carousel"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/shared/spinner"

interface HomeData {
  today: string
  week: ActivityDay[]
  streak: number
  stats: Stat[]
}

function toStats(counts: {
  wordsMastered: number
  conversations: number
  linesRead: number
}): Stat[] {
  return [
    {
      id: "mastered",
      value: counts.wordsMastered,
      label: "已掌握詞語",
      labelEnglish: "Words mastered",
      caption: "Held for 3 weeks or longer",
      tone: "mint",
    },
    {
      id: "chats",
      value: counts.conversations,
      label: "對話次數",
      labelEnglish: "Conversations",
      caption: "With your AI tutor",
      tone: "sky",
    },
    {
      id: "lines",
      value: counts.linesRead,
      label: "已讀句子",
      labelEnglish: "Lines read",
      caption: "Across your articles",
      tone: "blush",
    },
  ]
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

export default function HomePage() {
  const { user, status } = useUser()
  const router = useRouter()
  const [data, setData] = useState<HomeData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    const supabase = createClient()

    Promise.all([getPracticeHistory(supabase), getProgressStats(supabase)])
      .then(([practice, counts]: [PracticeMap, Awaited<ReturnType<typeof getProgressStats>>]) => {
        if (cancelled) return
        // Bucketed against the browser's clock, so "today" is the learner's
        // today wherever they are.
        const today = toDayKey(new Date())
        setData({
          today,
          week: buildWeek(practice, today),
          streak: currentStreak(practice, today),
          stats: toStats(counts),
        })
      })
      .catch((error) => {
        console.error("Failed to load home stats", error)
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [status])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 px-4 py-6">
        {failed ? (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your progress just now. Pull down to refresh, or try again
            in a moment.
          </p>
        ) : data ? (
          <div className="space-y-4">
            <ActivityWeek days={data.week} today={data.today} streak={data.streak} />
            <StatCarousel stats={data.stats} />
          </div>
        ) : (
          <HomeSkeleton />
        )}
      </div>
    </div>
  )
}
