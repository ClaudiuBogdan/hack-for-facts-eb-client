import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { ENTITY_SEARCH_DOC_TYPES } from '@/schemas/entity-search'
import { searchEntitiesResponseSchema } from './entity-search-queries'

const fixtureEnvelopeSchema = z.object({
  data: searchEntitiesResponseSchema,
})

const SUCCESS_FIXTURES = ['results', 'zero', 'postgres'] as const

describe('experimental search integration fixtures', () => {
  it.each(SUCCESS_FIXTURES)('matches the current SearchEntities contract: %s', (name) => {
    const fixturePath = resolve(
      process.cwd(),
      `tests/fixtures/experimental-search-flow/${name}.json`,
    )
    const fixture: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'))
    const result = fixtureEnvelopeSchema.parse(fixture).data.searchEntities

    for (const hit of result.hits) {
      expect(ENTITY_SEARCH_DOC_TYPES).toContain(hit.docType)
      for (const role of hit.roles ?? []) {
        expect(ENTITY_SEARCH_DOC_TYPES).toContain(role)
      }
    }
    for (const facet of result.facets.filter((entry) => entry.field === 'doc_type')) {
      expect(ENTITY_SEARCH_DOC_TYPES).toContain(facet.value)
    }
  })
})
