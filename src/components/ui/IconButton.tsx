// src/components/ui/IconButton.tsx
// Icon button component for deck cards and other UI elements

import React, { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "12px" | "16px" | "24px" | "32px" | "48px"
  variant?: "default" | "ghost" | "outline"
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "24px", variant = "default", children, ...props }, ref) => {
    
    // Define CSS classes for different sizes
    const sizes = {
      "12px": "w-3 h-3",
      "16px": "w-4 h-4", 
      "24px": "w-6 h-6",
      "32px": "w-8 h-8",
      "48px": "w-12 h-12"
    }

    // Define CSS classes for different variants
    const variants = {
      default: "hover:bg-white/60 focus:bg-white/60",
      ghost: "hover:bg-white/60 focus:bg-white/60",
      outline: "border border-gray-200 hover:bg-white/60 focus:bg-white/60"
    }

    // Base button classes
    const buttonClasses = cn(
      "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed",
      sizes[size],
      variants[variant],
      className
    )

    return (
      <button
        className={buttonClasses}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = "IconButton"

export { IconButton }
