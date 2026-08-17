// src/components/shared/quick-actions.tsx
// Action button grid inside a card, used on the dashboard.

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface QuickAction {
  label: string
  labelChinese?: string
  icon: string
  onClick: () => void
  variant?: "default" | "secondary" | "outline" | "destructive"
  disabled?: boolean
}

interface QuickActionsProps {
  title: string
  titleChinese?: string
  actions: QuickAction[]
  className?: string
}

export function QuickActions({
  title,
  titleChinese,
  actions,
  className,
}: QuickActionsProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
          {title}
          {titleChinese && (
            <span
              lang="zh-HK"
              className="block text-base font-normal text-muted-foreground mt-1"
            >
              {titleChinese}
            </span>
          )}
        </h3>

        <div className="flex flex-wrap justify-center gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant ?? "default"}
              onClick={action.onClick}
              disabled={action.disabled}
              className="transition-all duration-300 hover:scale-105"
            >
              <span role="img" aria-hidden="true">
                {action.icon}
              </span>
              {action.label}
              {action.labelChinese && (
                <span lang="zh-HK" className="text-sm opacity-90">{action.labelChinese}</span>
              )}
            </Button>
          ))}
        </div>

        {actions.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2" role="img" aria-label="No actions">
              ⚡
            </div>
            <p className="text-muted-foreground text-sm">
              No quick actions available at the moment.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
