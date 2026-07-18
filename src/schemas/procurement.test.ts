import { describe, expect, it } from 'vitest'
import {
  contractModificationSchema,
  procurementAnswerMetaSchema,
  procurementRecordSummarySchema,
  supplierRecordsPageSchema,
  topPartyRowSchema,
} from './procurement'

const baseParty = { cui: null, name: null, displayName: null }

describe('procurement money/count string guards', () => {
  it('allows negative decimal strings for modification deltas', () => {
    const mod = contractModificationSchema.parse({
      id: 'm1',
      contractId: null,
      linkMethod: null,
      linkConfidence: null,
      modificationDate: null,
      valueBeforeRon: '100.00',
      valueAfterRon: '50.00',
      valueDeltaRon: '-50.00',
      modificationType: null,
    })
    expect(mod.valueDeltaRon).toBe('-50.00')
  })

  it('rejects malformed decimal strings instead of letting NaN through', () => {
    expect(() =>
      topPartyRowSchema.parse({
        authority: baseParty,
        supplier: null,
        grain: 'direct_acquisition',
        bucketKind: 'top',
        shareOfScope: null,
        flowCount: 'twelve',
        amountRonSum: null,
        amountPresentCount: '0',
        amountMissingCount: '0',
        firstFlowDate: null,
        lastFlowDate: null,
        evidenceRefsSample: [],
      }),
    ).toThrow()
  })

  it('accepts the server answerability contract without inventing coverage rates', () => {
    const meta = procurementAnswerMetaSchema.parse({
      answerability: 'abstained',
      reason: 'SPEND_COVERAGE_BELOW_GATE',
      policyKey: 'procurement.value',
      grain: 'contract',
      valueBasis: null,
      dateBasis: 'contract_date',
      population: 'canonical',
      buildId: '2',
      counts: { rows: '10', withValue: '4' },
      undatedInScope: null,
      provisional: false,
      caveats: [],
      canonicalScope: 'grain=contract',
    })
    expect(meta.answerability).toBe('abstained')
  })
})

describe('procurement record summary union', () => {
  it('narrows by grain discriminator', () => {
    const record = procurementRecordSummarySchema.parse({
      id: 'da-1',
      grain: 'direct_acquisition',
      uniqueCode: null,
      title: null,
      authority: baseParty,
      supplier: baseParty,
      cpvCode: null,
      cpvDivisionCode: null,
      valueRon: null,
      estimatedValueRon: null,
      currency: null,
      value: {
        valueState: 'source_missing',
        valueStateRule: null,
        valueAccepted: false,
        valueRonComparable: null,
        valueComparableBasis: null,
        valueRulesVersion: 2,
        valueResolvedAt: null,
      },
      status: 'unknown',
      stateId: null,
      countyName: null,
      publicationDate: null,
      finalizationDate: null,
      sourceSystem: 'seap_dan',
      sourceUrl: null,
      isCanonical: true,
      dupGroupId: null,
    })
    expect(record.grain).toBe('direct_acquisition')
    if (record.grain === 'direct_acquisition') {
      expect(record.finalizationDate).toBeNull()
    }
  })

  it('rejects a record with an unknown grain literal', () => {
    expect(() =>
      procurementRecordSummarySchema.parse({ id: 'x', grain: 'lots' }),
    ).toThrow()
  })
})

describe('supplier records cursor page', () => {
  it('accepts a null total (unknown/too large)', () => {
    const page = supplierRecordsPageSchema.parse({
      records: [],
      total: null,
      hasNextPage: false,
      endCursor: null,
    })
    expect(page.total).toBeNull()
  })
})
