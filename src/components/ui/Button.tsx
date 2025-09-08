// src/components/ui/Button.tsx
// Reusable button component with design system specifications

import React, { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils" // Utility function for combining CSS classes

// Define the props our Button component accepts
// We extend ButtonHTMLAttributes to get all standard button props (onClick, disabled, etc.)
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "Primary" | "Secondary" // Button variants from design system
  text?: string                     // Button text content
  asChild?: boolean                 // For rendering as different element (e.g., Link)
}

// forwardRef allows parent components to get a reference to our button element
// This is useful for focusing, measuring, etc.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "Primary", text, asChild = false, children, ...props }, ref) => {
    
    // Define CSS classes for different button variants based on design system
    const variants = {
      Primary: "bg-[#171515] text-white hover:bg-[#2a2a2a] focus:ring-[#171515]", // Dark background
      Secondary: "bg-[#f5f5f5] text-[#1e1e1e] hover:bg-[#e5e5e5] focus:ring-[#1e1e1e]" // Light background
    }

    // Base button classes from design system
    const buttonClasses = cn(
      // Base styles applied to all buttons
      "inline-flex items-center justify-center rounded-[8px] font-['Söhne'] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
      "px-5 py-3 text-[14px] leading-[21px]", // Design system padding and typography
      variants[variant], // Add variant-specific styles
      className    // Allow custom classes to be added
    )

    // If asChild is true, we need to clone the child element with our classes
    if (asChild) {
      const child = children as React.ReactElement<any>
      if (!child) {
        throw new Error("Button with asChild requires a single child element")
      }
      
      return React.cloneElement(child, {
        className: cn(buttonClasses, child.props?.className),
        ref: ref,
        ...props
      } as any)
    }

    return (
      <button
        className={buttonClasses}
        ref={ref}    // Forward the ref to the button element
        {...props}   // Spread all other props (onClick, disabled, etc.)
      >
        {text || children}
      </button>
    )
  }
)

// Set display name for debugging tools
Button.displayName = "Button"

export { Button }