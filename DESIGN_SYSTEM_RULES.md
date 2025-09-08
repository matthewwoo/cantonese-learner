# Cantonese Learning App - Design System Rules

## 🎨 Design Philosophy
This app follows a **bilingual, accessible, and engaging** design approach that supports both English and Traditional Chinese users. The design emphasizes clarity, cultural sensitivity, and learning-focused interactions.

## 🏗️ Design System Structure

### 1. Token Definitions

#### Colors
**Primary Palette:**
- Primary Blue: `#3B82F6` (blue-600) - Main actions, links
- Primary Purple: `#8B5CF6` (purple-600) - Flashcards feature
- Primary Green: `#16A34A` (green-600) - AI Chat feature  
- Primary Cyan: `#0891B2` (cyan-600) - Articles feature
- Primary Orange: `#EA580C` (orange-600) - Accent, highlights

**Neutral Palette:**
- Background: `#FFFFFF` (white)
- Surface: `#F9FAFB` (gray-50)
- Border: `#E5E7EB` (gray-200)
- Text Primary: `#111827` (gray-900)
- Text Secondary: `#6B7280` (gray-600)
- Text Muted: `#9CA3AF` (gray-400)

**Status Colors:**
- Success: `#10B981` (emerald-500)
- Warning: `#F59E0B` (amber-500)
- Error: `#EF4444` (red-500)
- Info: `#3B82F6` (blue-500)

#### Typography
**Font Stack:**
```css
font-family: Arial, Helvetica, sans-serif;
```

**Type Scale (Tailwind):**
- Display: `text-4xl` (36px) - Page titles
- H1: `text-3xl` (30px) - Section headers
- H2: `text-xl` (20px) - Card titles
- H3: `text-lg` (18px) - Subsection headers
- Body: `text-base` (16px) - Main content
- Small: `text-sm` (14px) - Captions, metadata
- XSmall: `text-xs` (12px) - Labels

**Font Weights:**
- Light: `font-light` (300)
- Normal: `font-normal` (400)
- Medium: `font-medium` (500)
- Semibold: `font-semibold` (600)
- Bold: `font-bold` (700)

#### Spacing
**Spacing Scale (Tailwind):**
- XS: `p-1` (4px) - Tight spacing
- S: `p-2` (8px) - Small spacing
- M: `p-4` (16px) - Standard spacing
- L: `p-6` (24px) - Large spacing
- XL: `p-8` (32px) - Extra large spacing
- 2XL: `p-12` (48px) - Section spacing

**Grid Gaps:**
- Small: `gap-3` (12px)
- Medium: `gap-4` (16px)
- Large: `gap-6` (24px)
- Extra Large: `gap-8` (32px)

#### Border Radius
- Small: `rounded-md` (6px) - Buttons, inputs
- Medium: `rounded-lg` (8px) - Cards, containers
- Large: `rounded-xl` (12px) - Modals, large cards
- Full: `rounded-full` - Avatars, circular elements

### 2. Component Library

#### Core Components Location
```
src/components/ui/
├── Button.tsx      # Primary button component
├── Card.tsx        # Container component
└── Input.tsx       # Form input component
```

#### Component Architecture
- **ForwardRef Pattern**: All components use `forwardRef` for accessibility
- **Props Extension**: Components extend native HTML attributes
- **ClassName Merging**: Use `cn()` utility for class combination
- **Variant System**: Components support multiple visual variants

#### Button Component
```typescript
// Button Types: Primary, Secondary
// All buttons use consistent 8px border radius and Söhne Kräftig font
// Padding: px-5 py-3 (20px horizontal, 12px vertical)

interface ButtonProps {
  text?: string;
  type?: "Primary" | "Secondary";
  asChild?: boolean;
}

<Button type="Primary" text="" />
<Button type="Secondary" text="" />
```

**Button Specifications from Figma:**

- **Primary Button (Type="Primary")**: 
  - Background: `#171515` (color/grey/black)
  - Text Color: `#ffffff` (text/text-invert)
  - Border Radius: `8px` (radius/radius-1)
  - Padding: `px-5 py-3` (20px horizontal, 12px vertical)
  - Font: `Söhne Kräftig, 14px, weight: 500, line-height: 21px`
  - Text Alignment: Center
  - Usage: Primary actions, main CTAs, important actions

- **Secondary Button (Type="Secondary")**:
  - Background: `#f5f5f5` (neutral-100 / var(--sds-color-background-default-secondary))
  - Text Color: `#1e1e1e` (var(--sds-color-text-default-default))
  - Border Radius: `8px` (radius/radius-1)
  - Same padding and font as Primary
  - Usage: Secondary actions, alternative options, less prominent actions

- **Typography Standards**:
  - Font Family: `Söhne` with `Kräftig` weight
  - Font Size: `14px`
  - Font Weight: `500` (medium)
  - Line Height: `21px` (1.5 ratio)
  - Text Transform: None (preserve original case)
  - Text Alignment: Center

- **Layout & Spacing**:
  - Padding: `px-5 py-3` (20px horizontal, 12px vertical)
  - Border Radius: `8px` (consistent across all button types)
  - Gap: `gap-2` for internal spacing
  - Full Width: Adapt to container width when needed

#### Card Component
```typescript
// Flexible container with consistent styling
<Card className="p-6 hover:shadow-lg transition-all">
  Card Content
</Card>
```

#### Input Component
```typescript
// Form input with consistent styling
<Input type="text" placeholder="Enter text..." className="custom-class" />
```

