/**
 * Types and styling constants for ClassificationExplorer component
 *
 * Data is passed via MDX props for easier translation support.
 * The component demonstrates functional vs economic budget classifications
 * using real Romanian budget data.
 */

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ClassificationView = 'fn' | 'ec'

/** Budget item passed from MDX */
export interface BudgetItemProp {
  readonly code: string
  readonly name: string
  readonly value: number
}

/** Text content passed from MDX */
export interface ClassificationExplorerTextProp {
  readonly hookTitle: string
  readonly hookTitleHighlight: string
  readonly hookSubtitle: string
  readonly hookButton: string
  readonly explorePhaseLabel: string
  readonly exploreTitle: string
  readonly exploreTitleHighlight: string
  readonly functionalLabel: string
  readonly functionalQuestion: string
  readonly economicLabel: string
  readonly economicQuestion: string
  readonly functionalHint: string
  readonly economicHint: string
  readonly keyInsightTitle: string
  readonly keyInsightText: string
  readonly resetButton: string
  readonly sourceLabel: string
  readonly fnPreview: {
    readonly title: string
    readonly subtitle: string
    readonly examples: string
  }
  readonly ecPreview: {
    readonly title: string
    readonly subtitle: string
    readonly examples: string
  }
}

/** Budget info passed from MDX */
export interface BudgetInfoProp {
  readonly totalBillions: number
  readonly currency: string
  readonly year: number
}

/** Full props for ClassificationExplorer component */
export interface ClassificationExplorerProps {
  readonly functionalData: readonly BudgetItemProp[]
  readonly economicData: readonly BudgetItemProp[]
  readonly text: ClassificationExplorerTextProp
  readonly budgetInfo: BudgetInfoProp
  readonly sourceUrl?: string
  readonly defaultView?: ClassificationView
}

// -----------------------------------------------------------------------------
// COLOR VARIANTS
// -----------------------------------------------------------------------------

export const CLASSIFICATION_COLORS = {
  fn: {
    bg: 'bg-chart-1',
    bgLight: 'bg-chart-1/10',
    bgLighter: 'bg-chart-1/10',
    text: 'text-foreground',
    border: 'border-border',
    blur: 'bg-chart-1/10',
  },
  ec: {
    bg: 'bg-chart-2',
    bgLight: 'bg-chart-2/10',
    bgLighter: 'bg-chart-2/10',
    text: 'text-foreground',
    border: 'border-border',
    blur: 'bg-chart-2/10',
  },
} as const
