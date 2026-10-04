import { describe, expect, it } from 'vitest'
import { SEARCH_ENTITIES_QUERY, searchEntitiesResponseSchema } from './entity-search-queries'
import {
  COMPANY_HIT,
  CURRENT_EMPTY_FIRST_PAGE_WITH_MORE,
  CURRENT_EMPTY_LAST_PAGE,
  CURRENT_EMPTY_PAGE_WITH_MORE,
  CURRENT_NO_MATCH,
  CURRENT_PAGE,
  DEGRADED_PAGE,
  MIXED_ENTERPRISE_HIT,
  MOVED_GENERATION_PAGE,
  MOVED_SCOPE_PAGE,
  PARTIAL_PAGE,
  UNAVAILABLE_PAGE,
  WITHHELD_EMPTY_PAGE_WITH_MORE,
  WITHHELD_NEXT_PAGE,
} from './entity-search.fixtures'

const parse = (searchEntities: unknown) =>
  searchEntitiesResponseSchema.safeParse({ searchEntities })

const withoutKey = (record: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key))

describe('the searchEntities document', () => {
  it('selects every field of the shared-search contract', () => {
    for (const field of [
      'company {',
      'registryState',
      'nameSource',
      'generation {',
      'generationId',
      'registryScopeKey',
      'companyScope',
      'companyContribution',
      'companyContributionReason',
      'continuation {',
      'candidatesReturned',
      'nextOffset',
    ]) {
      expect(SEARCH_ENTITIES_QUERY).toContain(field)
    }
    // Deprecated (always null / empty on the server) and never read here.
    expect(SEARCH_ENTITIES_QUERY).not.toMatch(/\byear\b|\borganizations\b|\brankBoost\b/)
  })
})

describe('the strict searchEntities schema', () => {
  it.each([
    ['a current page', CURRENT_PAGE],
    ['a current page that shows nothing and has a next page', CURRENT_EMPTY_PAGE_WITH_MORE],
    ['a current initial page that shows nothing and has a next page', CURRENT_EMPTY_FIRST_PAGE_WITH_MORE],
    ['a current last page that shows nothing', CURRENT_EMPTY_LAST_PAGE],
    ['a current no match', CURRENT_NO_MATCH],
    ['a partial page', PARTIAL_PAGE],
    ['an unavailable page', UNAVAILABLE_PAGE],
    ['a withheld empty page with a next page', WITHHELD_EMPTY_PAGE_WITH_MORE],
    ['its next page', WITHHELD_NEXT_PAGE],
    ['a page of a new generation', MOVED_GENERATION_PAGE],
    ['a page of a new company scope', MOVED_SCOPE_PAGE],
    ['a degraded answer', DEGRADED_PAGE],
  ])('reads %s', (_name, page) => {
    expect(parse(page).success).toBe(true)
  })

  it('reads a null root as null, for the transport to withhold', () => {
    const parsed = parse(null)
    expect(parsed.success && parsed.data.searchEntities).toBeNull()
  })

  it.each([
    ['CURRENT with a reason', { ...CURRENT_PAGE, companyContributionReason: 'control_missing' }],
    ['UNAVAILABLE without a reason', { ...UNAVAILABLE_PAGE, companyContributionReason: null }],
    ['PARTIAL with another reason', { ...PARTIAL_PAGE, companyContributionReason: 'control_missing' }],
    ['generation_scope_stale outside PARTIAL', { ...UNAVAILABLE_PAGE, companyContributionReason: 'generation_scope_stale' }],
    ['CURRENT on a generation built for another scope', { ...CURRENT_PAGE, generation: PARTIAL_PAGE.generation }],
    ['CURRENT without a witnessed generation', { ...CURRENT_PAGE, generation: null }],
    ['CURRENT without a company scope', { ...CURRENT_PAGE, companyScope: null }],
    ['PARTIAL on a generation built for its own scope', { ...PARTIAL_PAGE, generation: CURRENT_PAGE.generation }],
    ['degraded without engine_unavailable', { ...CURRENT_PAGE, degraded: true }],
    ['engine_unavailable without degraded', { ...DEGRADED_PAGE, degraded: false }],
    ['a company document while UNAVAILABLE', { ...UNAVAILABLE_PAGE, hits: [COMPANY_HIT] }],
    ['a company part while UNAVAILABLE', { ...UNAVAILABLE_PAGE, hits: [MIXED_ENTERPRISE_HIT] }],
    ['a company document without its company part', { ...CURRENT_PAGE, hits: [{ ...COMPANY_HIT, company: null }] }],
    ['an unknown reason code', { ...UNAVAILABLE_PAGE, companyContributionReason: 'control_new' }],
    ['a lowercase contribution', { ...CURRENT_PAGE, companyContribution: 'current' }],
    ['a lowercase registry state', { ...CURRENT_PAGE, hits: [{ ...COMPANY_HIT, company: { ...COMPANY_HIT.company, registryState: 'in_edition' } }] }],
    ['an unknown name source', { ...CURRENT_PAGE, hits: [{ ...COMPANY_HIT, company: { ...COMPANY_HIT.company, nameSource: 'index' } }] }],
    ['a blank company name', { ...CURRENT_PAGE, hits: [{ ...COMPANY_HIT, company: { ...COMPANY_HIT.company, name: '  ' } }] }],
    ['more hits than candidates', { ...CURRENT_PAGE, continuation: { candidatesReturned: 3, nextOffset: null } }],
    ['a next page after an empty candidate page', { ...CURRENT_NO_MATCH, continuation: { candidatesReturned: 0, nextOffset: 20 } }],
    ['a next offset past the bound', { ...CURRENT_PAGE, continuation: { candidatesReturned: 20, nextOffset: 1020 } }],
    ['a next offset of zero', { ...CURRENT_PAGE, continuation: { candidatesReturned: 20, nextOffset: 0 } }],
    ['a fractional estimate', { ...CURRENT_PAGE, estimatedTotalHits: 1.5 }],
    ['no continuation', withoutKey(CURRENT_PAGE, 'continuation')],
    ['no contribution', withoutKey(CURRENT_PAGE, 'companyContribution')],
    ['no degraded flag', withoutKey(CURRENT_PAGE, 'degraded')],
    ['a hit without its company key', { ...CURRENT_PAGE, hits: [withoutKey(MIXED_ENTERPRISE_HIT, 'company')] }],
    ['an unselected field', { ...CURRENT_PAGE, hits: [{ ...COMPANY_HIT, rankBoost: 0.1 }] }],
  ])('refuses %s as unreadable', (_name, page) => {
    expect(parse(page).success).toBe(false)
  })
})
