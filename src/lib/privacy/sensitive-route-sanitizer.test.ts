import { describe, it, expect } from 'vitest'
import { COUNTY_CODES, GROUPINGS, LEVEL_KEYS, MATTER_KEYS } from '@/features/justice/lib/analysis-model'
import { STAGE_KEYS } from '@/features/justice/lib/judicial-model'
import {
  SAFE_JUSTICE_QUERY_PARAMS,
  SAFE_JUSTICE_VALUES,
  STRIPPED_JUSTICE_QUERY_PARAMS,
  isJusticePath,
  sanitizeJusticeEventProperties,
  sanitizeJusticePathname,
  sanitizeJusticeQueryString,
  sanitizeJusticeTelemetryString,
  sanitizeJusticeTelemetryValue,
  sanitizeJusticeUrl,
  sanitizeJusticeUrlFragment,
} from './sensitive-route-sanitizer'

describe('the /justice pages', () => {
  it('are justice paths, the front door, a court and a case alike', () => {
    for (const path of ['/justice', '/justice/', '/justice/courts/TribunalulCLUJ', '/justice/cases/TribunalulCLUJ/1234/117/2024']) expect(isJusticePath(path)).toBe(true)
    expect(isJusticePath('/justice-league')).toBe(false)
  })

  it('report a case page by its court, never its number', () => {
    expect(sanitizeJusticePathname('/justice/cases/TribunalulBUCURESTI/33517/3/2021/a85')).toBe('/justice/cases/TribunalulBUCURESTI/:caseNumber')
    expect(sanitizeJusticePathname('/justice/courts/TribunalulCLUJ')).toBe('/justice/courts/TribunalulCLUJ')
    expect(sanitizeJusticeUrl('https://transparenta.eu/justice/cases/TribunalulCLUJ/1234/117/2024*?an=2025&q=x')).toBe(
      'https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber?an=2025',
    )
  })

  it('keep the front door’s and the court page’s own choices and drop anything else', () => {
    expect(sanitizeJusticeQueryString('/justice', 'instante=tribunal&materii=curte_de_apel&nivel=curte_de_apel&q=Popescu')).toBe('instante=tribunal&materii=curte_de_apel&nivel=curte_de_apel')
    expect(sanitizeJusticeUrlFragment('/justice/courts/TribunalulCLUJ?an=2024&caseNumber=1')).toBe('/justice/courts/TribunalulCLUJ?an=2024')
  })

  it('keep the analysis page’s question — counties, matters, stages, the grouping — and drop anything else, its courts too', () => {
    const question = 'an=2024&nivel=tribunal&materie=faliment&etapa=apel&judet=CJ&dupa=materii&masura=locuitori'
    expect(sanitizeJusticeUrlFragment(`/justice/analytics?${question}&instanta=TribunalulCLUJ&q=Popescu&partyKey=7`)).toBe(`/justice/analytics?${question}`)
    expect(sanitizeJusticeUrlFragment('/justice/analytics?materie=civil%2Cpenal&judet=CJ%2CB')).toBe('/justice/analytics?materie=civil%2Cpenal&judet=CJ%2CB')
  })

  it('drop a page key whose value is not one of its codes: no case number, no name, no free text', () => {
    expect(sanitizeJusticeUrlFragment('/justice/analytics?materie=656/1/2025&instanta=TribunalulIonPopescu&an=2024')).toBe('/justice/analytics?an=2024')
    expect(sanitizeJusticeUrlFragment('/justice/analytics?nivel=tribunal,popescu&judet=XX&dupa=persoane&an=24/2025')).toBe('/justice/analytics')
    expect(sanitizeJusticeUrl('https://transparenta.eu/justice/analytics?etapa=Ion%20Popescu&masura=dosare')).toBe('https://transparenta.eu/justice/analytics?masura=dosare')
  })

  it('accept every code the pages write, and no name in their place', () => {
    const accepts = (key: keyof typeof SAFE_JUSTICE_VALUES, value: string) => SAFE_JUSTICE_VALUES[key]!(value)
    for (const level of LEVEL_KEYS) expect(accepts('nivel', level)).toBe(true)
    for (const matter of MATTER_KEYS) expect(accepts('materie', matter)).toBe(true)
    for (const stage of STAGE_KEYS) expect(accepts('etapa', stage)).toBe(true)
    for (const grouping of GROUPINGS) expect(accepts('dupa', grouping)).toBe(true)
    for (const county of COUNTY_CODES) expect(accepts('judet', county)).toBe(true)
    for (const [key, name] of [['materie', 'popescu'], ['judet', 'PO'], ['nivel', 'popescu'], ['an', 'Ion']] as const) expect(accepts(key, name)).toBe(false)
    expect(SAFE_JUSTICE_QUERY_PARAMS).not.toContain('instanta')
  })

  it('read a path encoded twice, an encoded query inside it, and capitals as the router does', () => {
    expect(sanitizeJusticePathname('/justice/%2563ases/TribunalulCLUJ/1234/117/2024')).toBe('/justice/cases/TribunalulCLUJ/:caseNumber')
    expect(sanitizeJusticeUrl('https://transparenta.eu/justice/%2563ases/TribunalulCLUJ/1234/117/2024')).toBe('https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber')
    expect(sanitizeJusticePathname('/justice/courts/TribunalulCLUJ%3FcaseNumber%3D1234%2F117%2F2024')).toBe('/justice/courts/TribunalulCLUJ')
    expect(sanitizeJusticeTelemetryString('failed to load /JUSTICE/CASES/TribunalulCLUJ/1234/117/2024')).not.toContain('1234/117/2024')
  })

  it('read an encoded path as the router does', () => {
    expect(isJusticePath('/%6Austice/cases/X/1/2/2024')).toBe(true)
    expect(sanitizeJusticePathname('/justice/%63ases/TribunalulCLUJ/1234/117/2024')).toBe('/justice/cases/TribunalulCLUJ/:caseNumber')
    expect(sanitizeJusticeUrl('https://transparenta.eu/justice/%63ases/TribunalulCLUJ/1234%2F117%2F2024')).toBe('https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber')
  })

  it('redact a case number from a title at any depth of an analytics payload', () => {
    expect(
      sanitizeJusticeEventProperties({
        title: 'Dosarul 17020,/245/2008 — X',
        $set: { title: 'Dosarul 340.1/832/2007 — X' },
        $set_once: { nested: { $title: 'Dosarul 9/9/2023 — Y' } },
        count: 2,
      }),
    ).toEqual({
      title: 'Dosarul :caseNumber — X',
      $set: { title: 'Dosarul :caseNumber — X' },
      $set_once: { nested: { $title: 'Dosarul :caseNumber — Y' } },
      count: 2,
    })
  })

  it('scrub a case address quoted inside telemetry text', () => {
    expect(sanitizeJusticeTelemetryString('failed to load /justice/cases/TribunalulCLUJ/1234/117/2024')).toBe('failed to load /justice/cases/TribunalulCLUJ/:caseNumber')
  })
})

