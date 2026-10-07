import { describe, it, expect } from 'vitest'
import { mapSearchHit, mapSearchResult } from './entity-search-mappers'
import { searchEntitiesResponseSchema, type RawSearchHit, type SearchEntitiesAnswer } from './entity-search-queries'
import { CURRENT_PAGE, DEGRADED_PAGE, MIXED_ENTERPRISE_HIT, UNAVAILABLE_PAGE } from './entity-search.fixtures'

function rawHit(overrides: Partial<RawSearchHit>): RawSearchHit {
  return {
    id: 'h1',
    docType: 'company',
    title: 'ACME SRL',
    snippet: null,
    score: null,
    docId: null,
    docKey: null,
    subtitle: null,
    countyName: null,
    url: null,
    cuis: null,
    identifiers: null,
    roles: null,
    isActive: null,
    company: null,
    ...overrides,
  }
}

/** A fixture read the way the transport reads it. */
function answerOf(page: unknown): SearchEntitiesAnswer {
  const answer = searchEntitiesResponseSchema.parse({ searchEntities: page }).searchEntities
  if (answer === null) throw new Error('fixture has no answer')
  return answer
}

describe('mapSearchHit', () => {
  it('computes an internal href for a company hit', () => {
    const hit = mapSearchHit(rawHit({ docType: 'company', cuis: ['2816464'] }))
    expect(hit.href).toBe('/companies/2816464')
    expect(hit.isExternal).toBe(false)
  })

  it('computes an internal href for a legal_act hit with an act ID', () => {
    const hit = mapSearchHit(
      rawHit({
        docType: 'legal_act',
        docId: '66150',
        url: 'https://gov.test/lege',
      }),
    )
    expect(hit.href).toBe('/legislation/acts/66150')
    expect(hit.isExternal).toBe(false)
  })

  it('falls back to empty href + non-external when no target is usable', () => {
    const hit = mapSearchHit(rawHit({ docType: 'company', cuis: [] }))
    expect(hit.href).toBe('')
    expect(hit.isExternal).toBe(false)
  })

  it('falls back to cuis when identifiers is absent', () => {
    const hit = mapSearchHit(rawHit({ cuis: ['2816464'], identifiers: null }))
    expect(hit.identifiers).toEqual(['2816464'])
  })

  it('normalizes null identifiers and roles to empty arrays', () => {
    const hit = mapSearchHit(rawHit({ cuis: null, identifiers: null }))
    expect(hit.identifiers).toEqual([])
    expect(hit.roles).toEqual([])
  })

  it('keeps a null isActive unknown: neither active nor inactive', () => {
    expect(mapSearchHit(rawHit({ isActive: null })).isActive).toBeNull()
    expect(mapSearchHit(rawHit({ isActive: false })).isActive).toBe(false)
    expect(mapSearchHit(rawHit({ isActive: true })).isActive).toBe(true)
  })

  it('carries the fresh company part apart from the generic fields', () => {
    const hit = mapSearchHit(answerOf(CURRENT_PAGE).hits[1] ?? rawHit({}))
    expect(hit.title).toBe(MIXED_ENTERPRISE_HIT.title)
    // The generic county is the institution's; the ONRC one is unknown.
    expect(hit.countyName).toBe('Ilfov')
    expect(hit.company).toEqual({
      registryState: 'NOT_IN_EDITION',
      name: 'REGIA AUTONOMA EXEMPLU RA',
      nameSource: 'core_organization',
      legalForm: null,
      countyCode: null,
      countyName: null,
      active: null,
      identifiers: [],
    })
    expect(hit.roles).toEqual(['organization', 'public_enterprise'])
    expect(hit.href).toBe('/public-enterprises/10020943')
  })

  it('coerces a numeric docId to a string', () => {
    const hit = mapSearchHit(rawHit({ docType: 'member', docId: 4205 }))
    expect(hit.docId).toBe('4205')
    expect(hit.href).toBe('/parlament/membri/4205')
  })

  it('coerces a string score to a number', () => {
    const hit = mapSearchHit(rawHit({ score: '12.5' }))
    expect(hit.score).toBe(12.5)
  })

  it('keeps a numeric score as a number and a null score as null', () => {
    expect(mapSearchHit(rawHit({ score: 3 })).score).toBe(3)
    expect(mapSearchHit(rawHit({ score: null })).score).toBeNull()
  })

  it('passes through descriptive fields verbatim', () => {
    const hit = mapSearchHit(
      rawHit({
        subtitle: 'sub',
        snippet: 'snip',
        countyName: 'Cluj',
        roles: ['organization', 'pnrr_entity'],
        docKey: 'company:2816464',
      }),
    )
    expect(hit.subtitle).toBe('sub')
    expect(hit.snippet).toBe('snip')
    expect(hit.countyName).toBe('Cluj')
    expect(hit.roles).toEqual(['organization', 'pnrr_entity'])
    expect(hit.docKey).toBe('company:2816464')
  })
})

