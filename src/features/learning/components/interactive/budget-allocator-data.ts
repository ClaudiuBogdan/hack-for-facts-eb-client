// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type DeficitSeverity =
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'critical'
  | 'catastrophic'
export type SurplusSeverity = 'minor' | 'significant' | 'extreme'

// -----------------------------------------------------------------------------
// MDX PROPS TYPES (for passing data from MDX files)
// -----------------------------------------------------------------------------

export type IconName =
  | 'shield'
  | 'heart'
  | 'graduation-cap'
  | 'building-2'
  | 'landmark'
  | 'scale'
  | 'swords'
  | 'trees'

export interface CategoryConsequenceProp {
  readonly minDiff: number
  readonly maxDiff: number
  readonly severity: 'positive' | 'neutral' | 'negative'
  readonly impacts: readonly string[]
}

export interface CategoryProp {
  readonly id: string
  readonly label: string
  readonly subLabel: string
  readonly icon: IconName
  readonly color: string
  readonly actualPercentage: number
  readonly defaultValue: number
  readonly stakeholders: readonly string[]
  readonly consequences: readonly CategoryConsequenceProp[]
}

export interface StakeholderReactionsProp {
  readonly happy: { readonly threshold: number; readonly message: string }
  readonly angry: { readonly threshold: number; readonly message: string }
  readonly neutral: { readonly message: string }
}

export interface StakeholderProp {
  readonly id: string
  readonly emoji: string
  readonly label: string
  readonly affectedBy: readonly string[]
  readonly reactions: StakeholderReactionsProp
}

export interface DeficitLevelProp {
  readonly minDeficit: number
  readonly maxDeficit: number
  readonly severity: DeficitSeverity
  readonly consequence: string
}

export interface SurplusLevelProp {
  readonly minSurplus: number
  readonly maxSurplus: number
  readonly consequence: string
}

export interface BudgetAllocatorTextProp {
  readonly hookTitle: string
  readonly hookSubtitle: string
  readonly hookButton: string
  readonly allocateTitle: string
  readonly allocateSubtitle: string
  readonly compareButton: string
  readonly compareTitle: string
  readonly compareSubtitle: string
  readonly tryAgainButton: string
  readonly insightsTitle: string
  readonly stakeholdersTitle: string
  readonly negativeImpactsTitle?: string
  readonly positiveImpactsTitle?: string
  readonly balanceLabels: {
    readonly balanced: string
    readonly deficit: string
    readonly surplus: string
  }
}

export interface BudgetInfoProp {
  readonly totalBillions: number
  readonly currency: string
  readonly year: number
}

export interface BudgetAllocatorGameProps {
  readonly categories: readonly CategoryProp[]
  readonly stakeholders: readonly StakeholderProp[]
  readonly deficitLevels: readonly DeficitLevelProp[]
  readonly surplusLevels: readonly SurplusLevelProp[]
  readonly text: BudgetAllocatorTextProp
  readonly budgetInfo: BudgetInfoProp
  readonly contentId?: string
  readonly interactionId?: string
}

// -----------------------------------------------------------------------------
// COLOR VARIANTS
// -----------------------------------------------------------------------------

export const COLOR_VARIANTS = {
  rose: {
    bg: 'bg-chart-1',
    text: 'text-foreground',
    bgLight: 'bg-chart-1/10',
  },
  blue: {
    bg: 'bg-chart-2',
    text: 'text-foreground',
    bgLight: 'bg-chart-2/10',
  },
  violet: {
    bg: 'bg-chart-2',
    text: 'text-foreground',
    bgLight: 'bg-chart-2/10',
  },
  emerald: {
    bg: 'bg-chart-4',
    text: 'text-foreground',
    bgLight: 'bg-chart-4/10',
  },
  amber: {
    bg: 'bg-chart-1',
    text: 'text-foreground',
    bgLight: 'bg-chart-1/10',
  },
  slate: {
    bg: 'bg-chart-3',
    text: 'text-foreground',
    bgLight: 'bg-chart-3/10',
  },
  red: {
    bg: 'bg-chart-3',
    text: 'text-foreground',
    bgLight: 'bg-chart-3/10',
  },
  teal: {
    bg: 'bg-chart-4',
    text: 'text-foreground',
    bgLight: 'bg-chart-4/10',
  },
} as const

export type ColorVariant = keyof typeof COLOR_VARIANTS
