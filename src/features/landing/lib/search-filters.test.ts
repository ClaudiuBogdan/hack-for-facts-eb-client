import { describe, expect, it } from 'vitest'
import {
  absorbTriggers,
  describeScope,
  getSearchFilter,
  searchFilterInput,
  SEARCH_FILTERS,
  suggestFilters,
  tagSearchFilters,
} from '@/features/landing/lib/search-filters'

const ids = (term: string) => suggestFilters(term).map(filter => filter.id)

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
    expect(absorbTriggers('Primăria Cluj-Napoca', getSearchFilter('uat'))).toBe('Cluj-Napoca')
    expect(absorbTriggers('ong cluj', getSearchFilter('ngo'))).toBe('ong cluj')
    expect(absorbTriggers('regia padurilor', getSearchFilter('public_enterprise'))).toBe('regia padurilor')
    expect(absorbTriggers('institutia prefectului', getSearchFilter('organization'))).toBe('institutia prefectului')
  })

  it('absorbs only where the word does no work in the query', () => {
    const absorbing = SEARCH_FILTERS.filter((filter) => filter.absorb).map((filter) => filter.id)
    expect(absorbing).toEqual(['uat', 'company', 'legal_act', 'pnrr'])
  })

  it('takes a prefix under the caret with it', () => {
    expect(absorbTriggers('dedeman firm', getSearchFilter('company'))).toBe('dedeman')
  })

  it('leaves an empty string when the chip was the whole query', () => {
    expect(absorbTriggers('firma', getSearchFilter('company'))).toBe('')
  })
})

describe('server filter scope', () => {
  it('sends the UAT boolean rather than interpreting subtitles', () => {
    expect(searchFilterInput([getSearchFilter('uat')])).toEqual({ docTypes: ['organization'], isUat: true })
  })
  it('intersects UAT scope with the PNRR role', () => {
    expect(searchFilterInput([getSearchFilter('uat'), getSearchFilter('pnrr')])).toEqual({
      docTypes: ['organization'], isUat: true, roles: ['pnrr_entity'],
    })
  })
  it('uses the role for public enterprises, including institutions with that role', () => {
    expect(searchFilterInput([getSearchFilter('public_enterprise')])).toEqual({ roles: ['public_enterprise'] })
  })
})

describe('describeScope', () => {
  it('reads a scope out from resolved labels and the conjunction it is given', () => {
    expect(describeScope([], 'și')).toBe('')
    expect(describeScope(['Firme'], 'și')).toBe('Firme')
    expect(describeScope(['Firme', 'PNRR'], 'și')).toBe('Firme și PNRR')
    expect(describeScope(['Primării', 'Instituții', 'Firme'], 'și')).toBe('Primării, Instituții și Firme')
    expect(describeScope(['Companies', 'PNRR'], 'and')).toBe('Companies and PNRR')
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


describe('keyword-triggered entity tag chips', () => {
  const tags = tagSearchFilters('ro')
  it('offers the known hospital tag and consumes only its keyword', () => {
    const tag = suggestFilters('spital sibiu', [], tags).find(filter => filter.entityTag === 'kind::hospital')!
    expect(absorbTriggers('spital sibiu', tag)).toBe('sibiu')
    expect(searchFilterInput([tag])).toEqual({ entityTags: ['kind::hospital'] })
    expect(suggestFilters('spital', [tag], tags).some(filter => filter.id === tag.id)).toBe(false)
  })
  it('offers an exclusion chip for a negative keyword', () => {
    const tag = suggestFilters('-spital sibiu', [], tags).find(filter => filter.entityTag === 'kind::hospital')!
    expect(tag.exclude).toBe(true)
    expect(absorbTriggers('-spital sibiu', tag)).toBe('sibiu')
    expect(searchFilterInput([tag])).toEqual({ excludeEntityTags: ['kind::hospital'] })
  })
  it('supports complete vocabulary labels and keeps sector queries usable', () => {
    const tag = tags.find(filter => filter.entityTag === 'kind::school::highschool' && !filter.exclude)!
    expect(suggestFilters('liceul sibiu', [], tags)).toContainEqual(tag)
    expect(absorbTriggers('sector 1', getSearchFilter('uat'))).toBe('sector 1')
    expect(absorbTriggers('Sectorul 6', getSearchFilter('uat'))).toBe('Sectorul 6')
  })
  it('combines chips into namespace filters rather than filtering returned hits', () => {
    const school = tags.find(filter => filter.entityTag === 'kind::school' && !filter.exclude)!
    const hospital = tags.find(filter => filter.entityTag === 'kind::hospital' && !filter.exclude)!
    expect(searchFilterInput([school, hospital])).toEqual({ entityTags: ['kind::school', 'kind::hospital'] })
  })
})
