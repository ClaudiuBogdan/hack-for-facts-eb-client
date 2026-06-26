import { describe, it, expect } from 'vitest'
import {
  caseDetailSearchSchema,
  caseSearchSchema,
  courtAnalyticsSearchSchema,
  justiceNamedPartySchema,
  justicePartyRoleCountSchema,
  parseCaseDetailSearch,
  parseCaseSearch,
  parseCourtAnalyticsSearch,
} from './justice'

describe('parseCaseSearch', () => {
  it('drops unknown keys (closed allowlist strips, never throws)', () => {
    const parsed = parseCaseSearch({
      court: 'TB-BUCURESTI',
      tier: 'tribunal',
      q: 'Ion Popescu', // free-text / generic search — not in the allowlist
      partyName: 'Ion Popescu', // person-shaped — must be stripped
      randomParam: 'whatever',
      caseNumber: '1234/3/2024',
    })

    // Allowed keys are preserved (absent allowlisted keys stay absent; the UI
    // treats undefined as the default — matching parsePrivateCompanySearch).
    expect(parsed.court).toBe('TB-BUCURESTI')
    expect(parsed.tier).toBe('tribunal')
    expect(parsed.caseNumber).toBe('1234/3/2024')
    // Closed allowlist defaults for sort/page/pageSize apply to INVALID present
    // values, not absent; here they were absent so they are absent too — verify
    // the allowlist shape only includes the declared keys.
    expect(Object.keys(parsed).sort()).toEqual(
      ['caseNumber', 'court', 'tier'].sort(),
    )
    // Unknown / person / free-text keys are stripped, never present.
    expect('q' in parsed).toBe(false)
    expect('partyName' in parsed).toBe(false)
    expect('randomParam' in parsed).toBe(false)
  })

  it('defaults invalid enum/tier values to undefined instead of throwing', () => {
    const parsed = parseCaseSearch({
      tier: 'supreme_court', // not a valid court level
      partyKind: 'person', // persons are not publishable / not selectable
      hasAppeal: 'maybe', // not a valid enum
      sort: 'relevance', // not a valid sort
    })

    expect(parsed.tier).toBeUndefined()
    expect(parsed.partyKind).toBeUndefined()
    expect(parsed.hasAppeal).toBeUndefined()
    // sort has a real default via .catch('recent')
    expect(parsed.sort).toBe('recent')
  })

  it('coerces page/pageSize/year and defaults invalid values safely', () => {
    const parsed = parseCaseSearch({
      page: '3',
      pageSize: '50',
      year: '2024',
    })

    expect(parsed.page).toBe(3)
    expect(parsed.pageSize).toBe(50)
    expect(parsed.year).toBe(2024)

    const defaulted = parseCaseSearch({
      page: 'not-a-number',
      pageSize: -5,
      year: NaN,
    })
    expect(defaulted.page).toBe(1)
    expect(defaulted.pageSize).toBe(25)
    expect(defaulted.year).toBeUndefined()
  })

  it('keeps valid publishable partyKind and hasAppeal values', () => {
    const parsed = parseCaseSearch({
      partyKind: 'public_entity',
      hasAppeal: 'true',
      sort: 'oldest',
    })

    expect(parsed.partyKind).toBe('public_entity')
    expect(parsed.hasAppeal).toBe('true')
    expect(parsed.sort).toBe('oldest')
  })

  it('partyKind never accepts person or unknown', () => {
    expect(parseCaseSearch({ partyKind: 'person' }).partyKind).toBeUndefined()
    expect(parseCaseSearch({ partyKind: 'unknown' }).partyKind).toBeUndefined()
  })

  it('returns an empty object for an empty search (no params = default view)', () => {
    // Absent optional fields stay absent; the UI treats undefined as the
    // default, so a no-params URL renders the default view. This matches the
    // established parsePrivateCompanySearch pattern.
    expect(parseCaseSearch({})).toEqual({})
  })

  it('never produces a q, partyName, or person-shaped field from any input', () => {
    const parsed = parseCaseSearch({
      q: 'some free text',
      partyName: 'Ion Popescu',
      personName: 'Maria',
    })
    expect('q' in parsed).toBe(false)
    expect('partyName' in parsed).toBe(false)
    expect('personName' in parsed).toBe(false)
  })
})

