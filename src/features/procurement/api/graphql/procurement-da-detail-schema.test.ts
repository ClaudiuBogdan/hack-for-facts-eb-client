import { describe, expect, it } from 'vitest'

import {
  PROCUREMENT_DA_DETAIL_QUERY,
  procurementDaDetailResponseSchema,
} from './procurement-queries'

/**
 * The direct-acquisition detail response contract.
 *
 * `detailAvailability` is the field that decides which honest sentence the page
 * shows when there is no itemised basket. If the transport schema does not know
 * a value the server can send, the parse throws and the WHOLE detail page dies —
 * including the summary, parties and value that loaded perfectly well. That is
 * exactly the failure mode this suite guards, so the enum is pinned by name.
 */

const party = { cui: '4350505', name: 'Primaria Exemplu', displayName: 'Primaria Exemplu' }

const value = {
  valueState: 'official_exact',
  valueStateRule: 'own_value',
  valueAccepted: true,
  valueRonComparable: '1200.00',
  valueComparableBasis: 'official',
  valueRulesVersion: 2,
  valueResolvedAt: null,
}

/** A canonical seap_dan row — the family whose source publishes summaries only. */
const directAcquisition = {
  id: '71690399',
  uniqueCode: 'DA0001',
  title: 'Furnizare hartie',
  authority: party,
  supplier: party,
  cpvCode: null,
  cpvDivisionCode: null,
  valueRon: '1200.00',
  estimatedValueRon: null,
  currency: 'RON',
  value,
  status: 'finalized',
  countyName: 'Prahova',
  publicationDate: null,
  finalizationDate: '2019-04-11',
  sourceSystem: 'seap_dan',
  sourceUrl: 'https://data.gov.ro/dataset/achizitii-directe/resource/2019.xlsx',
  isCanonical: true,
  dupGroupId: null,
}

const response = (detailAvailability: string) => ({
  procurementDirectAcquisition: {
    directAcquisition,
    detail: null,
    detailAvailability,
    duplicates: [],
  },
})

describe('procurementDaDetailResponseSchema', () => {
  it.each([
    'AVAILABLE',
    'NOT_CAPTURED',
    'NOT_AVAILABLE_FOR_SOURCE',
    'TEMPORARILY_UNAVAILABLE',
  ])('accepts detailAvailability=%s with a null detail body', (availability) => {
    const parsed = procurementDaDetailResponseSchema.parse(response(availability))
    expect(parsed.procurementDirectAcquisition?.detailAvailability).toBe(
      availability,
    )
    // The base record survives every availability state — it is the answer.
    expect(parsed.procurementDirectAcquisition?.directAcquisition.id).toBe(
      '71690399',
    )
  })

  it('rejects an availability value the UI has no sentence for', () => {
    // Fail loudly in tests rather than render a state we cannot explain.
    expect(() =>
      procurementDaDetailResponseSchema.parse(response('SOMETHING_NEW')),
    ).toThrow()
  })

  it('still parses an unknown id as a null bundle (a 404, not a broken page)', () => {
    const parsed = procurementDaDetailResponseSchema.parse({
      procurementDirectAcquisition: null,
    })
    expect(parsed.procurementDirectAcquisition).toBeNull()
  })

  it('asks the server for detailAvailability and the record source url', () => {
    expect(PROCUREMENT_DA_DETAIL_QUERY).toContain('detailAvailability')
    expect(PROCUREMENT_DA_DETAIL_QUERY).toContain('sourceUrl')
  })
})
