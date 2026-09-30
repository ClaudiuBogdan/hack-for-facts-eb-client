/**
 * Value-basis (vbasis) URL axis — design v1.1: the explorer's old links are
 * still parsed (the analytics page's redirects read them), and the scope
 * scrub per population still serves the institution scopes. These tests pin
 * the normalization laws and the never-silently-sent filter drops.
 */
import { describe, expect, it } from 'vitest'
import { parseProcurementHubSearch, scrubScopeForAnalysisGrain } from './procurement-hub'

describe('vbasis URL parsing + normalization', () => {

  it('drops unknown tokens instead of failing the whole URL', () => {
    expect(parseProcurementHubSearch({ vbasis: 'bogus' }).vbasis).toBe('awarded')
  })

  it('mod_adjusted forces the contracts grain', () => {
    const state = parseProcurementHubSearch({
      vbasis: 'mod_adjusted',
      grain: 'direct_acquisitions',
    })
    expect(state.vbasis).toBe('mod_adjusted')
    expect(state.grain).toBe('contracts')
  })

  it('the counts-only modifications grain carries no alternative value logic', () => {
    const state = parseProcurementHubSearch({
      vbasis: 'estimated',
      grain: 'modifications',
    })
    expect(state.vbasis).toBe('awarded')
    expect(state.grain).toBe('modifications')
  })
})

describe('scope scrub per population (server design v1.1)', () => {
  // A contracts scope carrying every filter a population may have to drop.
  const fullScope = {
    grain: 'contract' as const,
    q: 'drum',
    authorityCui: '111',
    supplierCui: '222',
    cpvGroup: '45200000',
    supplierCounty: 'CJ',
    buyerCounty: 'AB',
    status: 'awarded',
    recordKind: 'contract_award',
    valueMin: 100,
    valueMax: 200,
  }

  it('framework drops supplier/status/recordKind/q, keeps CPV + buyer geo + bounds', () => {
    const { scope, dropped } = scrubScopeForAnalysisGrain(fullScope, 'framework')
    expect(scope.supplierCui).toBeUndefined()
    expect(scope.supplierCounty).toBeUndefined()
    expect(scope.status).toBeUndefined()
    expect(scope.recordKind).toBeUndefined()
    expect(scope.q).toBeUndefined()
    expect(scope.cpvGroup).toBe('45200000')
    expect(scope.buyerCounty).toBe('AB')
    expect(scope.authorityCui).toBe('111')
    expect(scope.valueMin).toBe(100)
    expect(dropped).toContain('supplier_cui')
    expect(dropped).toContain('q')
  })

  it('calloff keeps supplierCui but drops fine CPV + supplier geo', () => {
    const { scope, dropped } = scrubScopeForAnalysisGrain(fullScope, 'calloff')
    expect(scope.supplierCui).toBe('222')
    expect(scope.cpvGroup).toBeUndefined()
    expect(scope.supplierCounty).toBeUndefined()
    expect(scope.recordKind).toBeUndefined()
    expect(scope.valueMin).toBe(100)
    expect(dropped).toContain('cpv_group')
  })

  it('modification drops value bounds and keeps the linked recordKind', () => {
    const { scope } = scrubScopeForAnalysisGrain(fullScope, 'modification')
    expect(scope.valueMin).toBeUndefined()
    expect(scope.valueMax).toBeUndefined()
    // Modifications expose the LINKED contract's record kind — kept.
    expect(scope.recordKind).toBe('contract_award')
    expect(scope.supplierCui).toBe('222')
  })

  it('core contract scope passes through untouched', () => {
    const { scope, dropped } = scrubScopeForAnalysisGrain(fullScope, 'contract')
    expect(scope).toEqual(fullScope)
    expect(dropped).toEqual([])
  })

  it('procedure drops all supplier anchors', () => {
    const { scope } = scrubScopeForAnalysisGrain(fullScope, 'procedure')
    expect(scope.supplierCui).toBeUndefined()
    expect(scope.supplierCounty).toBeUndefined()
  })
})
