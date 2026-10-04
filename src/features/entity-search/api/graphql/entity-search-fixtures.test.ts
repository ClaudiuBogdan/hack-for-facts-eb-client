import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { ENTITY_SEARCH_DOC_TYPES } from '@/schemas/entity-search'
import { searchEntitiesResponseSchema } from './entity-search-queries'

/**
 * Every Playwright fixture that answers the shared `searchEntities` root. They
 * were re-recorded from the server SDL and the shared-search contract r4, so
 * the strict client schema must read each one exactly as the page will.
 */
const ANSWER_FIXTURES = [
  'experimental-search-flow/results',
  'experimental-search-flow/zero',
  'experimental-search-flow/postgres',
  'experimental-search-flow/withheld-first',
  'experimental-search-flow/withheld-next',
  'shared/search-cluj',
  'companies-hub-flow/search-entities-dante',
  'statistics-hub-flow/search-entities-popul',
] as const

const readFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), `tests/fixtures/${name}.json`), 'utf8'))

const answerOf = (name: string) => {
  const fixture = z.object({ data: z.unknown() }).parse(readFixture(name))
  return searchEntitiesResponseSchema.parse(fixture.data).searchEntities
}

describe('the searchEntities integration fixtures', () => {
  it.each(ANSWER_FIXTURES)('reads under the strict contract schema: %s', (name) => {
    const answer = answerOf(name)
    expect(answer).not.toBeNull()

    for (const hit of answer?.hits ?? []) {
      expect(ENTITY_SEARCH_DOC_TYPES).toContain(hit.docType)
      for (const role of hit.roles ?? []) {
        expect(ENTITY_SEARCH_DOC_TYPES).toContain(role)
      }
    }
    for (const facet of (answer?.facets ?? []).filter((entry) => entry.field === 'doc_type')) {
      expect(ENTITY_SEARCH_DOC_TYPES).toContain(facet.value)
    }
  })

  it('keeps the zero a current initial page with no next page, and the degraded answer no zero', () => {
    expect(answerOf('experimental-search-flow/zero')).toMatchObject({
      hits: [],
      companyContribution: 'CURRENT',
      continuation: { nextOffset: null },
    })
    expect(answerOf('experimental-search-flow/postgres')).toMatchObject({
      degraded: true,
      hits: [],
      companyContribution: 'UNAVAILABLE',
      companyContributionReason: 'engine_unavailable',
    })
  })

  it('gives every current fixture a generation built for its own company scope', () => {
    for (const name of ANSWER_FIXTURES) {
      const answer = answerOf(name)
      if (answer?.companyContribution !== 'CURRENT') continue
      // The control contract's shapes: a build UID and a published scope key.
      expect(answer.generation?.generationId).toMatch(/^entities_build_\d+_[a-z0-9]{6}$/)
      expect(answer.companyScope).toMatch(/^onrc:published:[1-9]\d*:(0|[1-9]\d*):(0|[1-9]\d*)$/)
      expect(answer.generation?.registryScopeKey).toBe(answer.companyScope)
    }
  })

  it('keeps the refusal a null root with its one SERVICE_UNAVAILABLE error', () => {
    const refused = z
      .object({
        data: z.object({ searchEntities: z.null() }),
        errors: z.tuple([
          z.object({
            path: z.tuple([z.literal('searchEntities')]),
            extensions: z.object({ code: z.literal('SERVICE_UNAVAILABLE') }),
          }),
        ]),
      })
      .safeParse(readFixture('experimental-search-flow/refused'))
    expect(refused.success).toBe(true)
  })
})