describe('mapSearchResult', () => {
  it('maps the full envelope, the company metadata and the continuation included', () => {
    const result = mapSearchResult(answerOf(CURRENT_PAGE))
    expect(result.query).toBe('dedeman')
    expect(result.engine).toBe('meili')
    expect(result.estimatedTotalHits).toBe(312)
    expect(result.facets).toEqual([
      { field: 'doc_type', value: 'company', count: 300 },
      { field: 'doc_type', value: 'legal_act', count: 12 },
    ])
    expect(result.hits.map((hit) => hit.href)).toEqual([
      '/companies/2816464',
      '/public-enterprises/10020943',
      '/entities/4278337',
      '/companies/31234567',
    ])
    expect(result.generation).toEqual({
      generationId: 'entities_build_1759593600000_k3x9q2',
      registryScopeKey: 'onrc:published:41:3:7',
    })
    expect(result.companyScope).toBe('onrc:published:41:3:7')
    expect(result.companyContribution).toBe('CURRENT')
    expect(result.companyContributionReason).toBeNull()
    expect(result.continuation).toEqual({ candidatesReturned: 20, nextOffset: 20 })
  })

  it('keeps an unavailable answer unavailable, with its reason', () => {
    const result = mapSearchResult(answerOf(UNAVAILABLE_PAGE))
    expect(result.companyContribution).toBe('UNAVAILABLE')
    expect(result.companyContributionReason).toBe('control_missing')
    expect(result.generation).toBeNull()
    expect(result.hits.every((hit) => hit.company === null)).toBe(true)
    expect(result.hits[0]?.isActive).toBeNull()
  })

  it('preserves the engine AND the degraded flag', () => {
    // The pair matters: `engine` says who answered, `degraded` says whether the
    // answer is complete. Mapping one and dropping the other is exactly how
    // `source` and `rankBoost` died — fetched, never mapped, never noticed.
    const result = mapSearchResult(answerOf(DEGRADED_PAGE))
    expect(result.engine).toBe('none')
    expect(result.degraded).toBe(true)
    expect(result.companyContributionReason).toBe('engine_unavailable')
    expect(mapSearchResult(answerOf(CURRENT_PAGE)).degraded).toBe(false)
  })
})


it('maps an INS code into its internal detail page without using the Meili id', () => {
  const hit = mapSearchHit(rawHit({
    id: 'ins_dataset_POP107D_digest', docType: 'ins_dataset', docId: 'ins_dataset:POP107D',
    docKey: 'POP107D', identifiers: ['POP107D'], cuis: [], roles: [],
    subtitle: 'INS TEMPO · POP107D', url: '/ins/seturi/POP107D',
  }))
  expect(hit).toMatchObject({ href: '/ins/seturi/POP107D', isExternal: false,
    identifiers: ['POP107D'], roles: [], subtitle: 'INS TEMPO · POP107D' })
})
