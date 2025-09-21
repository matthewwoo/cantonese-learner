// src/components/ui/Input.tsx
// Reusable input component with consistent styling

import { InputHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

// Our Input component accepts all standard HTML input attributes
type InputProps = InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type} // Input type: text, email, password, etc.
        className={cn(
          // Base input styles - consistent look and feel
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#757575] placeholder:text-[#757575] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
          className // Allow custom styles to override defaults
        )}
        ref={ref}    // Forward ref for parent component access
        {...props}   // Pass through all HTML input props
      />
    )
  }
)

Input.displayName = "Input"

export { Input }