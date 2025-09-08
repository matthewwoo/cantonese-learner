# UI Component Library

This directory contains reusable UI components that follow our design system rules.

## Components

### Button
A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui'

<Button variant="default" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Props:**
- `variant`: "default" | "outline" | "ghost"
- `size`: "sm" | "md" | "lg"
- `disabled`: boolean
- All standard button HTML attributes

### Card
A container component for grouping related content.

```tsx
import { Card } from '@/components/ui'

<Card className="p-6">
  Card content
</Card>
```

### Input
A form input component with consistent styling.

```tsx
import { Input } from '@/components/ui'

<Input type="text" placeholder="Enter text..." />
```

### LoadingSpinner
A loading spinner with different sizes and colors.

```tsx
import { LoadingSpinner } from '@/components/ui'

<LoadingSpinner size="md" color="primary" />
```

**Props:**
- `size`: "sm" | "md" | "lg" | "xl"
- `color`: "primary" | "secondary" | "white"

### Skeleton
Skeleton loading components for content placeholders.

```tsx
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui'

<Skeleton className="h-4 w-full" />
<SkeletonText lines={3} />
<SkeletonCard />
```

### FeatureCard
A card component specifically for feature navigation.

```tsx
import { FeatureCard } from '@/components/ui'

<FeatureCard
  title="Flashcards"
  titleChinese="閃卡"
  description="Study vocabulary with smart spaced repetition."
  icon="📚"
  buttonText="Manage Flashcards"
  buttonTextChinese="管理閃卡"
  onClick={() => router.push('/flashcards')}
  feature="flashcards"
/>
```

**Props:**
- `title`: string
- `titleChinese?`: string
- `description`: string
- `icon`: string
- `buttonText`: string
- `buttonTextChinese?`: string
- `onClick`: () => void
- `disabled?`: boolean
- `feature`: "flashcards" | "chat" | "articles" | "account"

### ProgressStats
A component for displaying learning progress statistics.

```tsx
import { ProgressStats } from '@/components/ui'

<ProgressStats
  title="Learning Progress"
  titleChinese="學習進度"
  stats={[
    { label: "Flashcard Sets", value: 5, color: "flashcards", icon: "📚" }
  ]}
/>
```

### QuickActions
A component for displaying quick action buttons.

```tsx
import { QuickActions } from '@/components/ui'

<QuickActions
  title="Quick Actions"
  titleChinese="快速操作"
  actions={[
    {
      label: "Create Flashcard Set",
      labelChinese: "創建閃卡組",
      icon: "📝",
      onClick: () => router.push('/flashcards'),
      color: "flashcards"
    }
  ]}
/>
```

## Design Tokens

All components use design tokens from `@/lib/design-tokens` for consistent styling:

- Colors (primary, neutral, semantic)
- Typography (font families, sizes, weights)
- Spacing (xs, sm, md, lg, xl, 2xl, 3xl)
- Border radius (sm, md, lg, xl, full)
- Shadows (sm, md, lg, xl)
- Animation durations and easing

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance

## Usage Guidelines

1. **Import from index**: Use `import { Component } from '@/components/ui'`
2. **Use design tokens**: Reference tokens for consistent styling
3. **Follow patterns**: Use the established component patterns
4. **Test accessibility**: Ensure keyboard navigation and screen reader support
5. **Maintain consistency**: Use the same variants and sizes across the app
