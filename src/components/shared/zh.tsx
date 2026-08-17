import { cn } from "@/lib/utils"

/**
 * Marks a run of Traditional Chinese (Cantonese) text.
 *
 * The document is `lang="en"` (see layout.tsx), so every Chinese run needs
 * marking or assistive tech reads it with English phonetics — WCAG 3.1.2,
 * "Language of Parts". That matters more here than in most apps: the Chinese
 * *is* the material being studied.
 *
 * `zh-HK` over the more precise `yue-Hant-HK`: screen readers and browser TTS
 * support it far more widely, and it's the tag the app's TTS voices already
 * use (Azure `zh-HK-WanLungNeural`).
 *
 * Renders a plain <span>, so it's safe inside headings, buttons, and labels.
 * For an element you already control, prefer putting lang="zh-HK" on it
 * directly rather than nesting a span.
 */
export function Zh({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span lang="zh-HK" className={cn(className)}>
      {children}
    </span>
  )
}
