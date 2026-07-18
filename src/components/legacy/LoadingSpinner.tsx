// src/components/ui/LoadingSpinner.tsx
// Reusable loading spinner component with different sizes and colors

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { tokens } from "@/lib/design-tokens"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  color?: "primary" | "secondary" | "white"
  className?: string
}

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = "md", color = "primary", className }, ref) => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-6 h-6", 
      lg: "w-8 h-8",
      xl: "w-12 h-12"
    }

    const colorClasses = {
      primary: "text-blue-600",
      secondary: "text-gray-600",
      white: "text-white"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent",
          sizeClasses[size],
          colorClasses[color],
          className
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    )
  }
)

LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }
