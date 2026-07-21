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
  statusesHiddenByDefault,
  statusesIncludedByRequest,
} from './procurement-filters'
import { PROCUREMENT_DA_MAX_WINDOW_DAYS } from '../../lib/search-dates'

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

  // A refused DA (e-licitatie states 3/4/6/8 → prod `cancelled`) is a real
  // public record but NOT a purchase; 1.006M of them carry 262B RON of
  // non-spend. They stay in the DB and the API and are one click away — the
  // default list just does not present them as concluded acquisitions.
  it('excludes cancelled DAs by default (no status selected)', () => {
    expect(buildDirectAcquisitionsFilter(state()).status).toEqual({
      in: ['offered', 'awarded', 'finalized', 'unknown'],
    })
  })

  it('honours an explicit cancelled selection — the default is opt-out-able', () => {
    expect(
      buildDirectAcquisitionsFilter(state({ status: ['cancelled'] })).status,
    ).toEqual({ in: ['cancelled'] })
    expect(
      buildDirectAcquisitionsFilter(state({ status: ['cancelled', 'finalized'] }))
        .status,
    ).toEqual({ in: ['cancelled', 'finalized'] })
  })

  // `procurementStatusSchema` is the union across all three grains, so a stale
  // or hand-edited URL can carry a status this grain has never heard of. That
  // must NOT degrade to "no constraint" — it used to, which handed back all
  // 1.006M refused DAs with no disclosure.
  it('falls back to the default when the selection is valid only for another grain', () => {
    for (const status of ['in_progress', 'closed', 'published', 'suspended']) {
      const filter = buildDirectAcquisitionsFilter(
        state({ status: [status as never] }),
      )
      expect(filter.status?.in).not.toContain('cancelled')
      expect(filter.status).toEqual({
        in: ['offered', 'awarded', 'finalized', 'unknown'],
      })
    }
  })

  // The notice must agree with the query on that same path, or the reader is
  // told nothing is hidden while a slice quietly is.
  it('keeps the disclosure in step with the applied filter', () => {
    expect(
      statusesHiddenByDefault(
        state({ status: ['in_progress' as never] }),
        'direct_acquisitions',
      ),
    ).toEqual(['cancelled'])
    expect(
      statusesHiddenByDefault(state(), 'direct_acquisitions'),
    ).toEqual(['cancelled'])
    expect(
      statusesHiddenByDefault(state({ status: ['cancelled'] }), 'direct_acquisitions'),
    ).toEqual([])
    expect(statusesHiddenByDefault(state(), 'contracts')).toEqual([])
  })

  // Opting refusals back in makes the list stop reconciling with the
  // aggregates (which drop `cancelled` at the data layer), so that path needs
  // its own disclosure — and must never fire on the default path.
  it('reports an explicit opt-in to a default-hidden status', () => {
    expect(
      statusesIncludedByRequest(
        state({ status: ['cancelled', 'finalized'] }),
        'direct_acquisitions',
      ),
    ).toEqual(['cancelled'])
    expect(
      statusesIncludedByRequest(state(), 'direct_acquisitions'),
    ).toEqual([])
    expect(
      statusesIncludedByRequest(
        state({ status: ['finalized'] }),
        'direct_acquisitions',
      ),
    ).toEqual([])
    // ...and never on a grain with no default to opt out of.
    expect(
      statusesIncludedByRequest(state({ status: ['cancelled'] }), 'contracts'),
    ).toEqual([])
  })

  // `unknown` is 8.97M seap rows whose status the parser never populated. They
  // are probably genuine acquisitions, so the default must NOT hide them —
  // hiding them would suppress data to cover our own extraction gap.
  it('keeps unknown-status DAs in the default list', () => {
    expect(buildDirectAcquisitionsFilter(state()).status?.in).toContain(
      'unknown',
    )
  })

  // Procedures and contracts have their own `cancelled`, and a cancelled
  // tender is newsworthy in its own right — the DA default must not leak.
  it('does not apply the DA default to procedures or contracts', () => {
    expect(buildProceduresFilter(state()).status).toBeUndefined()
    expect(buildContractsFilter(state()).status).toBeUndefined()
  })

  // The server refuses an unbounded DA search (`assertDaOffsetSelective`): CPV
  // and `q` refine but never qualify, so the builder must carry a window of its
  // own or the page renders the generic "data could not be loaded" error.
  it('always sends a bounded window when no party CUI qualifies the query', () => {
    for (const overrides of [{}, { cpv: '45453000' }, { q: 'spital' }]) {
      const range = buildDirectAcquisitionsFilter(state(overrides)).publicationDate
      expect(range?.gte).toBeDefined()
      expect(range?.lte).toBeDefined()
      const days =
        (Date.parse(`${range!.lte!}T00:00:00Z`) -
          Date.parse(`${range!.gte!}T00:00:00Z`)) /
        86_400_000
      expect(days).toBeLessThanOrEqual(PROCUREMENT_DA_MAX_WINDOW_DAYS)
    }
  })

  it('leaves a party-qualified search unwindowed (the whole history stays searchable)', () => {
    expect(
      buildDirectAcquisitionsFilter(state({ supplier_cui: '123' }))
        .publicationDate,
    ).toBeUndefined()
  })
})

describe('value-quality (valueState) facet', () => {
  it('expands the accepted category to the four accepted states on every grain', () => {
    const accepted = {
      in: [
        'official_exact',
        'official_ron_equivalent',
        'cross_source_exact',
        'official_document_recovered',
      ],
    }
    expect(
      buildContractsFilter(state({ value_state: ['accepted'] })).valueState,
    ).toEqual(accepted)
    expect(
      buildProceduresFilter(state({ value_state: ['accepted'] })).valueState,
    ).toEqual(accepted)
    expect(
      buildDirectAcquisitionsFilter(state({ value_state: ['accepted'] }))
        .valueState,
    ).toEqual(accepted)
  })

  it('unions multiple categories and de-duplicates', () => {
    expect(
      buildContractsFilter(state({ value_state: ['invalid', 'missing'] }))
        .valueState,
    ).toEqual({
      in: ['invalid_source_value', 'source_missing', 'not_applicable'],
    })
  })

  it('omits valueState entirely when nothing is selected', () => {
    expect(buildContractsFilter(state({})).valueState).toBeUndefined()
    expect(
      buildDirectAcquisitionsFilter(state({ value_state: [] })).valueState,
    ).toBeUndefined()
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

  it('includes single status when provided', () => {
    expect(buildScopeFilter({ status: 'cancelled', grain: 'contract' })).toEqual(
      { status: 'cancelled', grain: 'contract' },
    )
  })

  it('passes calendar-month bounds to the analysis scope', () => {
    expect(
      buildScopeFilter({ monthFrom: '2024-05', monthTo: '2024-06' }),
    ).toEqual({ from: '2024-05', to: '2024-06' })
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
