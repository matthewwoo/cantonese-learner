// src/lib/design-tokens.ts
// Centralized design tokens for consistent styling across the app

export const tokens = {
  colors: {
    primary: {
      blue: '#3B82F6',    // blue-600
      purple: '#8B5CF6',  // purple-600
      green: '#16A34A',   // green-600
      cyan: '#0891B2',    // cyan-600
      orange: '#EA580C',  // orange-600
    },
    neutral: {
      white: '#FFFFFF',
      gray50: '#F9FAFB',
      gray100: '#F3F4F6',
      gray200: '#E5E7EB',
      gray300: '#D1D5DB',
      gray400: '#9CA3AF',
      gray500: '#6B7280',
      gray600: '#4B5563',
      gray700: '#374151',
      gray800: '#1F2937',
      gray900: '#111827',
    },
    semantic: {
      success: '#10B981', // emerald-500
      warning: '#F59E0B', // amber-500
      error: '#EF4444',   // red-500
      info: '#3B82F6',    // blue-500
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      gradient: 'linear-gradient(135deg, #EEF2FF 0%, #F3E8FF 100%)',
    }
  },
  typography: {
    fontFamily: {
      sans: 'Arial, Helvetica, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    }
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
  },
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    }
  }
}

// Helper function to get CSS custom properties
export const getCSSVariables = () => {
  const cssVars: Record<string, string> = {}
  
  // Flatten the tokens object and create CSS custom properties
  const flattenObject = (obj: any, prefix = '') => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        flattenObject(obj[key], `${prefix}${key}-`)
      } else {
        cssVars[`--${prefix}${key}`] = obj[key]
      }
    }
  }
  
  flattenObject(tokens)
  return cssVars
}

// Feature-specific color mappings
export const featureColors = {
  flashcards: {
    primary: tokens.colors.primary.purple,
    secondary: '#F3E8FF',
    hover: '#7C3AED',
  },
  chat: {
    primary: tokens.colors.primary.green,
    secondary: '#ECFDF5',
    hover: '#15803D',
  },
  articles: {
    primary: tokens.colors.primary.cyan,
    secondary: '#ECFEFF',
    hover: '#0E7490',
  },
  account: {
    primary: tokens.colors.primary.blue,
    secondary: '#EFF6FF',
    hover: '#2563EB',
  }
}
