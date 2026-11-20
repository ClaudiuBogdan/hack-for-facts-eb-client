/**
 * Types and styling constants for ThreeLensesExplorer component
 *
 * Follows the pattern established by classification-explorer-data.ts
 */

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

/** A single budget example showing all three classification perspectives */
export interface BudgetLensExample {
  readonly id: string
  /** Short description like "Teacher Salary" */
  readonly title: string
  /** Amount in RON for display */
  readonly amount: number
  /** WHO spends it - Ministry/Entity name (no code) */
  readonly organizational: {
    readonly entity: string
  }
  /** WHAT FOR - Purpose with code */
  readonly functional: {
    readonly category: string
    readonly code: string
    /** E.g., "Primary Education" */
    readonly subcategory?: string
  }
  /** WHAT TYPE - Expense type with code */
  readonly economic: {
    readonly type: string
    readonly code: string
    /** E.g., "Basic Salaries" */
    readonly subtype?: string
  }
}

/** Insight text for a specific lens */
export interface LensInsight {
  readonly title: string
  readonly text: string
}

/** Text content passed from MDX for i18n support */
export interface ThreeLensesTextProp {
  /** Header section */
  readonly title: string
  readonly subtitle: string
  /** Lens labels and questions */
  readonly organizational: {
    readonly label: string
    readonly question: string // "WHO?"
    /** Insight shown when this lens is clicked (optional for backward compatibility) */
    readonly insight?: LensInsight
  }
  readonly functional: {
    readonly label: string
    readonly question: string // "WHAT FOR?"
    /** Insight shown when this lens is clicked (optional for backward compatibility) */
    readonly insight?: LensInsight
  }
  readonly economic: {
    readonly label: string
    readonly question: string // "WHAT TYPE?"
    /** Insight shown when this lens is clicked (optional for backward compatibility) */
    readonly insight?: LensInsight
  }
  /** Example navigation */
  readonly exampleLabel: string
  /** Default key insight (shown when no lens is selected) */
  readonly insightTitle: string
  readonly insightText: string
  /** No code label for organizational */
  readonly noCodeLabel: string
  /** Label for closing the insight */
  readonly closeInsightLabel?: string
  /** Hint text shown below cards when no lens is selected */
  readonly hintText?: string
}

/** Full props for ThreeLensesExplorer component */
export interface ThreeLensesExplorerProps {
  readonly examples: readonly BudgetLensExample[]
  readonly text: ThreeLensesTextProp
  /** Optional: start with a specific example */
  readonly defaultExampleIndex?: number
}

// -----------------------------------------------------------------------------
// COLOR SYSTEM
// -----------------------------------------------------------------------------

/**
 * Color variants for the three lenses
 * - Organizational: chart-1, neutral text (less emphasized per requirements)
 * - Functional: chart-2, primary text
 * - Economic: chart-3, primary text
 */
export const LENS_COLORS = {
  organizational: {
    bg: 'bg-chart-1',
    bgLight: 'bg-chart-1/10',
    bgLighter: 'bg-chart-1/10',
    text: 'text-foreground',
    border: 'border-chart-1/40',
    blur: 'bg-chart-1/10',
    accent: 'bg-chart-1/20',
  },
  functional: {
    bg: 'bg-chart-2',
    bgLight: 'bg-chart-2/10',
    bgLighter: 'bg-chart-2/10',
    text: 'text-primary',
    border: 'border-chart-2/40',
    blur: 'bg-chart-2/10',
    accent: 'bg-chart-2/20',
  },
  economic: {
    bg: 'bg-chart-3',
    bgLight: 'bg-chart-3/10',
    bgLighter: 'bg-chart-3/10',
    text: 'text-primary',
    border: 'border-chart-3/40',
    blur: 'bg-chart-3/10',
    accent: 'bg-chart-3/20',
  },
} as const

export type LensType = keyof typeof LENS_COLORS
