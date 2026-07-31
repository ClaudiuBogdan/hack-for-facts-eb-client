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
    source: null,
    docId: null,
    docKey: null,
    subtitle: null,
    countyName: null,
    url: null,
    rankBoost: null,
    cuis: null,
    year: null,
    ...overrides,
  }
}

describe('mapSearchHit', () => {
  it('computes an internal href for a company hit', () => {
    const hit = mapSearchHit(rawHit({ docType: 'company', cuis: ['2816464'] }))
    expect(hit.href).toBe('/companies/2816464')
    expect(hit.isExternal).toBe(false)
  })

  it('computes an external href for a legal_act hit', () => {
    const hit = mapSearchHit(
      rawHit({
        docType: 'legal_act',
        docId: 'lege-227-2015',
        url: 'https://gov.test/lege',
      }),
    )
    expect(hit.href).toBe('https://gov.test/lege')
    expect(hit.isExternal).toBe(true)
  })

  it('falls back to empty href + non-external when no target is usable', () => {
    const hit = mapSearchHit(rawHit({ docType: 'company', cuis: [] }))
    expect(hit.href).toBe('')
    expect(hit.isExternal).toBe(false)
  })

  it('normalizes null cuis to an empty array', () => {
    const hit = mapSearchHit(rawHit({ cuis: null }))
    expect(hit.cuis).toEqual([])
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
        year: 2024,
        docKey: 'company:2816464',
      }),
    )
    expect(hit.subtitle).toBe('sub')
    expect(hit.snippet).toBe('snip')
    expect(hit.countyName).toBe('Cluj')
    expect(hit.year).toBe(2024)
    expect(hit.docKey).toBe('company:2816464')
  })
})

describe('mapSearchResult', () => {
  it('maps the full result envelope including facets and hits', () => {
    const response: SearchEntitiesResponse = {
      searchEntities: {
        query: 'acme',
        engine: 'meili',
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

  it('preserves the postgres fallback engine', () => {
    const response: SearchEntitiesResponse = {
      searchEntities: {
        query: 'x',
        engine: 'postgres',
        estimatedTotalHits: 0,
        facets: [],
        hits: [],
      },
    }
    expect(mapSearchResult(response).engine).toBe('postgres')
  })
})