describe('isJusticePath', () => {
  it('matches /justitie and /justitie/... but not substring-only paths', () => {
    expect(isJusticePath('/justitie')).toBe(true)
    expect(isJusticePath('/justitie/')).toBe(true)
    expect(isJusticePath('/justitie/cautare')).toBe(true)
    expect(isJusticePath('/justitie/instante/TB-BUCURESTI')).toBe(true)
    expect(isJusticePath('/justitie/dosare/portal-just-bucuresti-2024-001')).toBe(true)

    // Must not match unrelated paths that merely contain the substring.
    expect(isJusticePath('/entities/justitie-foo')).toBe(false)
    expect(isJusticePath('/companies/123')).toBe(false)
    expect(isJusticePath('/pnrr')).toBe(false)
    expect(isJusticePath('')).toBe(false)
  })
})

describe('sanitizeJusticePathname', () => {
  it('replaces justice case identifiers with a canonical telemetry segment', () => {
    expect(
      sanitizeJusticePathname(
        '/justitie/dosare/portal-just-bucuresti-2024-001',
      ),
    ).toBe('/justitie/dosare/:caseId')
    expect(sanitizeJusticePathname('/justitie/cautare')).toBe(
      '/justitie/cautare',
    )
    expect(sanitizeJusticePathname('/companies/123')).toBe('/companies/123')
  })
})

