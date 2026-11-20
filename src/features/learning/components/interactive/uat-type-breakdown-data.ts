// ═══════════════════════════════════════════════════════════════════════════
// UATTypeBreakdown Data Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Example of a specific administrative unit
 */
export interface UATExample {
  readonly name: string
  readonly population?: string
}

/**
 * A category of administrative units (e.g., Counties, Municipalities)
 */
export interface UATCategory {
  readonly id: string
  readonly name: string
  readonly nameRo: string
  readonly count: number
  readonly populationMin?: string
  readonly description: string
  readonly descriptionRo: string
  readonly examples: readonly UATExample[]
  readonly color: 'slate' | 'blue' | 'indigo' | 'emerald'
  readonly icon: string
  readonly mapFilterParam?: string
}

/**
 * Complete data structure for the breakdown
 */
export interface UATTypeBreakdownData {
  readonly totalCount: number
  readonly level1: UATCategory
  readonly level2: readonly UATCategory[]
}

/**
 * Localized text strings for the component
 */
export interface UATTypeBreakdownText {
  readonly title: string
  readonly subtitle: string
  readonly level1Label: string
  readonly level2Label: string
  readonly totalLabel: string
  readonly viewMapLabel: string
  readonly legalNoteLabel: string
  readonly clickToExpand: string
  readonly examplesLabel: string
  readonly closeLabel: string
}

/**
 * Style shared by every category type. The categories are told apart by their
 * name and count; the design tokens carry selection (primary) and structure.
 */
const UAT_STYLE = {
  bg: 'bg-primary/10',
  bgLight: 'bg-muted',
  border: 'border-border',
  selectedBorder: 'border-primary',
  panelBorder: 'border-primary/30',
  text: 'text-primary',
  accent: 'bg-muted',
  ring: 'ring-primary/40',
  bar: 'bg-primary',
} as const

/**
 * Color configuration for each category type
 */
export const UAT_COLORS = {
  slate: UAT_STYLE,
  blue: UAT_STYLE,
  indigo: UAT_STYLE,
  emerald: UAT_STYLE,
} as const
