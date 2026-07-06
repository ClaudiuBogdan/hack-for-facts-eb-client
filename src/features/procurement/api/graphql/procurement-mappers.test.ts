import { describe, expect, it } from 'vitest'
import { procurementDataStatus } from '@/schemas/procurement'
import {
  gateForUiGrain,
  mapContract,
  mapDirectAcquisition,
  mapFlowRecord,
  mapGate,
  mapLanding,
  mapModification,
  mapProcedure,
  mapSupplierSlice,
} from './procurement-mappers'
import type {
  RawProcurementAggregates,
  RawProcurementContract,
  RawProcurementDirectAcquisition,
  RawProcurementGate,
} from './procurement-queries'

const rawParty = { cui: '123', name: 'AUTORITATE', displayName: 'Autoritate' }
const nullParty = { cui: null, name: null, displayName: null }

const rawDaGate: RawProcurementGate = {
  sourceGrain: 'direct_acquisition',
  rowsCount: '15822708',
  authorityCuiCoverageRate: '0.99',
  supplierCuiCoverageRate: '0.99',
  amountCoverageRate: '0.998',
  cpvCoverageRate: '0.99',
  dateCoverageRate: '0.96',
  filterAnswersAllowed: true,
  spendRankingsAllowed: true,
  supplierRegionFiltersAllowed: false,
  blockers: [],
  dataAsOf: '2026-06-25',
  cadence: 'zilnic',
}

const rawContractGate: RawProcurementGate = {
  ...rawDaGate,
  sourceGrain: 'procurement_contract',
  spendRankingsAllowed: false,
  filterAnswersAllowed: false,
  dataAsOf: null,
}

const rawContract: RawProcurementContract = {
  id: 'c1',
  contractNo: '3882',
  contractDate: '2023-09-21',
  procedureId: null,
  noticeNo: 'SCNA1092986',
  title: 'Lucrări de reparații',
  authority: rawParty,
  supplier: rawParty,
  cpvCode: '45453000',
  cpvDivisionCode: '45',
  valueRon: '1171228.00',
  estimatedValueRon: null,
  currency: null,
  isRon: true,
  valueSuspect: false,
  status: 'awarded',
  sourceSystem: 'seap_contracts',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
  modifications: null,
}

const sparseDa: RawProcurementDirectAcquisition = {
  id: 'da1',
  uniqueCode: null,
  title: null,
  authority: nullParty,
  supplier: nullParty,
  cpvCode: null,
  cpvDivisionCode: null,
  valueRon: null,
  estimatedValueRon: null,
  currency: null,
  isRon: true,
  valueSuspect: false,
  status: 'weird-token',
  countyName: null,
  publicationDate: null,
  finalizationDate: null,
  sourceSystem: 'seap_dan',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
}

function aggregates(
  overrides: Partial<RawProcurementAggregates['procurementStats']> = {},
): RawProcurementAggregates {
  return {
    procurementStats: {
      totalValueRon: '475000000.00',
      contractsCount: '895584',
      directAcquisitionsCount: '15822708',
      proceduresCount: '120000',
      buyersCount: '4120',
      suppliersCount: '11860',
      firstFlowDate: '2021-01-04',
      lastFlowDate: '2026-06-25',
      ...overrides,
    },
    procurementTopAuthorities: [],
    procurementTopSuppliers: [],
    procurementCategoryBreakdown: [],
    procurementSpendOverTime: [],
  }
}

