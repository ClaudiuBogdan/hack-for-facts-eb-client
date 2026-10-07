import { describe, expect, it } from 'vitest'
import type { JudicialCompanyLitigation } from '@/schemas/judicial'
import { companyLitigationModel } from './company-litigation-model'

const base: JudicialCompanyLitigation = { cui: '1', caseCount: 0, courtLevels: [], years: [], coverage: 1, caveats: [] }

describe('companyLitigationModel', () => {
  it('spans the plausibly dated cases and counts the rest as undated', () => {
    const model = companyLitigationModel(
      {
        ...base,
        caseCount: 10,
        years: [
          { year: 2026, count: 2 },
          { year: -1, count: 1 },
          { year: 2019, count: 5 },
          { year: 1001, count: 1 },
        ],
      },
      2026,
    )
    expect(model.span).toEqual({ first: 2019, last: 2026 })
    expect(model.undated).toBe(3)
  })

  it('has no span when no case is plausibly dated', () => {
    const model = companyLitigationModel({ ...base, caseCount: 2, years: [{ year: 10000, count: 2 }] }, 2026)
    expect(model.span).toBeNull()
    expect(model.undated).toBe(2)
  })

  it('orders the levels as the API lists them and counts the cases no level places', () => {
    const model = companyLitigationModel(
      {
        ...base,
        caseCount: 9,
        courtLevels: [
          { courtLevel: 'inalta_curte', count: 1 },
          { courtLevel: 'tribunal', count: 3 },
          { courtLevel: 'judecatorie', count: 4 },
        ],
      },
      2026,
    )
    expect(model.levels.map((entry) => entry.level)).toEqual(['judecatorie', 'tribunal', 'inalta_curte'])
    expect(model.unplaced).toBe(1)
  })
})