describe('sanitizeJusticeQueryString', () => {
  it('strips partyKey, caseNumber, from and unknown params on justice paths', () => {
    const sanitized = sanitizeJusticeQueryString(
      '/justitie/cautare',
      'court=TB-BUCURESTI&caseNumber=1234/3/2024&partyKey=sc-exemplu-sa&from=cautare&secret=1',
    )
    const params = new URLSearchParams(sanitized)
    expect(params.get('court')).toBe('TB-BUCURESTI')
    expect(params.has('caseNumber')).toBe(false)
    expect(params.has('partyKey')).toBe(false)
    expect(params.has('from')).toBe(false)
    expect(params.has('secret')).toBe(false)
  })

  it('preserves all safe aggregate params', () => {
    // The keys whose values are checked carry one of their codes; the others, anything.
    const sample: Partial<Record<(typeof SAFE_JUSTICE_QUERY_PARAMS)[number], string>> = {
      an: '2025',
      instante: 'tribunal',
      materii: 'toate',
      nivel: 'tribunal',
      judet: 'CJ',
      materie: 'faliment',
      etapa: 'apel',
      dupa: 'judete',
      masura: 'dosare',
    }
    const valueOf = (key: (typeof SAFE_JUSTICE_QUERY_PARAMS)[number]) => sample[key] ?? `value-${key}`
    const safeQuery = SAFE_JUSTICE_QUERY_PARAMS.map((key) => `${key}=${valueOf(key)}`).join('&')
    const sanitized = sanitizeJusticeQueryString('/justitie/cautare', safeQuery)
    const params = new URLSearchParams(sanitized)
    for (const key of SAFE_JUSTICE_QUERY_PARAMS) {
      expect(params.get(key)).toBe(valueOf(key))
    }
  })

  it('returns the query untouched for non-justice paths', () => {
    const query = 'partyKey=secret&caseNumber=1234&tab=summary'
    expect(sanitizeJusticeQueryString('/pnrr', query)).toBe(query)
  })

  it('sanitizes company/entity litigation tab params', () => {
    const companyQuery =
      'tab=litigii&litPage=2&partyKey=secret&caseNumber=1234&from=cautare&unknown=1'
    const sanitizedCompany = sanitizeJusticeQueryString(
      '/companies/14399840',
      companyQuery,
    )
    expect(sanitizedCompany).toBe('tab=litigii&litPage=2')

    const entityQuery = 'tab=litigii&partyKey=secret&court=TB-BUCURESTI'
    const sanitizedEntity = sanitizeJusticeQueryString('/entities/123', entityQuery)
    expect(sanitizedEntity).toBe('tab=litigii&court=TB-BUCURESTI')
  })

  it('sanitizes company/entity profile params when justice-sensitive params are present without litigii tab', () => {
    const sanitizedCompany = sanitizeJusticeQueryString(
      '/companies/14399840',
      'tab=summary&partyKey=secret&caseNumber=1234&court=TB-BUCURESTI&unknown=1',
    )
    expect(sanitizedCompany).toBe('tab=summary&court=TB-BUCURESTI')

    const sanitizedEntity = sanitizeJusticeQueryString(
      '/entities/123',
      'tab=buget&from=companies:123&litPage=4',
    )
    expect(sanitizedEntity).toBe('tab=buget&litPage=4')
  })

  it('handles leading "?" and empty query', () => {
    expect(sanitizeJusticeQueryString('/justitie', '?partyKey=secret')).toBe('')
    expect(sanitizeJusticeQueryString('/justitie', '')).toBe('')
    // Non-justice empty stays empty
    expect(sanitizeJusticeQueryString('/pnrr', '')).toBe('')
  })

  it('explicitly stripped params are a subset of non-safe params', () => {
    for (const stripped of STRIPPED_JUSTICE_QUERY_PARAMS) {
      expect(SAFE_JUSTICE_QUERY_PARAMS).not.toContain(stripped)
    }
  })
})

