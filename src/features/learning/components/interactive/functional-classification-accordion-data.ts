/**
 * Types and styling constants for FunctionalClassificationAccordion component
 *
 * Data is passed via MDX props for easier translation support.
 * The component teaches Romania's functional classification hierarchy
 * (COFOG-adapted) organized into 5 Parts (Părți).
 */

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

/** Individual classification code */
export interface ClassificationCodeProp {
  readonly code: string
  readonly name: string
  readonly description?: string
}

/** A functional classification Part (Parte) */
export interface FunctionalPartProp {
  readonly id: string
  readonly name: string
  readonly codes: readonly ClassificationCodeProp[]
  readonly color?: PartColor
}

/** Text content passed from MDX */
export interface FunctionalClassificationTextProp {
  readonly title?: string
  readonly subtitle?: string
  readonly explorerLabel?: string
}

/** Full props for FunctionalClassificationAccordion component */
export interface FunctionalClassificationAccordionProps {
  readonly parts: readonly FunctionalPartProp[]
  readonly text?: FunctionalClassificationTextProp
  readonly highlightCodes?: readonly string[]
  readonly explorerUrl?: string
}

// -----------------------------------------------------------------------------
// COLOR VARIANTS
// -----------------------------------------------------------------------------

export type PartColor = 'slate' | 'red' | 'emerald' | 'blue' | 'purple'

/**
 * The parts are told apart by their number and name; the dot that marks a highlighted code takes
 * `chart-1…4` in the order the parts are listed (the fifth repeats the first).
 */
export const PART_COLORS = {
  slate: {
    badge: 'bg-muted text-foreground',
    border: 'border-border',
    hover: 'hover:bg-muted/50',
    accent: 'bg-chart-1',
  },
  red: {
    badge: 'bg-muted text-foreground',
    border: 'border-border',
    hover: 'hover:bg-muted/50',
    accent: 'bg-chart-2',
  },
  emerald: {
    badge: 'bg-muted text-foreground',
    border: 'border-border',
    hover: 'hover:bg-muted/50',
    accent: 'bg-chart-3',
  },
  blue: {
    badge: 'bg-muted text-foreground',
    border: 'border-border',
    hover: 'hover:bg-muted/50',
    accent: 'bg-chart-4',
  },
  purple: {
    badge: 'bg-muted text-foreground',
    border: 'border-border',
    hover: 'hover:bg-muted/50',
    accent: 'bg-chart-1',
  },
} as const

// Default color mapping for Parts I-V
export const DEFAULT_PART_COLORS: Record<string, PartColor> = {
  I: 'slate',
  II: 'red',
  III: 'emerald',
  IV: 'blue',
  V: 'purple',
}