### 3. Frameworks & Libraries

#### Core Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: Prisma + SQLite
- **Language**: TypeScript

#### Styling Approach
- **Utility-First**: Tailwind CSS classes
- **Component-Based**: Reusable UI components
- **Responsive**: Mobile-first design
- **Dark Mode**: CSS custom properties support

### 4. Asset Management

#### Asset Structure
```
public/
├── file.svg        # File upload icon
├── globe.svg       # Language/translation icon
├── next.svg        # Next.js logo
├── vercel.svg      # Vercel logo
└── window.svg      # Window/UI icon
```

#### Asset Guidelines
- Use SVG for icons and simple graphics
- Optimize images for web performance
- Store in `public/` directory
- Reference with absolute paths: `/icon.svg`

### 5. Icon System

#### Current Icons
- **Emoji Icons**: Used for feature cards (📚, 🤖, 📖, ⚙️)
- **SVG Icons**: File, globe, window icons
- **Unicode Symbols**: For quick actions and status

#### Icon Guidelines
- Use emojis for feature identification (accessible, universal)
- Use SVG for UI elements and navigation
- Maintain consistent sizing: `text-2xl` for feature icons
- Ensure proper contrast ratios

### 6. Styling Approach

#### CSS Methodology
- **Utility-First**: Tailwind CSS classes
- **Component Scoping**: Component-level styles
- **Global Styles**: Minimal global CSS in `globals.css`
- **Custom Properties**: CSS variables for theming

#### Responsive Design
```typescript
// Mobile-first approach
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
```

#### Animation Guidelines
- **Hover Effects**: Subtle transforms and shadows
- **Transitions**: 300ms duration for smooth interactions
- **Loading States**: Skeleton screens and spinners

### 7. Project Structure

#### Feature Organization
```
src/app/
├── dashboard/      # Main dashboard
├── flashcards/     # Flashcard management
├── chat/          # AI conversation
├── articles/      # Reading materials
└── auth/          # Authentication
```

#### Component Organization
```
src/components/
├── ui/            # Core UI components
├── auth/          # Authentication components
├── chat/          # Chat-specific components
├── flashcards/    # Flashcard components
└── reading-session/ # Reading components
```

## 🎯 Design Principles

### 1. Bilingual Design
- **Dual Language**: Support both English and Traditional Chinese
- **Cultural Sensitivity**: Respect cultural differences
- **Language Hierarchy**: Clear visual hierarchy for dual text

### 2. Learning-Focused
- **Progressive Disclosure**: Show information as needed
- **Clear Navigation**: Easy access to all features
- **Progress Visualization**: Clear learning progress indicators

### 3. Accessibility
- **Color Contrast**: WCAG AA compliance
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators

### 4. Mobile-First
- **Touch Targets**: Minimum 44px touch targets
- **Responsive Layout**: Adapt to all screen sizes
- **Performance**: Fast loading and smooth interactions

## 🔧 Implementation Guidelines

### 1. Component Development
```typescript
// Always use forwardRef for accessibility
const Component = forwardRef<HTMLElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <element
        ref={ref}
        className={cn("base-styles", className)}
        {...props}
      />
    )
  }
)
```

### 2. Styling Patterns
```typescript
// Use Tailwind utilities with custom classes
className={cn(
  "base-styles",
  variantStyles[variant],
  sizeStyles[size],
  className
)}
```

### 3. Responsive Design
```typescript
// Mobile-first responsive classes
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

### 4. Animation Guidelines
```typescript
// Consistent animation patterns
className="transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
```

## 🚀 Missing Elements for Great Design

### 1. Design Tokens System
**Missing**: Centralized design tokens
**Solution**: Create a design tokens file:
```typescript
// src/lib/design-tokens.ts
export const tokens = {
  colors: {
    primary: { /* color definitions */ },
    neutral: { /* neutral colors */ },
    semantic: { /* status colors */ }
  },
  typography: { /* font definitions */ },
  spacing: { /* spacing scale */ },
  borderRadius: { /* border radius values */ }
}
```

### 2. Component Documentation
**Missing**: Component storybook or documentation
**Solution**: Add component documentation with usage examples

### 3. Icon Library
**Missing**: Comprehensive icon system
**Solution**: Implement a proper icon component library

### 4. Loading States
**Missing**: Consistent loading patterns
**Solution**: Create loading components and skeletons

### 5. Error States
**Missing**: Error handling UI patterns
**Solution**: Design error states and error boundaries

### 6. Form Validation
**Missing**: Form validation UI patterns
**Solution**: Create validation components and patterns

### 7. Dark Mode
**Missing**: Complete dark mode implementation
**Solution**: Implement full dark mode support

### 8. Animation Library
**Missing**: Consistent animation system
**Solution**: Create animation utilities and components

## 📋 Next Steps

1. **Create Design Tokens**: Centralize all design values
2. **Build Component Library**: Expand UI component collection
3. **Add Documentation**: Create component documentation
4. **Implement Dark Mode**: Complete dark mode support
5. **Add Animations**: Create animation system
6. **Improve Accessibility**: Enhance accessibility features
7. **Add Loading States**: Implement consistent loading patterns
8. **Create Error States**: Design error handling UI

## 🎨 Figma Integration

When working with Figma designs:
1. Extract design tokens from Figma
2. Match component variants to Figma components
3. Use consistent naming conventions
4. Maintain design system consistency
5. Test responsive behavior
6. Ensure accessibility compliance
