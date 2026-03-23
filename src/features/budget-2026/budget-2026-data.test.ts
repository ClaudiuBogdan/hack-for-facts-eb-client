import { describe, expect, it } from 'vitest'

import totals from './data/totals.json'
import entities from './data/entities-ranking.json'
import functional from './data/functional-breakdown.json'
import economic from './data/economic-breakdown.json'
import fundingSources from './data/funding-sources.json'
import entityFunctional from './data/entity-functional-matrix.json'
import entityEconomic from './data/entity-economic-matrix.json'

function sumBy<T>(items: readonly T[], picker: (item: T) => number): number {
  return items.reduce((total, item) => total + picker(item), 0)
}

describe('budget 2026 generated data', () => {
  it('uses the state-budget aggregate as the headline total', () => {
    expect(totals.credite_bugetare.propuneri_2026).toBe(527413262)
  })

  it('matches the entity totals with the headline total', () => {
    expect(sumBy(entities, (item) => item.propuneri_2026)).toBe(totals.credite_bugetare.propuneri_2026)
  })

  it('keeps functional totals aligned with the headline totals', () => {
    expect(sumBy(functional, (item) => item.propuneri_2026)).toBe(totals.credite_bugetare.propuneri_2026)
  })

  it('keeps funding sources aligned with the headline totals', () => {
    expect(sumBy(fundingSources, (item) => item.propuneri_2026)).toBe(totals.credite_bugetare.propuneri_2026)
  })

  it('collapses funding sources to the state-budget universe', () => {
    expect(fundingSources.filter((item) => item.propuneri_2026 > 0)).toHaveLength(1)
    expect(fundingSources[0]?.source).toBe('Buget de stat')
  })

  it('keeps generated files free of synthetic residual labels', () => {
    expect(functional.some((item) => item.code === 'unclassified')).toBe(false)
    expect(economic.some((item) => item.code === 'unclassified')).toBe(false)
    expect(entityFunctional.some((item) => item.functional_code === 'unclassified')).toBe(false)
    expect(entityEconomic.some((item) => item.economic_code === 'unclassified')).toBe(false)
    expect(fundingSources.some((item) => item.source === 'Nespecificat in sursa')).toBe(false)
  })
})