describe('sanitizeJusticeUrl', () => {
  it('strips sensitive params from an absolute justice URL, preserves safe ones and hash', () => {
    const url =
      'https://transparenta.eu/justitie/cautare?court=TB-BUCURESTI&partyKey=secret&caseNumber=1234/3/2024&from=cautare#results'
    const sanitized = sanitizeJusticeUrl(url)
    expect(sanitized).toBe(
      'https://transparenta.eu/justitie/cautare?court=TB-BUCURESTI#results',
    )
  })

  it('sanitizes litigation company absolute URLs and leaves other tabs unchanged', () => {
    const url = 'https://transparenta.eu/companies/14399840?tab=litigii&partyKey=x'
    expect(sanitizeJusticeUrl(url)).toBe(
      'https://transparenta.eu/companies/14399840?tab=litigii',
    )

    const summaryUrl = 'https://transparenta.eu/companies/14399840?tab=summary&partyKey=x'
    expect(sanitizeJusticeUrl(summaryUrl)).toBe(
      'https://transparenta.eu/companies/14399840?tab=summary',
    )
  })

  it('returns empty / malformed input unchanged', () => {
    expect(sanitizeJusticeUrl('')).toBe('')
    expect(sanitizeJusticeUrl('not a url')).toBe('not a url')
  })

  it('drops all params when only sensitive ones are present', () => {
    const sanitized = sanitizeJusticeUrl(
      'https://transparenta.eu/justitie/dosare/abc?partyKey=secret&caseNumber=1',
    )
    expect(sanitized).toBe('https://transparenta.eu/justitie/dosare/:caseId')
  })

  it('scrubs justice case path segments even when there is no query string', () => {
    expect(
      sanitizeJusticeUrl(
        'https://transparenta.eu/justitie/dosare/portal-just-bucuresti-2024-001',
      ),
    ).toBe('https://transparenta.eu/justitie/dosare/:caseId')
  })
})

describe('sanitizeJusticeUrlFragment', () => {
  it('sanitizes pathname+search fragments for justice routes', () => {
    const fragment =
      '/justitie/cautare?court=TB-BUCURESTI&partyKey=secret&caseNumber=1234#results'
    expect(sanitizeJusticeUrlFragment(fragment)).toBe(
      '/justitie/cautare?court=TB-BUCURESTI#results',
    )
  })

  it('sanitizes litigation profile fragments and leaves other tabs unchanged', () => {
    const fragment = '/companies/14399840?partyKey=secret&tab=litigii'
    expect(sanitizeJusticeUrlFragment(fragment)).toBe(
      '/companies/14399840?tab=litigii',
    )

    const summary = '/companies/14399840?partyKey=secret&tab=summary'
    expect(sanitizeJusticeUrlFragment(summary)).toBe(
      '/companies/14399840?tab=summary',
    )
  })

  it('handles fragments without a query string', () => {
    expect(sanitizeJusticeUrlFragment('/justitie')).toBe('/justitie')
    expect(sanitizeJusticeUrlFragment('/justitie/cautare')).toBe(
      '/justitie/cautare',
    )
  })

  it('handles fragments with a query but no hash', () => {
    expect(
      sanitizeJusticeUrlFragment('/justitie/cautare?partyKey=secret&court=TB-BUCURESTI'),
    ).toBe('/justitie/cautare?court=TB-BUCURESTI')
  })

  it('returns empty input unchanged', () => {
    expect(sanitizeJusticeUrlFragment('')).toBe('')
  })
})

describe('sanitizeJusticeTelemetryString', () => {
  it('scrubs embedded justice URLs and field assignments in payload strings', () => {
    expect(
      sanitizeJusticeTelemetryString(
        'Failed at /justitie/dosare/portal-just-bucuresti-2024-001?caseNumber=1234/3/2024 and partyKey=sc-secret',
      ),
    ).toBe(
      'Failed at /justitie/dosare/:caseId and partyKey=[scrubbed]',
    )
  })
})

describe('sanitizeJusticeTelemetryValue', () => {
  it('recursively redacts keyed justice identifiers and sanitizes URL strings', () => {
    const sanitized = sanitizeJusticeTelemetryValue({
      caseNumber: '1234/3/2024',
      nested: {
        partyKey: 'sc-secret',
        href: 'https://transparenta.eu/companies/14399840?tab=summary&partyKey=x',
      },
      links: [
        '/justitie/dosare/portal-just-bucuresti-2024-001?court=TB-BUCURESTI&from=cautare',
      ],
      label: 'safe aggregate text',
    })

    expect(sanitized).toEqual({
      caseNumber: '[scrubbed]',
      nested: {
        partyKey: '[scrubbed]',
        href: 'https://transparenta.eu/companies/14399840?tab=summary',
      },
      links: ['/justitie/dosare/:caseId?court=TB-BUCURESTI'],
      label: 'safe aggregate text',
    })
  })
})
