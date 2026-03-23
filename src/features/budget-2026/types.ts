/** Source values follow the extracted local budget dataset units. */

export type BudgetYear = {
  readonly realizari_2024: number
  readonly executie_preliminata_2025: number
  readonly propuneri_2026: number
  readonly estimari_2027: number
  readonly estimari_2028: number
  readonly estimari_2029: number
}

export type BudgetTotals = {
  readonly credite_bugetare: BudgetYear
  readonly credite_angajament: BudgetYear
  readonly entity_count: number
}

export type EntitySummary = {
  readonly entity: string
  readonly label: string
  readonly propuneri_2026: number
  readonly executie_preliminata_2025: number
  readonly yoy_change_pct: number | null
  readonly realizari_2024: number
  readonly estimari_2027: number
}

export type FunctionalItem = {
  readonly code: string
  readonly label: string
} & BudgetYear

export type EconomicItem = {
  readonly code: string
  readonly label: string
} & BudgetYear

export type FundingSourceItem = {
  readonly source: string
  readonly label: string
  readonly propuneri_2026: number
  readonly executie_preliminata_2025: number
}

export type YoyChange = {
  readonly entity: string
  readonly label: string
  readonly propuneri_2026: number
  readonly executie_preliminata_2025: number
  readonly absolute_change: number
  readonly pct_change: number
}

export type SankeyLink = {
  readonly source: string
  readonly target: string
  readonly value: number
}

export type EntityFunctionalItem = {
  readonly entity: string
  readonly entity_label: string
  readonly functional_code: string
  readonly functional_label: string
  readonly propuneri_2026: number
}

export type EntityEconomicItem = {
  readonly entity: string
  readonly entity_label: string
  readonly economic_code: string
  readonly economic_label: string
  readonly propuneri_2026: number
}

export type Budget2026Data = {
  readonly totals: BudgetTotals
  readonly entities: readonly EntitySummary[]
  readonly functional: readonly FunctionalItem[]
  readonly economic: readonly EconomicItem[]
  readonly fundingSources: readonly FundingSourceItem[]
  readonly yoyIncreases: readonly YoyChange[]
  readonly yoyDecreases: readonly YoyChange[]
  readonly sankeyLinks: readonly SankeyLink[]
  readonly entityFunctional: readonly EntityFunctionalItem[]
  readonly entityEconomic: readonly EntityEconomicItem[]
}
