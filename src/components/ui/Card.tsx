// src/components/ui/Card.tsx
// Container component for grouping related content with nice styling

import { HTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

// Card accepts all standard div attributes
type CardProps = HTMLAttributes<HTMLDivElement>

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Card styling: rounded corners, border, white background, subtle shadow
          "rounded-lg border border-gray-200 bg-white shadow-sm",
          className // Allow custom styling
        )}
        {...props} // Pass through all div props (onClick, etc.)
      />
    )
  }
)

Card.displayName = "Card"

export { Card }