describe('grain record mappers', () => {
  it('normalizes unknown status tokens to the first-class "unknown"', () => {
    expect(mapDirectAcquisition(sparseDa).status).toBe('unknown')
  })

  it('maps a sparse DA row without fabricating any value', () => {
    const record = mapDirectAcquisition(sparseDa)
    expect(record.valueRon).toBeNull()
    expect(record.title).toBeNull()
    expect(record.authority).toEqual(nullParty)
    expect(record.grain).toBe('direct_acquisition')
  })

  it('maps a contract and defaults a null modifications trail to []', () => {
    const record = mapContract(rawContract)
    expect(record.grain).toBe('contract')
    expect(record.modifications).toEqual([])
    expect(record.valueRon).toBe('1171228.00')
  })

  it('fails loud on a source system outside the prod vocabulary', () => {
    expect(() =>
      mapContract({ ...rawContract, sourceSystem: 'made_up' }),
    ).toThrow()
  })

  it('drops unknown contract kinds to null on procedures', () => {
    const procedure = mapProcedure({
      id: 'p1',
      noticeNo: null,
      noticeKind: null,
      procedureType: null,
      contractKind: 'mystery',
      title: null,
      authority: rawParty,
      cpvCode: null,
      cpvDivisionCode: null,
      estimatedValueRon: null,
      awardedValueRon: null,
      currency: null,
      isRon: true,
      valueSuspect: false,
      status: 'published',
      countyName: null,
      publicationDate: null,
      stateDate: null,
      sourceSystem: 'seap_notice',
      sourceUrl: null,
      isCanonical: true,
      dupGroupId: null,
    })
    expect(procedure.contractKind).toBeNull()
  })

  it('normalizes unexpected modification link methods to null (unlinked)', () => {
    const modification = mapModification({
      id: 'm1',
      contractId: 'c1',
      linkMethod: 'guesswork',
      linkConfidence: 0.5,
      modificationDate: null,
      valueBeforeRon: null,
      valueAfterRon: null,
      valueDeltaRon: '-100.00',
      modificationType: null,
      authority: rawParty,
      supplier: rawParty,
      contractNo: null,
      noticeNo: null,
      sourceUrl: null,
      parentContract: null,
    })
    expect(modification.linkMethod).toBeNull()
    expect(modification.valueDeltaRon).toBe('-100.00')
  })

  it('dispatches supplier flow records on __typename', () => {
    expect(
      mapFlowRecord({ __typename: 'ProcurementContract', ...rawContract })
        .grain,
    ).toBe('contract')
    expect(
      mapFlowRecord({
        __typename: 'ProcurementDirectAcquisition',
        ...sparseDa,
      }).grain,
    ).toBe('direct_acquisition')
  })
})

describe('gates', () => {
  it('propagates a null dataAsOf so the derived status is unverified', () => {
    const gate = mapGate(rawContractGate)
    expect(procurementDataStatus(gate)).toBe('unverified')
  })

  it('annotates UI grains with the matching source-grain gate', () => {
    const gates = [mapGate(rawDaGate), mapGate(rawContractGate)]
    expect(gateForUiGrain(gates, 'direct_acquisitions').sourceGrain).toBe(
      'direct_acquisition',
    )
    expect(gateForUiGrain(gates, 'contracts').sourceGrain).toBe(
      'procurement_contract',
    )
    expect(gateForUiGrain(gates, 'modifications').sourceGrain).toBe(
      'procurement_contract',
    )
  })
})

describe('mapLanding', () => {
  it('derives headline counts and keeps the gated total', () => {
    const landing = mapLanding({
      aggregates: aggregates(),
      gates: [mapGate(rawDaGate), mapGate(rawContractGate)],
    })
    expect(landing.headline.recordsCount).toBe(895584 + 15822708)
    expect(landing.headline.totalValueRon).toBe('475000000.00')
    expect(landing.gate.sourceGrain).toBe('direct_acquisition')
  })

  it('nulls the total when the anchoring gate blocks spend rankings', () => {
    const blockedDaGate = mapGate({ ...rawDaGate, spendRankingsAllowed: false })
    const landing = mapLanding({
      aggregates: aggregates(),
      gates: [blockedDaGate, mapGate(rawContractGate)],
    })
    expect(landing.headline.totalValueRon).toBeNull()
  })

  it('keeps an unknown count representable as null (never a fake 0)', () => {
    const landing = mapLanding({
      // 2^53 overflows a safe integer — count is unknown, not rounded.
      aggregates: aggregates({ buyersCount: '9007199254740993' }),
      gates: [mapGate(rawDaGate), mapGate(rawContractGate)],
    })
    expect(landing.headline.buyersCount).toBeNull()
  })
})

describe('mapSupplierSlice', () => {
  it('serves crossDomain as null (unknown) — the API has no backing', () => {
    const slice = mapSupplierSlice({
      supplierCui: '123',
      aggregates: aggregates({
        contractsCount: '10',
        directAcquisitionsCount: '40',
        buyersCount: '5',
        suppliersCount: '1',
      }),
      gates: [mapGate(rawDaGate), mapGate(rawContractGate)],
      recentRecords: {
        records: [],
        total: 0,
        hasNextPage: false,
        endCursor: null,
      },
    })
    expect(slice.crossDomain).toBeNull()
    expect(slice.summary.buyersCount).toBe(5)
    expect(slice.summary.window).toEqual({
      from: '2021-01-04',
      to: '2026-06-25',
    })
  })
})