describe('parseCourtAnalyticsSearch', () => {
  it('keeps valid tab/year/category; absent fields stay absent', () => {
    const parsed = parseCourtAnalyticsSearch({
      tab: 'volum',
      year: 2024,
      category: 'civil',
    })
    expect(parsed).toEqual({ tab: 'volum', year: 2024, category: 'civil' })
  })

  it('defaults invalid tab to prezentare (catch applies to invalid present value)', () => {
    expect(parseCourtAnalyticsSearch({ tab: 'invalid_tab' }).tab).toBe('prezentare')
  })

  it('drops unknown keys and defaults invalid values', () => {
    const parsed = parseCourtAnalyticsSearch({
      tab: 'invalid_tab',
      year: 'bad',
      q: 'secret',
      partyKey: 'should-be-stripped',
    })
    expect(parsed.tab).toBe('prezentare')
    expect(parsed.year).toBeUndefined()
    expect('q' in parsed).toBe(false)
    expect('partyKey' in parsed).toBe(false)
  })
})

describe('parseCaseDetailSearch', () => {
  it('keeps valid tab/from', () => {
    expect(parseCaseDetailSearch({ tab: 'parti', from: 'cautare' })).toEqual({
      tab: 'parti',
      from: 'cautare',
    })
  })

  it('defaults invalid tab to cronologie (catch applies to invalid present value)', () => {
    expect(parseCaseDetailSearch({ tab: 'bogus' }).tab).toBe('cronologie')
  })

  it('drops unknown keys (sensitive caseNumber/partyKey stripped)', () => {
    const parsed = parseCaseDetailSearch({
      tab: 'acte',
      caseNumber: '1234/3/2024', // sensitive — must be stripped
      partyKey: 'should-be-stripped',
    })
    expect(parsed.tab).toBe('acte')
    expect('caseNumber' in parsed).toBe(false)
    expect('partyKey' in parsed).toBe(false)
  })
})

describe('strict structural privacy (named parties)', () => {
  it('justiceNamedPartySchema only accepts company | public_entity', () => {
    expect(
      justiceNamedPartySchema.safeParse({
        partyIndex: 1,
        displayName: 'S.C. EXEMPLU SA',
        legalForm: 'SA',
        partyKind: 'company',
        roleNormalized: 'Reclamant',
        nameKey: 'sc-exemplu-sa',
      }).success,
    ).toBe(true)

    expect(
      justiceNamedPartySchema.safeParse({
        partyIndex: 2,
        displayName: 'Ion Popescu',
        legalForm: null,
        partyKind: 'person',
        roleNormalized: 'Pârât',
        nameKey: 'ion-popescu',
      }).success,
    ).toBe(false)

    expect(
      justiceNamedPartySchema.safeParse({
        partyIndex: 3,
        displayName: 'Unknown party',
        legalForm: null,
        partyKind: 'unknown',
        roleNormalized: 'Pârât',
        nameKey: 'unknown-party',
      }).success,
    ).toBe(false)
  })

  it('person/unknown parties only appear as aggregate role-counts (no identity)', () => {
    const roleCount = { role: 'Pârât', count: 3 }
    const parsed = justicePartyRoleCountSchema.parse(roleCount)
    expect(parsed).toEqual(roleCount)
    // The role-count shape carries no name/nameKey — identity is impossible.
    expect('nameKey' in parsed).toBe(false)
    expect('displayName' in parsed).toBe(false)
  })

  it('caseSearchSchema strips unknown keys (does not throw)', () => {
    const parsed = caseSearchSchema.parse({ secret: 1, court: 'TB-BUCURESTI' })
    expect('secret' in parsed).toBe(false)
    expect(parsed.court).toBe('TB-BUCURESTI')
  })

  it('courtAnalyticsSearchSchema and caseDetailSearchSchema strip unknown keys', () => {
    expect('secret' in courtAnalyticsSearchSchema.parse({ secret: 1 })).toBe(false)
    expect('secret' in caseDetailSearchSchema.parse({ secret: 1 })).toBe(false)
  })
})
