import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'

export type NationalBudgetAccountCategory = 'ch' | 'vn'
export type NationalBudgetClassification = 'fn' | 'ec'
export type NationalBudgetTransferFilter = 'all' | 'no-transfers'

export type NationalBudgetSectorDefinition = {
  id: string
  label: string
  badge: string
  order: number
}

export type NationalBudgetFormulaRule = {
  id: string
  label: string
  accountCategory: NationalBudgetAccountCategory
  classification: NationalBudgetClassification
  prefixes: string[]
  applicableSectorIds?: string[]
  qualityNote?: string
}

export type NationalBudgetDeduction = {
  id: string
  label: string
  classification: NationalBudgetClassification
  prefixes: string[]
  amount: number
}

export type NationalBudgetComputedMetrics = {
  rawTotal: number
  totalAdjustments: number
  netTotal: number
  deductions: NationalBudgetDeduction[]
  filteredNodes: AggregatedNode[]
  qualityNote?: string
}

export type BudgetSectorApiNode = {
  sector_id: string
  sector_description: string
}

export type FundingSourceApiNode = {
  source_id: string
  source_description: string
}
