/**
 * Types and styling constants for EconomicCodeReference component
 *
 * Data is passed via MDX props for easier translation support.
 * The component teaches Romania's economic classification system
 * with emphasis on Code 71 (investments) as a key "red flag" indicator.
 */

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

/** Subcode within an economic code (e.g., 10.01, 10.02 under Code 10) */
export interface EconomicSubcodeProp {
  readonly code: string
  readonly name: string
  readonly examples?: readonly string[]
}

/** Individual economic code with optional subcodes */
export interface EconomicCodeProp {
  readonly code: string
  readonly name: string
  readonly description?: string
  readonly executionRate?: number // e.g., 95 for 95%
  readonly isWarningFlag?: boolean
  readonly subcodes?: readonly EconomicSubcodeProp[]
}

/** Category grouping codes by type */
export interface EconomicCategoryProp {
  readonly type: 'current' | 'capital'
  readonly executionRate: number // Average for the category
  readonly codes: readonly EconomicCodeProp[]
}

/** Text content passed from MDX for i18n support */
export interface EconomicCodeReferenceTextProp {
  readonly title?: string
  readonly subtitle?: string
  readonly currentLabel: string // "CURRENT EXPENSES"
  readonly currentDescription: string // "Day-to-day operations"
  readonly capitalLabel: string // "CAPITAL EXPENSES"
  readonly capitalDescription: string // "Investments"
  readonly executionLabel: string // "execution"
  readonly warningLabel: string // "WATCH CLOSELY"
  readonly explorerLabel?: string // "Open in Budget Explorer"
}

/** Full props for EconomicCodeReference component */
export interface EconomicCodeReferenceProps {
  readonly categories: readonly EconomicCategoryProp[]
  readonly text: EconomicCodeReferenceTextProp
  readonly explorerUrl?: string
}

// -----------------------------------------------------------------------------
// COLOR SYSTEM
// -----------------------------------------------------------------------------

export type CategoryType = 'current' | 'capital'

export const CATEGORY_COLORS = {
  current: {
    bg: 'bg-card',
    bgHover: 'hover:bg-muted/30',
    border: 'border-border',
    bar: 'bg-primary',
    barBg: 'bg-primary/10',
    text: 'text-foreground',
    textMuted: 'text-muted-foreground',
    badge: 'bg-primary/10 text-primary border-primary/30',
    icon: 'text-primary',
    codeBg: 'bg-card',
  },
  capital: {
    bg: 'bg-status-blocked-bg',
    bgHover: 'hover:bg-status-blocked-bg',
    border: 'border-status-blocked-fg/30',
    bar: 'bg-status-blocked-fg',
    barBg: 'bg-card',
    text: 'text-status-blocked-fg',
    textMuted: 'text-status-blocked-fg',
    badge: 'bg-status-blocked-bg text-status-blocked-fg border-status-blocked-fg/30',
    icon: 'text-status-blocked-fg',
    codeBg: 'bg-card',
    // Warning-specific styles for Code 71
    warningBadge: 'bg-status-blocked-fg text-background border-none shadow-sm',
    warningPulse: 'animate-pulse-subtle',
  },
} as const
