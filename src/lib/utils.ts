// src/lib/utils.ts
// Utility functions used throughout the application

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// This function intelligently combines CSS class names
// It's especially useful with Tailwind CSS where you might have conflicting classes
export function cn(...inputs: ClassValue[]) {
  // clsx() - combines class names and handles conditionals
  // twMerge() - resolves Tailwind CSS conflicts (e.g., if you have both "p-4" and "p-6", it keeps only "p-6")
  return twMerge(clsx(inputs))
}

// Example usage:
// cn("text-red-500", "text-blue-500") → "text-blue-500" (blue wins)
// cn("p-4", condition && "p-6") → "p-6" if condition is true
// cn("bg-white", someClass, { "text-red-500": isError }) → combines all classes