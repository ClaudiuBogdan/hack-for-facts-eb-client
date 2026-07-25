import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  fetchProcurementInstitutionOverviewLive,
  resetProcurementLiveCachesForTests,
  type ProcurementInstitutionScopes,
} from './procurement-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * The live reproduction: /procurement/institutions/36727850?year=2025. Every
 * accepted award belongs to a multi-member consortium, so the concentration has
 * no positive supplier value AND the whole awarded mass is withheld.
 */
const WITHHELD = '22262996083.00'

const answerMeta = (grain: string, caveats: readonly string[] = []) => ({
  answerability: 'served',
  reason: null,
  policyKey: 'procurement.value_awarded',
  grain,
  valueBasis: 'awarded',
  dateBasis: 'canonical_date',
  population: 'canonical records',
  buildId: '9',
  counts: { rows: '26', withValue: '0' },
  undatedInScope: { count: '1', valueRon: null },
  provisional: false,
  caveats,
  canonicalScope: 'authorityCui=36727850&grain=contract&from=2025-01&to=2025-12',
})

const statsBlock = (grain: string) => ({
  grain,
  recordCount: '26',
  withValueCount: '5',
  withEstimatedCount: '0',
  valueAwardedSum: WITHHELD,
  valueEstimatedSum: null,
  valueCeilingSum: null,
  valueModAdjustedSum: null,
  valueAwardedMatchedSum: null,
  valueWithheldAssociationSum: null,
  avgValueAwarded: null,
  minMonth: '2025-01',
  maxMonth: '2025-12',
  moneyVerdicts: [],
  meta: answerMeta(grain),
})

const CONSORTIUM_CAVEAT = `supplier attribution: ${WITHHELD} RON of ${WITHHELD} RON awarded in this scope (100.0%) belongs to multi-member consortium awards — the internal split is not published, so per-supplier money excludes it (withheld, never redistributed)`

const spineResponse = (
  concentration: Record<string, unknown> | null = {
    grain: 'contract',
    basis: 'value',
    supplierCount: 10,
    top1Share: null,
    top5Share: null,
    hhi: null,
    totalRon: null,
    valueWithheldAssociationSum: WITHHELD,
    meta: answerMeta('contract', [CONSORTIUM_CAVEAT]),
  },
) => ({
  procedures: { blocks: [statsBlock('procedure')] },
  contracts: { blocks: [statsBlock('contract')] },
  directAcquisitions: { blocks: [statsBlock('direct_acquisition')] },
  modifications: { blocks: [statsBlock('modification')] },
  frameworks: { blocks: [statsBlock('framework')] },
  calloffs: { blocks: [statsBlock('calloff')] },
  concentration: concentration === null ? [] : [concentration],
  procedureMix: [],
})

const PERIOD = { monthFrom: '2025-01', monthTo: '2025-12' } as const
const SCOPES: ProcurementInstitutionScopes = {
  procedure: PERIOD,
  contract: PERIOD,
  direct_acquisition: PERIOD,
  modification: PERIOD,
  framework: PERIOD,
  calloff: PERIOD,
}

beforeEach(() => {
  graphqlQueryMock.mockReset()
  resetProcurementLiveCachesForTests()
})

describe('institution overview — consortium withholding', () => {
  it('maps the withheld consortium mass onto the concentration signal', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce(spineResponse())
      .mockResolvedValueOnce({ authorities: [] })

    const overview = await fetchProcurementInstitutionOverviewLive({
      authorityCui: '36727850',
      scopes: SCOPES,
    })

    expect(overview.signals.concentration?.withheldConsortiumRon).toBe(WITHHELD)
    // No positive supplier value exists, so nothing is invented for the metric.
    expect(overview.signals.concentration?.totalRon).toBeNull()
    expect(overview.signals.concentration?.top5Share).toBeNull()
    expect(overview.signals.concentration?.supplierCount).toBe(10)
  })

  it('selects the field in the spine query', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce(spineResponse())
      .mockResolvedValueOnce({ authorities: [] })

    await fetchProcurementInstitutionOverviewLive({
      authorityCui: '36727850',
      scopes: SCOPES,
    })

    expect(graphqlQueryMock.mock.calls[0]?.[0]).toContain(
      'valueWithheldAssociationSum',
    )
  })

  it('carries the concentration envelope so the page can disclose it', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce(spineResponse())
      .mockResolvedValueOnce({ authorities: [] })

    const overview = await fetchProcurementInstitutionOverviewLive({
      authorityCui: '36727850',
      scopes: SCOPES,
    })

    expect(overview.signals.concentration?.meta.caveats).toContain(
      CONSORTIUM_CAVEAT,
    )
  })

  it('tolerates a server that does not publish the field yet', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce(
        spineResponse({
          grain: 'contract',
          basis: 'value',
          supplierCount: 3,
          top1Share: '0.5000',
          top5Share: '0.9000',
          hhi: '0.3400',
          totalRon: '1000.00',
          meta: answerMeta('contract'),
        }),
      )
      .mockResolvedValueOnce({ authorities: [] })

    const overview = await fetchProcurementInstitutionOverviewLive({
      authorityCui: '36727850',
      scopes: SCOPES,
    })

    expect(overview.signals.concentration?.withheldConsortiumRon).toBeNull()
    expect(overview.signals.concentration?.totalRon).toBe('1000.00')
  })
})
