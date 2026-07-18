// src/components/ui/FeatureCard.tsx
// Reusable feature card component with consistent styling and accessibility

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Card } from "./Card"
import { Button } from "./Button"
import { featureColors } from "@/lib/design-tokens"

interface FeatureCardProps {
  title: string
  titleChinese?: string
  description: string
  icon: string
  buttonText: string
  buttonTextChinese?: string
  onClick: () => void
  disabled?: boolean
  feature: "flashcards" | "chat" | "articles" | "account"
  className?: string
}

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ 
    title, 
    titleChinese, 
    description, 
    icon, 
    buttonText, 
    buttonTextChinese,
    onClick, 
    disabled = false, 
    feature,
    className 
  }, ref) => {
    const colors = featureColors[feature]
    
    return (
      <Card 
        ref={ref}
        className={cn(
          "p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer",
          "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${title} - ${description}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) onClick()
          }
        }}
      >
        <div className="text-center">
          {/* Icon */}
          <div 
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
              "bg-gradient-to-br transition-colors duration-300"
            )}
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.hover} 100%)`
            }}
          >
            <span className="text-2xl" role="img" aria-label={title}>
              {icon}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {title}
          </h2>
          {titleChinese && (
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {titleChinese}
            </h3>
          )}

          {/* Description */}
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            {description}
          </p>

          {/* Button */}
          <Button 
            variant="Primary"
            text={buttonText}
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) onClick()
            }}
            disabled={disabled}
            className="w-full"
          >
            {buttonTextChinese && (
              <span className="block text-sm opacity-90 mt-1">{buttonTextChinese}</span>
            )}
          </Button>
        </div>
      </Card>
    )
  }
)

FeatureCard.displayName = "FeatureCard"

export { FeatureCard }
