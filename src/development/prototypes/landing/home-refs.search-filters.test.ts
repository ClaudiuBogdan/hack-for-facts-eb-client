import { describe, expect, it } from 'vitest'
import type { EntitySearchHit } from '@/schemas/entity-search'
import {
  absorbTriggers,
  describeScope,
  getSearchFilter,
  narrowHits,
  SEARCH_FILTERS,
  suggestFilters,
} from './home-refs.search-filters'

const hit = (overrides: Partial<EntitySearchHit>): EntitySearchHit => ({
  id: 'x', title: 'X', docType: 'company', href: '/companies/1', isExternal: false,
  identifiers: ['1'], countyName: null, subtitle: null, snippet: null, roles: ['company'],
  isActive: true, docId: null, docKey: null, url: null, score: null,
  ...overrides,
})

const ids = (term: string) => suggestFilters(term).map((filter) => filter.id)

describe('suggestFilters', () => {
  it('recognises the category words the reader actually types', () => {
    expect(ids('firma dedeman')).toEqual(['company'])
    expect(ids('primaria cluj')).toEqual(['uat'])
    expect(ids('ong cluj')).toEqual(['ngo'])
    expect(ids('legea 227/2015')).toEqual(['legal_act'])
    expect(ids('regia padurilor')).toEqual(['public_enterprise'])
    expect(ids('institutie cluj')).toEqual(['organization'])
    expect(ids('pnrr cluj')).toEqual(['pnrr'])
  })

  it('folds diacritics and case, so Primăria and PRIMARIA are the same word', () => {
    expect(ids('Primăria Cluj')).toEqual(['uat'])
    expect(ids('FIRMĂ')).toEqual(['company'])
    expect(ids('Legislație')).toEqual(['legal_act'])
  })

  it('matches whole words only, never substrings', () => {
    expect(ids('confirmare')).toEqual([])
    expect(ids('legeaua')).toEqual([])
    expect(ids('ongoing')).toEqual([])
  })

  it('lets the word under the caret match as a prefix once it is long enough', () => {
    expect(ids('firm')).toEqual(['company'])
    expect(ids('prim')).toEqual(['uat'])
    // Three characters would fire on the start of too many ordinary words.
    expect(ids('pri')).toEqual([])
    // A finished word in the middle of the query is not still being typed.
    expect(ids('firm dedeman')).toEqual([])
  })

  it('offers each filter once and in vocabulary order', () => {
    expect(ids('primaria comunei firma')).toEqual(['uat', 'company'])
    expect(ids('firma societate')).toEqual(['company'])
  })

  it('does not offer a filter that is already on', () => {
    expect(suggestFilters('firma', [getSearchFilter('company')])).toEqual([])
  })

  it('leaves name words alone, because lifting them out would lose the entity', () => {
    // A hospital is called a hospital; a ministry, a ministry. These are not
    // category words the reader added, they are the name.
    expect(ids('spital cluj')).toEqual([])
    expect(ids('ministerul finantelor')).toEqual([])
    expect(ids('scoala gimnaziala')).toEqual([])
  })

  it('offers nothing for an empty query', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })
})

describe('absorbTriggers', () => {
  it('lifts the matched words out and keeps the rest as typed', () => {
    expect(absorbTriggers('firma dedeman', getSearchFilter('company'))).toBe('dedeman')
    expect(absorbTriggers('Legea  227/2015', getSearchFilter('legal_act'))).toBe('227/2015')
    expect(absorbTriggers('dedeman firma', getSearchFilter('company'))).toBe('dedeman')
  })

  it('removes every word that earned the chip, not just the first', () => {
    expect(absorbTriggers('firma societatea dedeman', getSearchFilter('company'))).toBe('dedeman')
  })

  it('leaves the text alone for a filter whose word is doing the finding', () => {
    // The palette's synonym on `primaria` is what surfaces the municipality;
    // `cluj` alone returns companies. The chip narrows, the word stays.
    expect(absorbTriggers('Primăria Cluj-Napoca', getSearchFilter('uat'))).toBe('Primăria Cluj-Napoca')
    expect(absorbTriggers('ong cluj', getSearchFilter('ngo'))).toBe('ong cluj')
    expect(absorbTriggers('regia padurilor', getSearchFilter('public_enterprise'))).toBe('regia padurilor')
    expect(absorbTriggers('institutia prefectului', getSearchFilter('organization'))).toBe('institutia prefectului')
  })

  it('absorbs only where the word does no work in the query', () => {
    const absorbing = SEARCH_FILTERS.filter((filter) => filter.absorb).map((filter) => filter.id)
    expect(absorbing).toEqual(['company', 'legal_act', 'pnrr'])
  })

  it('takes a prefix under the caret with it', () => {
    expect(absorbTriggers('dedeman firm', getSearchFilter('company'))).toBe('dedeman')
  })

  it('leaves an empty string when the chip was the whole query', () => {
    expect(absorbTriggers('firma', getSearchFilter('company'))).toBe('')
  })
})

