// src/components/ui/ProgressStats.tsx
// Progress stats component for displaying learning metrics

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Card } from "./Card"
import { featureColors } from "@/lib/design-tokens"

interface StatItem {
  label: string
  value: number
  color: keyof typeof featureColors
  icon?: string
}

interface ProgressStatsProps {
  title: string
  titleChinese?: string
  stats: StatItem[]
  className?: string
}

const ProgressStats = forwardRef<HTMLDivElement, ProgressStatsProps>(
  ({ title, titleChinese, stats, className }, ref) => {
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, index) => {
            const colors = featureColors[stat.color]
            
            return (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg text-center transition-all duration-300",
                  "hover:shadow-md hover:scale-105"
                )}
                style={{
                  backgroundColor: `${colors.secondary}40`, // 40% opacity
                  border: `1px solid ${colors.secondary}`
                }}
              >
                {stat.icon && (
                  <div className="text-lg mb-1" role="img" aria-label={stat.label}>
                    {stat.icon}
                  </div>
                )}
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{ color: colors.primary }}
                >
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {stats.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2" role="img" aria-label="No data">
              📊
            </div>
            <p className="text-gray-500 text-sm">
              No learning data available yet. Start using the features to see your progress!
            </p>
          </div>
        )}
      </Card>
    )
  }
)

ProgressStats.displayName = "ProgressStats"

export { ProgressStats }
