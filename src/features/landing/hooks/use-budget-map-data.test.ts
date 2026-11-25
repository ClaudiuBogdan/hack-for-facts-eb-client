import { describe, expect, it, vi } from 'vitest'

const fetchBudgetFigures = vi.fn().mockResolvedValue({ byUat: new Map(), outsideMap: 0 })
vi.mock('../api/budget-map', async (original) => ({ ...(await original<typeof import('../api/budget-map')>()), fetchBudgetFigures: (...args: unknown[]) => fetchBudgetFigures(...args) }))

const { budgetFiguresQuery } = await import('./use-budget-map-data')

describe('the budget map figures query', () => {
  it('keeps the landing\'s cache entry for totals per primărie, named or not', () => {
    expect(budgetFiguresQuery('2025').queryKey).toEqual(['landing', 'budget-map', 'figures', '2025'])
    expect(budgetFiguresQuery('2025', { normalization: 'total', granularity: 'UAT' }).queryKey).toEqual(['landing', 'budget-map', 'figures', '2025'])
  })

  it('gives every other count and level its own entry', () => {
    const keys = [
      budgetFiguresQuery('2025').queryKey,
      budgetFiguresQuery('2025', { normalization: 'per_capita' }).queryKey,
      budgetFiguresQuery('2025', { granularity: 'County' }).queryKey,
      budgetFiguresQuery('2025', { normalization: 'per_capita', granularity: 'County' }).queryKey,
      budgetFiguresQuery('2024').queryKey,
    ].map((key) => JSON.stringify(key))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('asks for the count and level its key names', async () => {
    await budgetFiguresQuery('2023', { normalization: 'per_capita', granularity: 'County' }).queryFn()
    expect(fetchBudgetFigures).toHaveBeenLastCalledWith('2023', { normalization: 'per_capita', granularity: 'County' })
    await budgetFiguresQuery('2023').queryFn()
    expect(fetchBudgetFigures).toHaveBeenLastCalledWith('2023', { normalization: 'total', granularity: 'UAT' })
  })
})
