import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLegalSearchLive } from './legal-search-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * These tests pin what a well-meaning edit is likeliest to break:
 *  - provision hits are kept only from the OpenSearch engine — measured
 *    2026-08-26, the Postgres path's sections are an act-NAME echo, and
 *    serving them would dress a name lookup up as a text search;
 *  - the nested `LegalDocHit` shape (`{ score, act, summary }`) maps into
 *    the flat UI hit without flattening mistakes;
 *  - `actsTotal: null` stays null ("cannot count"), never 0;
 *  - the honesty flags degrade in the SAFE direction on junk.
 */
const docHit = (overrides: Record<string, unknown> = {}) => ({
  score: 0.93,
  act: {
    actId: '30412',
    displayCitation: 'Legea nr. 53/2003',
    actType: 'lege',
    actNumber: '53',
    actYear: 2003,
    issuerSlug: 'parlamentul',
    status: 'MODIFICAT',
    inDegree: 1980,
  },
  summary: { description: 'Codul muncii reglementează raporturile de muncă.' },
  ...overrides,
})

const served = (overrides: Record<string, unknown> = {}) => ({
  legalSearch: {
    acts: [],
    caveats: ['semantic search unavailable'],
    engine: 'postgres',
    actsTotal: null,
    totalsExhaustive: false,
    degraded: true,
    asOf: null,
    unhydratedHits: 0,
    ...overrides,
  },
})

describe('fetchLegalSearchLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('sends q, includeHistorical and limit — historical defaults to false', async () => {
    graphqlQueryMock.mockResolvedValue(served() as never)

    await fetchLegalSearchLive('codul muncii')

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({
      q: 'codul muncii',
      includeHistorical: false,
      limit: 20,
    })
  })

  it('widens to historical acts only when asked', async () => {
    graphqlQueryMock.mockResolvedValue(served() as never)

    await fetchLegalSearchLive('legea 571/2003', { historical: true })

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({
      q: 'legea 571/2003',
      includeHistorical: true,
      limit: 20,
    })
  })

  const sectionHit = (overrides: Record<string, unknown> = {}) => ({
    act: { actId: '900002' },
    documentId: 'f900012',
    nodeLabel: 'Articol unic',
    snippet: 'Se aprobă <em>renunțarea</em>',
    servedForm: {
      documentId: 'f900012',
      versionKind: 'consolidare',
      versionDate: '2024-03-12',
      caveat: 'unofficial_consolidation',
      portalLabelRaw: null,
      portalLabelDate: '2024-03-12',
      sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900012',
    },
    ...overrides,
  })

  it('asks for acts and provision hits with the form each hit was verified against', async () => {
    graphqlQueryMock.mockResolvedValue(served() as never)

    await fetchLegalSearchLive('codul muncii')

    const [query] = graphqlQueryMock.mock.calls[0]
    expect(query).toMatch(/channel:\s*auto/)
    expect(query).toMatch(/sections \{/)
    expect(query).toMatch(/servedForm \{[^}]*caveat[^}]*portalLabelDate/s)
  })

  it('keeps provision hits from the OpenSearch engine, with their served form', async () => {
    graphqlQueryMock.mockResolvedValue(
      served({ engine: 'opensearch', degraded: false, sections: [sectionHit()] }) as never,
    )
    const result = await fetchLegalSearchLive('renunțare')
    expect(result.sections).toEqual([
      {
        actId: '900002',
        documentId: 'f900012',
        nodeLabel: 'Articol unic',
        snippet: 'Se aprobă <em>renunțarea</em>',
        servedForm: {
          documentId: 'f900012',
          versionKind: 'consolidare',
          versionDate: '2024-03-12',
          caveat: 'unofficial_consolidation',
          portalLabelRaw: null,
          portalLabelDate: '2024-03-12',
          sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900012',
        },
      },
    ])
  })

  it("drops the Postgres path's provision hits — a name echo, not a text match", async () => {
    graphqlQueryMock.mockResolvedValue(served({ sections: [sectionHit()] }) as never)
    expect((await fetchLegalSearchLive('codul muncii')).sections).toEqual([])
  })

  it('maps the NESTED act shape: hit { score, act, summary } → flat UI hit', async () => {
    graphqlQueryMock.mockResolvedValue(
      served({
        acts: [
          docHit(),
          docHit({
            score: 0.4,
            act: {
              actId: '187041',
              displayCitation: 'CODUL FISCAL din 22 decembrie 2003',
              actType: 'lege',
              actNumber: null,
              actYear: 2003,
              issuerSlug: null,
              status: 'ABROGAT',
              inDegree: 1154,
            },
            summary: null,
          }),
        ],
        caveats: ['semantic search unavailable', 'alt avertisment'],
      }) as never,
    )

    const result = await fetchLegalSearchLive('cod')

    expect(result.acts).toEqual([
      {
        score: 0.93,
        act: {
          actId: '30412',
          displayCitation: 'Legea nr. 53/2003',
          actType: 'lege',
          actNumber: '53',
          actYear: 2003,
          issuerSlug: 'parlamentul',
          status: 'modificat',
          inDegree: 1980,
        },
        description: 'Codul muncii reglementează raporturile de muncă.',
      },
      {
        score: 0.4,
        act: {
          actId: '187041',
          displayCitation: 'CODUL FISCAL din 22 decembrie 2003',
          actType: 'lege',
          actNumber: null,
          actYear: 2003,
          issuerSlug: null,
          status: 'abrogat',
          inDegree: 1154,
        },
        // summary null → no snippet, never an empty-string one.
        description: null,
      },
    ])
    expect(result.caveats).toEqual([
      'semantic search unavailable',
      'alt avertisment',
    ])
  })

  it('keeps actsTotal null as null — "cannot count" is not 0', async () => {
    graphqlQueryMock.mockResolvedValue(served({ actsTotal: null }) as never)

    const result = await fetchLegalSearchLive('codul muncii')

    expect(result.actsTotal).toBeNull()
  })

  it('passes a real engine total and its exhaustiveness through', async () => {
    graphqlQueryMock.mockResolvedValue(
      served({
        acts: [docHit()],
        caveats: [],
        engine: 'opensearch',
        actsTotal: 41,
        totalsExhaustive: true,
        degraded: false,
        asOf: '2026-08-20T00:00:00Z',
        unhydratedHits: 3,
      }) as never,
    )

    const result = await fetchLegalSearchLive('codul muncii')

    expect(result.engine).toBe('opensearch')
    expect(result.actsTotal).toBe(41)
    expect(result.totalsExhaustive).toBe(true)
    expect(result.degraded).toBe(false)
    expect(result.asOf).toBe('2026-08-20T00:00:00Z')
    expect(result.unhydratedHits).toBe(3)
  })

  it('degrades junk honesty flags in the safe direction', async () => {
    graphqlQueryMock.mockResolvedValue(
      served({
        totalsExhaustive: 'yes',
        degraded: undefined,
        actsTotal: 'many',
      }) as never,
    )

    const result = await fetchLegalSearchLive('codul muncii')

    // A total is only exhaustive when the server SAID so; an answer is
    // degraded unless the server said it is not; a non-numeric total is
    // unknown, not a number.
    expect(result.totalsExhaustive).toBe(false)
    expect(result.degraded).toBe(true)
    expect(result.actsTotal).toBeNull()
  })

  it('propagates a transport failure instead of serving an empty result', async () => {
    graphqlQueryMock.mockRejectedValue(new Error('search timed out'))

    await expect(fetchLegalSearchLive('codul muncii')).rejects.toThrow(
      /search timed out/,
    )
  })
})
