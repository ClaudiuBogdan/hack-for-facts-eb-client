import { describe, expect, it } from 'vitest'
import {
  withProcurementSearchDefaults,
  type ProcurementSearchState,
} from '@/schemas/procurement-search'
import {
  buildContractsFilter,
  buildDirectAcquisitionsFilter,
  buildModificationsFilter,
  buildProceduresFilter,
  buildProcurementSort,
  buildScopeFilter,
} from './procurement-filters'

function state(
  overrides: Partial<ProcurementSearchState> = {},
): ProcurementSearchState {
  return withProcurementSearchDefaults({ ...overrides })
}

describe('buildContractsFilter', () => {
  it('drops empty facets entirely (omitted key = no constraint)', () => {
    expect(buildContractsFilter(state({ q: '   ', authority_cui: '' }))).toEqual(
      {},
    )
  })

  it('maps the coarse source facet to the contract lane systems', () => {
    expect(buildContractsFilter(state({ source: 'seap' })).sourceSystem).toEqual(
      { in: ['seap_contracts'] },
    )
    expect(
      buildContractsFilter(state({ source: 'elicitatie' })).sourceSystem,
    ).toEqual({ in: ['elicitatie_ca_award'] })
  })

  it('prunes statuses outside the contract vocabulary instead of forwarding them', () => {
    expect(
      buildContractsFilter(state({ status: ['awarded', 'finalized'] })).status,
    ).toEqual({ in: ['awarded'] })
    expect(
      buildContractsFilter(state({ status: ['finalized'] })).status,
    ).toBeUndefined()
  })

  it('prefers explicit date bounds over the year expansion', () => {
    expect(
      buildContractsFilter(
        state({ year: 2023, dateFrom: '2024-02-01' }),
      ).contractDate,
    ).toEqual({ gte: '2024-02-01' })
    expect(buildContractsFilter(state({ year: 2023 })).contractDate).toEqual({
      gte: '2023-01-01',
      lte: '2023-12-31',
    })
  })

  it('converts numeric value bounds to RON decimal strings', () => {
    expect(
      buildContractsFilter(state({ valueMin: 1000, valueMax: 2500.5 })).valueRon,
    ).toEqual({ gte: '1000.00', lte: '2500.50' })
  })

  it('prefers the exact CPV code over the division', () => {
    expect(
      buildContractsFilter(state({ cpv: '45453000', cpv_division: '45' })),
    ).toMatchObject({ cpvCode: { eq: '45453000' } })
    expect(
      buildContractsFilter(state({ cpv_division: '45' })),
    ).toMatchObject({ cpvDivision: { eq: '45' } })
  })

  it('never forwards the reserved county/region params', () => {
    const filter = buildContractsFilter(
      state({ county: 'Cluj', region: 'Vest' }),
    )
    expect(JSON.stringify(filter)).not.toContain('Cluj')
    expect(JSON.stringify(filter)).not.toContain('Vest')
  })
})

describe('buildProceduresFilter', () => {
  it('uses the procedure lane systems and status vocabulary', () => {
    const filter = buildProceduresFilter(
      state({ source: 'seap', status: ['published', 'in_progress'] }),
    )
    expect(filter.sourceSystem).toEqual({ in: ['seap_notice'] })
    expect(filter.status).toEqual({ in: ['published'] })
  })

  it('has no supplier facet (procedures carry no supplier)', () => {
    const filter = buildProceduresFilter(state({ supplier_cui: '123' }))
    expect(JSON.stringify(filter)).not.toContain('123')
  })
})

describe('buildDirectAcquisitionsFilter', () => {
  it('expands seap to both DA bulk lanes', () => {
    expect(
      buildDirectAcquisitionsFilter(state({ source: 'seap' })).sourceSystem,
    ).toEqual({ in: ['seap_da', 'seap_dan'] })
  })

  it('keeps DA statuses like finalized/offered', () => {
    expect(
      buildDirectAcquisitionsFilter(state({ status: ['finalized', 'offered'] }))
        .status,
    ).toEqual({ in: ['finalized', 'offered'] })
  })
})

describe('buildModificationsFilter', () => {
  it('supports only party, text and date facets', () => {
    const filter = buildModificationsFilter(
      state({
        q: 'act',
        authority_cui: '1',
        supplier_cui: '2',
        year: 2024,
        status: ['awarded'],
        source: 'seap',
        valueMin: 5,
      }),
    )
    expect(filter).toEqual({
      q: { contains: 'act' },
      authorityCui: { eq: '1' },
      supplierCui: { eq: '2' },
      modificationDate: { gte: '2024-01-01', lte: '2024-12-31' },
    })
  })
})

describe('buildProcurementSort', () => {
  it('passes valid sorts through and falls back to date_desc', () => {
    expect(buildProcurementSort(state({ sort: 'value_asc' }))).toBe('value_asc')
    expect(buildProcurementSort(state())).toBe('date_desc')
  })
})

describe('buildScopeFilter', () => {
  it('prefers exact cpvCode over division and drops empties', () => {
    expect(
      buildScopeFilter({ cpvCode: '45453000', cpvDivision: '45' }),
    ).toEqual({ cpvCode: '45453000' })
    expect(buildScopeFilter({ supplierCui: ' 123 ', authorityCui: '' })).toEqual(
      { supplierCui: '123' },
    )
  })
})

describe('free-text q is bounded before it reaches the wire', () => {
  const builders = [
    ['procedures', buildProceduresFilter],
    ['contracts', buildContractsFilter],
    ['direct acquisitions', buildDirectAcquisitionsFilter],
    ['modifications', buildModificationsFilter],
  ] as const

  // The server rejects a short `q` as InvalidInput (no trigram indexes; the DA
  // grain is ~19M rows). A deep link can carry one straight past the input
  // component, so the builders are the last line of defence.
  it.each(builders)('%s: omits a term below the minimum length', (_name, build) => {
    expect(build(state({ q: 's' })).q).toBeUndefined()
    expect(build(state({ q: 'sp' })).q).toBeUndefined()
    expect(build(state({ q: '  ab  ' })).q).toBeUndefined()
  })

  it.each(builders)('%s: forwards a term at or above the minimum, trimmed', (_name, build) => {
    expect(build(state({ q: 'spi' })).q).toEqual({ contains: 'spi' })
    expect(build(state({ q: '  spital  ' })).q).toEqual({ contains: 'spital' })
  })
})
