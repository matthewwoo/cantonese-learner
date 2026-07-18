// src/components/shared/spinner.tsx
// Loading spinner built on lucide + CVA (shadcn has no spinner primitive).

import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      sm: "size-4",
      md: "size-6",
      lg: "size-8",
      xl: "size-12",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      inverse: "text-primary-foreground",
    },
  },
  defaultVariants: { size: "md", tone: "default" },
})

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
}

export function Spinner({ size, tone, className }: SpinnerProps) {
  return (
    <span role="status" aria-label="Loading" className="inline-block">
      <Loader2 className={cn(spinnerVariants({ size, tone }), className)} />
      <span className="sr-only">Loading...</span>
    </span>
  )
}
