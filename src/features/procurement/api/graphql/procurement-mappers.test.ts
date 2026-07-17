import { describe, expect, it } from 'vitest'
import { procurementDataStatus } from '@/schemas/procurement'
import type { RawProcurementAggregates } from './procurement-queries'
import { addDecimalStrings, mapLanding } from './procurement-mappers'

const meta = (
  grain: 'procedure' | 'contract' | 'direct_acquisition',
  answerability: 'served' | 'degraded' | 'abstained' = 'degraded',
) => ({
  answerability,
  reason: answerability === 'served' ? null : ('SPEND_COVERAGE_BELOW_GATE' as const),
  policyKey: 'procurement.count',
  grain,
  valueBasis: null,
  dateBasis: 'canonical_date',
  population: 'canonical records',
  buildId: '2',
  counts: { rows: '10', withValue: '4' },
  undatedInScope: null,
  provisional: false,
  caveats: [],
  canonicalScope: `grain=${grain}`,
})

const block = (
  grain: 'procedure' | 'contract' | 'direct_acquisition',
  valueAwardedSum: string | null,
) => ({
  grain,
  recordCount: grain === 'procedure' ? '7' : grain === 'contract' ? '2' : '3',
  withValueCount: '1',
  withEstimatedCount: '1',
  valueAwardedSum,
  valueEstimatedSum: grain === 'procedure' ? '999999999.99' : '500.00',
  avgValueAwarded: null,
  minMonth: '2025-01',
  maxMonth: '2025-02',
  meta: meta(grain),
})

function aggregates(
  contractValue: string | null,
  daValue: string | null,
): RawProcurementAggregates {
  const grains = ['procedure', 'contract', 'direct_acquisition'] as const
  const breakdown = (dimension: string) => grains.map((grain) => ({
    grain,
    dimension,
    rankedBy: 'recordCount',
    buckets: [],
    meta: meta(grain),
  }))
  const series = (measure: string) => grains.map((grain) => ({
    grain,
    measure,
    bucket: 'month',
    points: [],
    meta: meta(grain),
  }))
  return {
    procurementStats: {
      blocks: [block('procedure', null), block('contract', contractValue), block('direct_acquisition', daValue)],
    },
    authorities: breakdown('authority'),
    suppliers: breakdown('supplier'),
    categories: breakdown('cpvDivision'),
    recordSeries: series('recordCount'),
    valueSeries: series('valueAwardedSum'),
  }
}

describe('unified procurement mapper honesty', () => {
  it('adds decimal strings exactly and excludes procedure estimated value', () => {
    const landing = mapLanding({ aggregates: aggregates('0.10', '0.20'), divisions: [] })
    expect(landing.headline.totalValueRon).toBe('0.30')
    expect(landing.headline.proceduresCount).toBe('7')
    expect(landing.headline.buyersCount).toBeNull()
    expect(landing.headline.suppliersCount).toBeNull()
  })

  it('keeps the total null if either awarded-value block abstains', () => {
    const landing = mapLanding({ aggregates: aggregates(null, '5.00'), divisions: [] })
    expect(landing.headline.totalValueRon).toBeNull()
  })

  it('adds resolved names to authority and supplier ranking rows', () => {
    const input = aggregates('10.00', '5.00')
    const bucket = {
      key: '123',
      kind: 'top',
      recordCount: '4',
      withValueCount: '3',
      valueAwardedSum: '10.00',
      shareOfScope: '0.5000',
    }
    input.authorities[1]!.buckets = [bucket]
    input.suppliers[1]!.buckets = [bucket]

    const landing = mapLanding({
      aggregates: input,
      divisions: [],
      partyNames: new Map([
        ['authority:123', 'Public Buyer'],
        ['supplier:123', 'Private Supplier'],
      ]),
    })

    expect(landing.analysisByGrain.contract.topAuthorities[0]?.authority).toEqual({
      cui: '123',
      name: 'Public Buyer',
      displayName: null,
    })
    expect(landing.analysisByGrain.contract.topSuppliers[0]?.supplier?.name).toBe(
      'Private Supplier',
    )
  })

  it('maps server answerability directly to DataStatus', () => {
    expect(procurementDataStatus(meta('contract', 'served'))).toBe('live')
    expect(procurementDataStatus(meta('contract', 'degraded'))).toBe('partial')
    expect(procurementDataStatus(meta('contract', 'abstained'))).toBe('unverified')
  })

  it('never uses floating point for money addition', () => {
    expect(addDecimalStrings('9007199254740993.10', '0.90')).toBe('9007199254740994.00')
  })
})
