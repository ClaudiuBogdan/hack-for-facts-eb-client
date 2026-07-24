/**
 * Value-basis (vbasis) URL axis — design v1.1. The plan resolver and the
 * scope scrub are the single derivation every view reads; these tests pin the
 * normalization laws, the population mapping and the never-silently-sent
 * filter drops.
 */
import { describe, expect, it } from 'vitest'
import {
  cleanProcurementHubSearch,
  hubStateToRankingScopeInput,
  parseProcurementHubSearch,
  resolveProcurementValueBasisPlan,
  scrubScopeForAnalysisGrain,
} from './procurement-hub'

describe('vbasis URL parsing + normalization', () => {
  it('defaults to awarded and cleans the default away', () => {
    expect(parseProcurementHubSearch({}).vbasis).toBe('awarded')
    expect(cleanProcurementHubSearch({ vbasis: 'awarded' })).toEqual({})
    expect(cleanProcurementHubSearch({ vbasis: 'ceiling' })).toEqual({
      vbasis: 'ceiling',
    })
  })

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

describe('value-basis plan resolution', () => {
  it('maps each logic to its server population and measure', () => {
    expect(
      resolveProcurementValueBasisPlan({ vbasis: 'awarded', grain: 'contracts' }),
    ).toMatchObject({
      analysisGrain: 'contract',
      valueMeasure: 'valueAwardedSum',
      usesLandingPipeline: true,
      breakdowns: 'anchor',
    })
    expect(
      resolveProcurementValueBasisPlan({ vbasis: 'ceiling', grain: 'contracts' }),
    ).toMatchObject({
      analysisGrain: 'framework',
      valueMeasure: 'valueCeilingSum',
      breakdowns: 'withheld',
      supplierDimension: false,
      concentration: false,
      grainOptions: [],
    })
    expect(
      resolveProcurementValueBasisPlan({ vbasis: 'calloff', grain: 'contracts' }),
    ).toMatchObject({
      analysisGrain: 'calloff',
      valueMeasure: 'valueAwardedSum',
      breakdowns: 'anchor',
      cpvBeyondDivision: false,
      concentration: true,
    })
    expect(
      resolveProcurementValueBasisPlan({
        vbasis: 'mod_adjusted',
        grain: 'contracts',
      }),
    ).toMatchObject({
      analysisGrain: 'contract',
      valueMeasure: 'valueModAdjustedSum',
      grainOptions: ['contracts'],
    })
    expect(
      resolveProcurementValueBasisPlan({
        vbasis: 'awarded',
        grain: 'modifications',
      }),
    ).toMatchObject({
      analysisGrain: 'modification',
      valueMeasure: null,
      breakdowns: 'counts-only',
      cpvBeyondDivision: false,
      concentration: false,
    })
  })

  it('estimated follows the hub grain and admits procedures', () => {
    expect(
      resolveProcurementValueBasisPlan({ vbasis: 'estimated', grain: 'procedures' }),
    ).toMatchObject({
      analysisGrain: 'procedure',
      valueMeasure: 'valueEstimatedSum',
      supplierDimension: false,
      concentration: false,
      grainOptions: ['contracts', 'direct_acquisitions', 'procedures'],
    })
    expect(
      resolveProcurementValueBasisPlan({ vbasis: 'estimated', grain: 'contracts' })
        .analysisGrain,
    ).toBe('contract')
  })

  it('every non-default plan leaves the landing pipeline', () => {
    for (const vbasis of ['estimated', 'ceiling', 'calloff', 'mod_adjusted'] as const) {
      expect(
        resolveProcurementValueBasisPlan({ vbasis, grain: 'contracts' })
          .usesLandingPipeline,
      ).toBe(false)
    }
  })
})

describe('scope scrub per population (server design v1.1)', () => {
  const fullScope = hubStateToRankingScopeInput(
    parseProcurementHubSearch({
      q: 'drum',
      authority_cui: '111',
      supplier_cui: '222',
      cpv_group: '45200000',
      supplierCounty: 'CJ',
      buyerCounty: 'AB',
      status: 'awarded',
      record_kind: 'purchases',
      valueMin: 100,
      valueMax: 200,
    }),
  )

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

  it('a REAL modifications state forwards record_kind to the population scope (review F2)', () => {
    const modificationsScope = hubStateToRankingScopeInput(
      parseProcurementHubSearch({
        grain: 'modifications',
        record_kind: 'purchases',
        valueMin: 100,
      }),
    )
    expect(modificationsScope.recordKind).toBe('contract_award')
    const { scope } = scrubScopeForAnalysisGrain(
      modificationsScope,
      'modification',
    )
    expect(scope.recordKind).toBe('contract_award')
    expect(scope.valueMin).toBeUndefined()
  })

  it('record_kind still never reaches DA/procedure scopes', () => {
    const daScope = hubStateToRankingScopeInput(
      parseProcurementHubSearch({
        grain: 'direct_acquisitions',
        record_kind: 'purchases',
      }),
    )
    expect(daScope.recordKind).toBeUndefined()
  })
})
