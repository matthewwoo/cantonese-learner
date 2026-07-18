// src/components/ui/QuickActions.tsx
// Quick actions component for common user actions

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Card } from "./Card"
import { Button } from "./Button"
import { featureColors } from "@/lib/design-tokens"

interface QuickAction {
  label: string
  labelChinese?: string
  icon: string
  onClick: () => void
  variant?: "Primary" | "Secondary"
  color?: keyof typeof featureColors
  disabled?: boolean
}

interface QuickActionsProps {
  title: string
  titleChinese?: string
  actions: QuickAction[]
  className?: string
}

const QuickActions = forwardRef<HTMLDivElement, QuickActionsProps>(
  ({ title, titleChinese, actions, className }, ref) => {
    return (
      <Card ref={ref} className={cn("p-6", className)}>
        {/* Header */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          {title}
          {titleChinese && (
            <span className="block text-base font-normal text-gray-600 mt-1">
              {titleChinese}
            </span>
          )}
        </h3>

        {/* Actions Grid */}
        <div className="flex flex-wrap justify-center gap-3">
          {actions.map((action, index) => {
            const colors = action.color ? featureColors[action.color] : featureColors.account
            
            return (
              <Button
                key={index}
                variant={action.variant || "Primary"}
                text={action.label}
                onClick={action.onClick}
                disabled={action.disabled}
                className="transition-all duration-300 hover:scale-105"
              >
                <span className="mr-2" role="img" aria-label={action.label}>
                  {action.icon}
                </span>
                {action.labelChinese && (
                  <span className="block text-sm opacity-90 mt-1">{action.labelChinese}</span>
                )}
              </Button>
            )
          })}
        </div>

        {/* Empty State */}
        {actions.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2" role="img" aria-label="No actions">
              ⚡
            </div>
            <p className="text-gray-500 text-sm">
              No quick actions available at the moment.
            </p>
          </div>
        )}
      </Card>
    )
  }
)

QuickActions.displayName = "QuickActions"

export { QuickActions }
