import { describe, it, expect } from 'vitest'
import { mapSearchHit, mapSearchResult } from './entity-search-mappers'
import type { RawSearchHit, SearchEntitiesResponse } from './entity-search-queries'

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
    ...overrides,
  }
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

  it('defaults a null isActive to true (absence is not inactivity)', () => {
    expect(mapSearchHit(rawHit({ isActive: null })).isActive).toBe(true)
    expect(mapSearchHit(rawHit({ isActive: false })).isActive).toBe(false)
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
  it('maps the full result envelope including facets and hits', () => {
    const response: SearchEntitiesResponse = {
      searchEntities: {
        query: 'acme',
        engine: 'meili',
        degraded: false,
        estimatedTotalHits: 2,
        facets: [{ field: 'doc_type', value: 'company', count: 2 }],
        hits: [
          rawHit({ id: 'h1', docType: 'company', cuis: ['111'] }),
          rawHit({
            id: 'h2',
            docType: 'legal_act',
            url: 'https://gov.test/x',
          }),
        ],
      },
    }
    const result = mapSearchResult(response)
    expect(result.query).toBe('acme')
    expect(result.engine).toBe('meili')
    expect(result.estimatedTotalHits).toBe(2)
    expect(result.facets).toEqual([
      { field: 'doc_type', value: 'company', count: 2 },
    ])
    expect(result.hits).toHaveLength(2)
    expect(result.hits[0]?.href).toBe('/companies/111')
    expect(result.hits[1]?.isExternal).toBe(true)
  })

  it('preserves the postgres engine AND the degraded flag', () => {
    // The pair matters: `engine` says who answered, `degraded` says whether the
    // answer is complete. Mapping one and dropping the other is exactly how
    // `source` and `rankBoost` died — fetched, never mapped, never noticed.
    const response: SearchEntitiesResponse = {
      searchEntities: {
        query: 'x',
        engine: 'postgres',
        degraded: true,
        estimatedTotalHits: 0,
        facets: [],
        hits: [],
      },
    }
    const result = mapSearchResult(response)
    expect(result.engine).toBe('postgres')
    expect(result.degraded).toBe(true)
  })

  it('carries degraded=false through unchanged', () => {
    const response: SearchEntitiesResponse = {
      searchEntities: {
        query: 'x',
        engine: 'meili',
        degraded: false,
        estimatedTotalHits: 0,
        facets: [],
        hits: [],
      },
    }
    expect(mapSearchResult(response).degraded).toBe(false)
  })
})
