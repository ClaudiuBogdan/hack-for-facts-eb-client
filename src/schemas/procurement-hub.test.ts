import { describe, expect, it } from 'vitest'
import {
  cleanProcurementHubSearch,
  hubStateToLandingFilters,
  hubStateToListSearchState,
  hubStateToRankingScopeInput,
  hubStateToTerritoryLandingFilters,
  isListCapabilityAvailable,
  listCapabilityDrops,
  parseProcurementHubSearch,
  rankingRecordKindFromHubState,
  withProcurementHubDefaults,
  PROCUREMENT_HUB_CAPABILITIES,
  PROCUREMENT_HUB_CAPABILITY_MATRIX,
} from './procurement-hub'

describe('procurement hub schema', () => {
  it('defaults view to overview and maps legacy tab=search / view=map', () => {
    expect(parseProcurementHubSearch({}).view).toBe('overview')
    expect(parseProcurementHubSearch({ tab: 'search' }).view).toBe('list')
    expect(parseProcurementHubSearch({ view: 'list' }).view).toBe('list')
    expect(parseProcurementHubSearch({ view: 'rankings' }).view).toBe('rankings')
    // Legacy Map tab bookmarks land on Overview; mapGrain is preserved.
    expect(parseProcurementHubSearch({ view: 'map' }).view).toBe('overview')
    expect(
      parseProcurementHubSearch({ view: 'map', mapGrain: 'county' }).mapGrain,
    ).toBe('county')
  })

  it('defaults rankings chrome and cleans them when default', () => {
    expect(parseProcurementHubSearch({}).rankDim).toBe('buyer')
    expect(parseProcurementHubSearch({}).cpvLevel).toBe('division')
    expect(parseProcurementHubSearch({}).rankPage).toBe(1)
    expect(parseProcurementHubSearch({}).rankPageSize).toBe(10)
    expect(parseProcurementHubSearch({}).rankBy).toBe('value')
    expect(parseProcurementHubSearch({ rankBy: 'count' }).rankBy).toBe('count')
    expect(
      cleanProcurementHubSearch({
        view: 'rankings',
        rankDim: 'supplier',
        cpvLevel: 'code',
        rankBy: 'count',
        rankPage: 2,
        rankPageSize: 25,
      }),
    ).toEqual({
      view: 'rankings',
      rankDim: 'supplier',
      cpvLevel: 'code',
      rankBy: 'count',
      rankPage: 2,
      rankPageSize: 25,
    })
    expect(
      cleanProcurementHubSearch({
        view: 'rankings',
        rankDim: 'buyer',
        cpvLevel: 'division',
        rankBy: 'value',
        rankPage: 1,
        rankPageSize: 10,
      }),
    ).toEqual({ view: 'rankings' })
  })

  it('defaults measure, mapGrain, and mapParty and cleans them when default', () => {
    expect(parseProcurementHubSearch({}).measure).toBe('value_awarded')
    expect(parseProcurementHubSearch({}).mapGrain).toBe('region')
    expect(parseProcurementHubSearch({}).mapParty).toBe('buyer')
    expect(
      cleanProcurementHubSearch({
        measure: 'value_awarded',
        mapGrain: 'region',
        mapParty: 'buyer',
        q: 'school',
      }),
    ).toEqual({ q: 'school' })
    expect(
      cleanProcurementHubSearch({
        measure: 'record_count',
        mapGrain: 'county',
        mapParty: 'supplier',
      }),
    ).toEqual({
      measure: 'record_count',
      mapGrain: 'county',
      mapParty: 'supplier',
    })
  })

  it('keeps finest buyer geo key (siruta > county > region)', () => {
    expect(
      parseProcurementHubSearch({
        buyerSiruta: '120855',
        buyerCounty: 'CJ',
        buyerRegion: 'Nord-Vest',
      }),
    ).toMatchObject({
      buyerSiruta: '120855',
      buyerCounty: undefined,
      buyerRegion: undefined,
    })
  })

  it('cleans default view/grain/sort/page from the URL', () => {
    const state = withProcurementHubDefaults({
      view: 'overview',
      grain: 'contracts',
      sort: 'date_desc',
      page: 1,
      pageSize: 25,
      q: 'school',
    })
    expect(cleanProcurementHubSearch(state)).toEqual({ q: 'school' })
  })

  it('resolves previous-year period into list and landing filters', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    const state = parseProcurementHubSearch({})
    expect(hubStateToLandingFilters(state, now)).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      rankBy: 'value',
    })
    expect(hubStateToListSearchState(state, now)).toMatchObject({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      grain: 'contracts',
    })
  })

  it('maps the overview metric to the aggregate ranking request', () => {
    const state = parseProcurementHubSearch({
      measure: 'value_awarded',
      period: 'all',
    })
    expect(hubStateToLandingFilters(state)).toEqual({ rankBy: 'value' })
  })

  it('scopes territory drawer filters to resolved period + clicked geo', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    const state = parseProcurementHubSearch({
      measure: 'value_awarded',
      grain: 'contracts',
      supplierRegion: 'Nord-Vest',
    })
    expect(
      hubStateToTerritoryLandingFilters(state, 'region', 'Centru', now),
    ).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      rankBy: 'value',
      buyerRegion: 'Centru',
      supplierRegion: 'Nord-Vest',
    })
    expect(
      hubStateToTerritoryLandingFilters(state, 'county', 'BV', now),
    ).toMatchObject({
      buyerCounty: 'BV',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      rankBy: 'value',
    })
    expect(
      hubStateToTerritoryLandingFilters(state, 'county', 'BV', now),
    ).not.toHaveProperty('buyerRegion')
    expect(
      hubStateToTerritoryLandingFilters(state, 'county', 'BV', now),
    ).not.toHaveProperty('grain')
  })

  it('scopes drawer by selection grain even when toolbar mapGrain stays region', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    const state = parseProcurementHubSearch({
      mapGrain: 'region',
      buyerCounty: 'CJ',
    })
    // Click/paint selection grain is county (single-county paint) — must not
    // broaden to the parent region via the toolbar mapGrain.
    expect(
      hubStateToTerritoryLandingFilters(state, 'county', 'BV', now),
    ).toMatchObject({
      buyerCounty: 'BV',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    })
    expect(
      hubStateToTerritoryLandingFilters(state, 'county', 'BV', now),
    ).not.toHaveProperty('buyerRegion')
  })

  it('applies buyer territory even when mapParty is supplier', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    const state = parseProcurementHubSearch({
      mapParty: 'supplier',
      supplierRegion: 'Centru',
    })
    // Map paint is supplier-only chrome; the territory drawer/Apply stay on
    // buyer geography so Overview cards are not coupled to mapParty.
    expect(
      hubStateToTerritoryLandingFilters(state, 'region', 'Nord-Vest', now),
    ).toMatchObject({
      buyerRegion: 'Nord-Vest',
      supplierRegion: 'Centru',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    })
    expect(
      hubStateToTerritoryLandingFilters(state, 'region', 'Nord-Vest', now),
    ).not.toHaveProperty('supplierCounty')
  })

  it('carries geography into the list search state (search engine, 2026-07-25)', () => {
    const state = parseProcurementHubSearch({
      buyerRegion: 'Nord-Vest',
      supplierCounty: 'CJ',
      grain: 'contracts',
      period: 'all',
    })
    const list = hubStateToListSearchState(state)
    expect(list.buyerRegion).toBe('Nord-Vest')
    expect(list.supplierCounty).toBe('CJ')
    expect(list.dateFrom).toBeUndefined()
    expect(list.dateTo).toBeUndefined()
  })

  it('drops the filters a grain cannot honor, and says which', () => {
    // A procedure predates its award: no supplier, so no supplier territory.
    const procedures = parseProcurementHubSearch({
      grain: 'procedures',
      buyerCounty: 'CJ',
      supplierCounty: 'B',
      supplier_cui: '6567900',
      period: 'all',
    })
    const list = hubStateToListSearchState(procedures)
    expect(list.buyerCounty).toBe('CJ')
    expect(list.supplierCounty).toBeUndefined()
    expect(list.supplier_cui).toBeUndefined()
    expect(listCapabilityDrops(procedures).map((drop) => drop.key)).toEqual([
      'supplierCounty',
      'supplier_cui',
    ])

    // Modifications are not in the search index at all — no territory filter.
    const modifications = parseProcurementHubSearch({
      grain: 'modifications',
      buyerCounty: 'CJ',
      period: 'all',
    })
    expect(hubStateToListSearchState(modifications).buyerCounty).toBeUndefined()
    expect(isListCapabilityAvailable('buyer-geo', 'modifications')).toBe(false)
    expect(isListCapabilityAvailable('buyer-geo', 'contracts')).toBe(true)
  })

  it('projects the developer matrix from the capability registry', () => {
    // The matrix is a VIEW of the registry — a row cannot claim a capability
    // the builders do not apply.
    expect(PROCUREMENT_HUB_CAPABILITY_MATRIX.map((row) => row.id)).toEqual(
      PROCUREMENT_HUB_CAPABILITIES.map((capability) => capability.id),
    )
    const geo = PROCUREMENT_HUB_CAPABILITY_MATRIX.find(
      (row) => row.id === 'buyer-geo',
    )
    expect(geo?.list).toBe('live')
  })

  it('forwards CPV hierarchy levels, q and value bounds to the ranking scope', () => {
    const state = parseProcurementHubSearch({
      cpv_group: '45200000',
      q: 'drum judetean',
      valueMin: '1000',
      valueMax: '500000',
      period: 'all',
    })
    const scope = hubStateToRankingScopeInput(state)
    expect(scope.cpvGroup).toBe('45200000')
    expect(scope.q).toBe('drum judetean')
    expect(scope.valueMin).toBe(1000)
    expect(scope.valueMax).toBe(500000)
    // Malformed level codes normalize away at parse time.
    const malformed = parseProcurementHubSearch({ cpv_group: '45000000' })
    expect(malformed.cpv_group).toBeUndefined()
  })

  it('applies recordKind to the ranking scope only on contracts with ONE token', () => {
    const contracts = parseProcurementHubSearch({
      grain: 'contracts',
      record_kind: 'frameworks',
    })
    expect(rankingRecordKindFromHubState(contracts)).toBe('framework_agreement')
    expect(hubStateToRankingScopeInput(contracts).recordKind).toBe(
      'framework_agreement',
    )
    const bothTokens = parseProcurementHubSearch({
      grain: 'contracts',
      record_kind: 'frameworks,purchases',
    })
    expect(rankingRecordKindFromHubState(bothTokens)).toBeUndefined()
    const daGrain = parseProcurementHubSearch({
      grain: 'direct_acquisitions',
      record_kind: 'frameworks',
    })
    expect(rankingRecordKindFromHubState(daGrain)).toBeUndefined()
  })

  it('landing filters carry the q/value row filters (aggregate-safe)', () => {
    const state = parseProcurementHubSearch({
      q: 'asfalt',
      valueMin: '2500',
      period: 'all',
    })
    const landing = hubStateToLandingFilters(state)
    expect(landing.q).toBe('asfalt')
    expect(landing.valueMin).toBe(2500)
  })

  it('landing filters carry party/CPV scopes (C1 closed)', () => {
    const state = parseProcurementHubSearch({
      authority_cui: '4267117',
      cpv_group: '45200000',
      period: 'all',
    })
    const landing = hubStateToLandingFilters(state)
    expect(landing.authorityCui).toBe('4267117')
    expect(landing.cpvGroup).toBe('45200000')
    expect(landing.supplierCui).toBeUndefined()
  })
})
