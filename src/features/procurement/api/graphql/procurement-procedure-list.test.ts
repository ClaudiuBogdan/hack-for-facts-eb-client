import { describe, expect, it } from 'vitest'

import { mapProcedure } from './procurement-mappers'
import {
  PROCUREMENT_CONTRACTS_QUERY,
  PROCUREMENT_DIRECT_ACQUISITIONS_QUERY,
  PROCUREMENT_PROCEDURES_QUERY,
  procurementProceduresResponseSchema,
} from './procurement-queries'

/**
 * The server answers a procedure's `isCanonical` / `dupGroupId` from its active
 * analysis generation (P36): null with a field error when that is unknown or
 * ClickHouse is unreachable, and the GraphQL client rejects a response with any
 * error. Nothing in the client reads them, so the procedure list must not ask
 * for them; contracts and direct purchases keep their own dedup metadata.
 */
describe('procedure list metadata', () => {
  it('does not select procedure canonicality', () => {
    expect(PROCUREMENT_PROCEDURES_QUERY).not.toMatch(/\bisCanonical\b/)
    expect(PROCUREMENT_PROCEDURES_QUERY).not.toMatch(/\bdupGroupId\b/)
    expect(PROCUREMENT_PROCEDURES_QUERY).not.toMatch(/\bduplicates\b/)
  })

  it('keeps contract and direct-purchase dedup metadata', () => {
    for (const query of [PROCUREMENT_CONTRACTS_QUERY, PROCUREMENT_DIRECT_ACQUISITIONS_QUERY]) {
      expect(query).toMatch(/\bisCanonical\b/)
      expect(query).toMatch(/\bdupGroupId\b/)
    }
  })

  it('reads a page whose procedures carry no canonicality', () => {
    const page = procurementProceduresResponseSchema.parse({
      procurementProcedures: {
        total: 1,
        totalEstimated: false,
        provenance: { engine: 'opensearch', asOf: null },
        items: [
          {
            id: '573731',
            noticeNo: 'CAN1160189',
            noticeKind: null,
            procedureType: null,
            contractKind: null,
            title: 'Furnizare',
            authority: { cui: '3551942', name: 'Spitalul', displayName: 'Spitalul' },
            cpvCode: null,
            cpvDivisionCode: null,
            estimatedValueRon: null,
            awardedValueRon: '97092.00',
            currency: 'RON',
            value: {
              valueState: 'official_exact',
              valueStateRule: 'own_value',
              valueAccepted: true,
              valueRonComparable: '97092.00',
              valueComparableBasis: 'official',
              valueRulesVersion: 9,
              valueResolvedAt: null,
            },
            status: 'awarded',
            countyName: null,
            publicationDate: '2025-12-30',
            stateDate: null,
            sourceSystem: 'seap_notice',
            sourceUrl: null,
          },
        ],
      },
    }).procurementProcedures
    const record = mapProcedure(page.items[0]!)
    expect(record).toMatchObject({ id: '573731', grain: 'procedure', publicationDate: '2025-12-30' })
    expect(record).not.toHaveProperty('isCanonical')
    expect(record).not.toHaveProperty('dupGroupId')
  })
})
