import { describe, expect, it } from 'vitest'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'
import { releaseFixture } from '../api/company-analytics.fixture'
import { sentenceOf, type SentenceSource } from './company-analytics-sentence'
import { DEFAULT_STATE } from './company-analytics-url'

/**
 * The selection in words, as the headline, the pinned bar and the title say
 * it: places as places, any-of as „sau", the unknown groups said, a locality's
 * county joined to it only once the localities' files show it there.
 */

const sentence = (scope: CompanyAnalysisScope, extra: Partial<SentenceSource> = {}) =>
  sentenceOf({
    state: { ...DEFAULT_STATE, scope },
    names: { uats: new Map([['143450', 'Sibiu']]), statuses: new Map([['1048', 'funcțiune']]) },
    locale: 'ro',
    question: null,
    live: releaseFixture(),
    uats: { localities: [{ value: '143450', county: 'SB' }] },
    ...extra,
  })

describe('the selection in a sentence', () => {
  it('says the bare selection and its year', () => {
    expect(sentence({})).toBe('Firmele, în 2024')
  })

  it('names counties as counties, București as itself, first', () => {
    expect(sentence({ county: { in: ['CJ'] } })).toBe('Firmele din județul Cluj, în 2024')
    expect(sentence({ county: { in: ['B'] } })).toBe('Firmele din București, în 2024')
    expect(sentence({ county: { in: ['B', 'CJ', 'TM'] } })).toBe('Firmele din București și județele Cluj, Timiș, în 2024')
  })

  it('joins a locality and its county only when the locality is known to be in it', () => {
    expect(sentence({ county: { in: ['SB'] }, uat: { in: ['143450'] } })).toBe('Firmele din Sibiu, județul Sibiu, în 2024')
    expect(sentence({ county: { in: ['CJ'] }, uat: { in: ['143450'] } })).toBe('Firmele din Sibiu, din județul Cluj, în 2024')
    // The localities' files not read yet: two conditions, not a claim.
    expect(sentence({ county: { in: ['SB'] }, uat: { in: ['143450'] } }, { uats: { localities: null } })).toBe('Firmele din Sibiu, din județul Sibiu, în 2024')
  })

  it('says the unknown groups asked for — they are in the figures', () => {
    expect(sentence({ county: { in: ['CJ'], includeUnknown: true } })).toBe('Firmele din județul Cluj sau fără un județ comun, în 2024')
    expect(sentence({ county: { includeUnknown: true } })).toBe('Firmele, fără un județ comun, în 2024')
    expect(sentence({ observedStatus: { in: ['1048'], includeUnknown: true } })).toBe('Firmele, cu starea „funcțiune” sau fără stare comună, în 2024')
  })

  it('reads any-of as „sau", keeps a CUI’s capitals and a size range whole', () => {
    expect(sentence({ legalForms: ['SA', 'SRL'] })).toBe('Firmele SA sau SRL, în 2024')
    expect(sentence({ cuis: ['36804600'] })).toBe('Firmele, cu CUI 36804600, în 2024')
    expect(sentence({ employeeSizeBands: ['FROM_1_TO_9'] })).toBe('Firmele, cu 1\u2060–\u20609 salariați, în 2024')
  })
})
