// src/components/ui/Button.tsx
// Reusable button component with different styles and sizes

import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils" // Utility function for combining CSS classes

// Define the props our Button component accepts
// We extend ButtonHTMLAttributes to get all standard button props (onClick, disabled, etc.)
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" // Different visual styles
  size?: "sm" | "md" | "lg"                 // Different sizes
}

// forwardRef allows parent components to get a reference to our button element
// This is useful for focusing, measuring, etc.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    
    // Define CSS classes for different button variants
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500", // Solid blue
      outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50", // White with border  
      ghost: "text-gray-700 hover:bg-gray-100" // Transparent background
    }

    // Define CSS classes for different sizes
    const sizes = {
      sm: "px-3 py-1.5 text-sm", // Small: less padding, smaller text
      md: "px-4 py-2",           // Medium: standard size
      lg: "px-6 py-3 text-lg"    // Large: more padding, bigger text
    }

    return (
      <button
        className={cn(
          // Base styles applied to all buttons
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant], // Add variant-specific styles
          sizes[size],      // Add size-specific styles  
          className         // Allow custom classes to be added
        )}
        ref={ref}    // Forward the ref to the button element
        {...props}   // Spread all other props (onClick, disabled, etc.)
      />
    )
  }
)

// Set display name for debugging tools
Button.displayName = "Button"

export { Button }