describe('narrowHits', () => {
  const company = hit({ id: 'c', docType: 'company', roles: ['company'] })
  const municipality = hit({ id: 'm', docType: 'organization', subtitle: 'uat, uat_municipality', roles: ['organization', 'pnrr_entity'] })
  const county = hit({ id: 'j', docType: 'organization', subtitle: 'uat, uat_county', roles: ['organization'] })
  const court = hit({ id: 't', docType: 'organization', subtitle: 'public_entity, admin_court', roles: ['organization'] })
  const ngo = hit({ id: 'n', docType: 'ngo', roles: ['ngo'] })
  const all = [company, municipality, county, court, ngo]

  it('keeps everything with no chips on', () => {
    expect(narrowHits(all, [])).toBe(all)
  })

  it('narrows by the kind a chip names', () => {
    expect(narrowHits(all, [getSearchFilter('company')])).toEqual([company])
    expect(narrowHits(all, [getSearchFilter('organization')])).toEqual([municipality, county, court])
    expect(narrowHits(all, [getSearchFilter('ngo')])).toEqual([ngo])
  })

  it('reads the UAT flag off the palette subtitle, and only for organisations', () => {
    expect(narrowHits(all, [getSearchFilter('uat')])).toEqual([municipality, county])
    // A company whose subtitle happened to start with `uat` is still a company.
    expect(narrowHits([hit({ docType: 'company', subtitle: 'uat' })], [getSearchFilter('uat')])).toEqual([])
    expect(narrowHits([hit({ docType: 'organization', subtitle: null })], [getSearchFilter('uat')])).toEqual([])
  })

  it('reads PNRR off the roles, whatever the kind', () => {
    expect(narrowHits(all, [getSearchFilter('pnrr')])).toEqual([municipality])
  })

  it('applies every chip at once', () => {
    expect(narrowHits(all, [getSearchFilter('uat'), getSearchFilter('pnrr')])).toEqual([municipality])
    expect(narrowHits(all, [getSearchFilter('company'), getSearchFilter('pnrr')])).toEqual([])
  })
})

describe('describeScope', () => {
  it('reads a scope out in Romanian', () => {
    expect(describeScope([])).toBe('')
    expect(describeScope([getSearchFilter('company')])).toBe('Firme')
    expect(describeScope([getSearchFilter('company'), getSearchFilter('pnrr')])).toBe('Firme și PNRR')
    expect(describeScope(SEARCH_FILTERS.slice(0, 3))).toBe('Primării, Instituții și Firme')
  })
})

describe('the vocabulary', () => {
  it('keeps every trigger folded and lower-case, so it can match a folded token', () => {
    for (const filter of SEARCH_FILTERS) {
      for (const trigger of filter.triggers) {
        expect(trigger).toBe(trigger.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase())
      }
    }
  })

  it('gives no word to two filters', () => {
    const seen = new Map<string, string>()
    for (const filter of SEARCH_FILTERS) {
      for (const trigger of filter.triggers) {
        expect(seen.get(trigger), `${trigger} is in ${seen.get(trigger)} and ${filter.id}`).toBeUndefined()
        seen.set(trigger, filter.id)
      }
    }
  })
})
