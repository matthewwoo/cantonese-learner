// src/components/ui/Skeleton.tsx
// Skeleton loading component for content placeholders

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-gray-200",
          className
        )}
        style={{
          width: width,
          height: height,
        }}
        aria-label="Loading content"
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

// Predefined skeleton components
export const SkeletonText = ({ lines = 1, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          "h-4",
          i === lines - 1 ? "w-3/4" : "w-full"
        )}
      />
    ))}
  </div>
)

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("p-6 space-y-4", className)}>
    <Skeleton className="h-6 w-1/2" />
    <SkeletonText lines={3} />
    <Skeleton className="h-10 w-full" />
  </div>
)

export { Skeleton }
