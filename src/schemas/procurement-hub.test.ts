import { describe, expect, it } from 'vitest'
import {
  cleanProcurementHubSearch,
  hubStateToLandingFilters,
  hubStateToListSearchState,
  isRelevanceSortAvailable,
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

    // Modifications DO carry buyer territory: an amendment inherits its
    // contract's buyer, resolved through the parent's fact row.
    const modifications = parseProcurementHubSearch({
      grain: 'modifications',
      buyerCounty: 'CJ',
      period: 'all',
    })
    expect(hubStateToListSearchState(modifications).buyerCounty).toBe('CJ')
    expect(isListCapabilityAvailable('buyer-geo', 'modifications')).toBe(true)
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

describe('capability registry — every dropped list filter is classified', () => {
  it('drops and explains every filter the modifications grain cannot carry', () => {
    const state = parseProcurementHubSearch({
      grain: 'modifications',
      period: 'all',
      cpv_division: '45',
      cpv_group: '45200000',
      status: 'awarded',
      value_state: 'accepted',
      record_kind: 'purchases',
      source: 'seap',
      valueMin: '1000',
      valueMax: '5000',
      buyerCounty: 'CJ',
      supplierCounty: 'B',
      supplier_cui: '6567900',
    })
    const list = hubStateToListSearchState(state)
    // Everything the builder would silently omit is scrubbed here instead…
    for (const key of [
      'cpv_division',
      'cpv_group',
      'status',
      'value_state',
      'record_kind',
      'source',
      'valueMin',
      'valueMax',
      'supplierCounty',
    ] as const) {
      expect(list[key]).toBeUndefined()
    }
    // A modification DOES name its parties, and it inherits its contract's
    // buyer territory — both filters stay.
    expect(list.supplier_cui).toBe('6567900')
    expect(list.buyerCounty).toBe('CJ')
    // …and every one of them is disclosed with a reason.
    const drops = listCapabilityDrops(state)
    const dropped = new Set(drops.map((drop) => drop.key))
    for (const key of [
      // `cpv_division` is normalized away by the finest-level-wins rule; the
      // group is what survives parsing, so that is what must be disclosed.
      'cpv_group',
      'status',
      'value_state',
      'record_kind',
      'source',
      'valueMin',
      'supplierCounty',
    ] as const) {
      expect(dropped.has(key)).toBe(true)
    }
    // Buyer territory is NOT among them — it is served, so it is not disclosed
    // as a drop.
    expect(dropped.has('buyerCounty')).toBe(false)
    expect(drops.every((drop) => drop.reason.length > 0)).toBe(true)
  })

  it('keeps those same filters on a grain that carries them', () => {
    const state = parseProcurementHubSearch({
      grain: 'contracts',
      period: 'all',
      cpv_group: '45200000',
      status: 'awarded',
      record_kind: 'purchases',
      valueMin: '1000',
      supplierCounty: 'B',
    })
    const list = hubStateToListSearchState(state)
    expect(list.cpv_group).toBe('45200000')
    expect(list.status).toEqual(['awarded'])
    expect(list.record_kind).toEqual(['purchases'])
    expect(list.valueMin).toBe(1000)
    expect(list.supplierCounty).toBe('B')
    expect(listCapabilityDrops(state)).toEqual([])
  })

  it('keeps the match mode only where a grain and a query can honor it', () => {
    const contracts = parseProcurementHubSearch({
      grain: 'contracts',
      q: 'drumuri comunale',
      qmode: 'phrase',
    })
    expect(hubStateToListSearchState(contracts).qmode).toBe('phrase')

    // No query: the mode has nothing to apply to.
    const noQuery = parseProcurementHubSearch({ grain: 'contracts', qmode: 'phrase' })
    expect(hubStateToListSearchState(noQuery).qmode).toBeUndefined()

    // SQL-served grain: one substring match, no mode — dropped AND disclosed.
    const modifications = parseProcurementHubSearch({
      grain: 'modifications',
      q: 'drumuri',
      qmode: 'any',
    })
    expect(hubStateToListSearchState(modifications).qmode).toBeUndefined()
    expect(listCapabilityDrops(modifications).map((drop) => drop.key)).toContain('qmode')
  })

  it('offers the engine-only controls only where the engine actually serves', () => {
    // Direct acquisitions are TRANSITIONAL: the 22.6M-doc index is still being
    // built, so that grain is answered from Postgres — one substring match, no
    // score, no fragments. Advertising the controls there would offer a reader
    // something the request then fails on. Drop DA from the unserved list when
    // its index passes the parity gate and is wired into the index map.
    for (const capability of ['q-mode', 'relevance-sort', 'list-highlight']) {
      expect(isListCapabilityAvailable(capability, 'contracts')).toBe(true)
      expect(isListCapabilityAvailable(capability, 'procedures')).toBe(true)
      expect(isListCapabilityAvailable(capability, 'direct_acquisitions')).toBe(false)
      expect(isListCapabilityAvailable(capability, 'modifications')).toBe(false)
    }

    // And the mode is scrubbed out of the request for those grains, not just
    // hidden in the UI — a hand-edited URL cannot smuggle it through.
    const da = parseProcurementHubSearch({
      grain: 'direct_acquisitions',
      q: 'mobilier',
      qmode: 'phrase',
    })
    expect(hubStateToListSearchState(da).qmode).toBeUndefined()
  })

  it('keeps the filters the database can serve without the search index', () => {
    // The reported failure: `?q=sibiu&buyerRegion=Sud-Est&grain=direct_acquisitions`
    // first hard-failed, then dropped territory and listed 1,736 records under a
    // header counting 31. Buyer territory comes from the analysis fact row and a
    // CPV level is a code range, so BOTH are served on a grain with no index.
    const da = parseProcurementHubSearch({
      grain: 'direct_acquisitions',
      q: 'sibiu',
      buyerRegion: 'Sud-Est',
      cpv_group: '45200000',
    })
    const list = hubStateToListSearchState(da)
    expect(list.buyerRegion).toBe('Sud-Est')
    expect(list.cpv_group).toBe('45200000')
    expect(list.q).toBe('sibiu')
    expect(listCapabilityDrops(da)).toEqual([])

    // Supplier territory genuinely needs the index — it is resolved at build
    // time from the company registry, and no fact table carries it.
    const supplier = parseProcurementHubSearch({
      grain: 'direct_acquisitions',
      supplierCounty: 'SB',
    })
    expect(hubStateToListSearchState(supplier).supplierCounty).toBeUndefined()
    expect(listCapabilityDrops(supplier)[0]?.reason).toContain('not indexed yet')
  })

  it('explains a drop in terms of the record type the reader is looking at', () => {
    // One sentence cannot explain two grains: the DA list was telling readers
    // "contract modifications are not in the search index".
    const procedures = parseProcurementHubSearch({
      grain: 'procedures',
      supplierCounty: 'SB',
    })
    expect(listCapabilityDrops(procedures)[0]?.reason).toContain('predates its award')

    const modifications = parseProcurementHubSearch({
      grain: 'modifications',
      supplierCounty: 'SB',
    })
    expect(listCapabilityDrops(modifications)[0]?.reason).toContain('modifications')
  })

  it('falls back from relevance to the default order when nothing can rank', () => {
    const ranked = parseProcurementHubSearch({
      grain: 'contracts',
      q: 'spital',
      sort: 'relevance',
    })
    expect(hubStateToListSearchState(ranked).sort).toBe('relevance')
    expect(isRelevanceSortAvailable(ranked)).toBe(true)

    // A bookmarked `sort=relevance` that loses its q must not reach the server:
    // BM25 over a constant score is the pk tiebreak wearing a relevance label.
    const noQuery = parseProcurementHubSearch({ grain: 'contracts', sort: 'relevance' })
    expect(isRelevanceSortAvailable(noQuery)).toBe(false)
    expect(hubStateToListSearchState(noQuery).sort).toBe('date_desc')

    const modifications = parseProcurementHubSearch({
      grain: 'modifications',
      q: 'spital',
      sort: 'relevance',
    })
    expect(hubStateToListSearchState(modifications).sort).toBe('date_desc')
  })

  it('normalizes a malformed territory param instead of sending it to the server', () => {
    // `buyerCounty=Cluj` would be rejected by the server and fail the request.
    const state = parseProcurementHubSearch({ buyerCounty: 'Cluj', supplierSiruta: 'abc' })
    expect(state.buyerCounty).toBeUndefined()
    expect(state.supplierSiruta).toBeUndefined()
    expect(parseProcurementHubSearch({ buyerCounty: 'CJ' }).buyerCounty).toBe('CJ')
  })
})
