// ═══════════════════════════════════════════════════════════════════════════
// MoneyFlowDiagram Data Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A type of transfer from central to local budget
 */
export interface TransferType {
  readonly id: string
  readonly name: string
  readonly nameRo: string
  readonly percentageRange: string
  readonly percentageMin: number
  readonly percentageMax: number
  readonly description: string
  readonly descriptionRo: string
  readonly details: readonly string[]
  readonly detailsRo: readonly string[]
  readonly color: 'blue' | 'purple' | 'amber'
  readonly icon: string
}

/**
 * Own revenue sources for local budgets
 */
export interface OwnRevenueSource {
  readonly id: string
  readonly name: string
  readonly nameRo: string
  readonly percentage: number
  readonly items: readonly string[]
  readonly itemsRo: readonly string[]
}

/**
 * Complete data structure for the diagram
 */
export interface MoneyFlowDiagramData {
  readonly centralBudget: {
    readonly name: string
    readonly nameRo: string
  }
  readonly localBudget: {
    readonly name: string
    readonly nameRo: string
  }
  readonly transfers: readonly TransferType[]
  readonly ownRevenues: OwnRevenueSource
  readonly totalCentralPercentage: number
}

/**
 * Localized text strings for the component
 */
export interface MoneyFlowDiagramText {
  readonly title: string
  readonly subtitle: string
  readonly centralLabel: string
  readonly localLabel: string
  readonly ownRevenuesLabel: string
  readonly keyInsightTitle: string
  readonly keyInsightText: string
  readonly clickToLearnMore: string
  readonly closeLabel: string
  readonly fromCenterLabel: string
  readonly detailsLabel: string
}

/**
 * Color configuration for each transfer type
 */
export const TRANSFER_COLORS = {
  blue: {
    bg: 'bg-chart-1/10',
    bgSolid: 'bg-chart-1',
    border: 'border-border',
    text: 'text-foreground',
    iconBg: 'bg-chart-1/20',
    ring: 'ring-primary/40',
    stroke: 'hsl(var(--chart-1))',
    fill: 'fill-chart-1',
  },
  purple: {
    bg: 'bg-chart-2/10',
    bgSolid: 'bg-chart-2',
    border: 'border-border',
    text: 'text-foreground',
    iconBg: 'bg-chart-2/20',
    ring: 'ring-primary/40',
    stroke: 'hsl(var(--chart-2))',
    fill: 'fill-chart-2',
  },
  amber: {
    bg: 'bg-chart-3/10',
    bgSolid: 'bg-chart-3',
    border: 'border-border',
    text: 'text-foreground',
    iconBg: 'bg-chart-3/20',
    ring: 'ring-primary/40',
    stroke: 'hsl(var(--chart-3))',
    fill: 'fill-chart-3',
  },
} as const
