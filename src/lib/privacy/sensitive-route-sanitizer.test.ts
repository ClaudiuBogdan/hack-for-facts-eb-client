import { describe, it, expect } from 'vitest'
import {
  SAFE_JUSTICE_QUERY_PARAMS,
  STRIPPED_JUSTICE_QUERY_PARAMS,
  isJusticePath,
  sanitizeJusticePathname,
  sanitizeJusticeQueryString,
  sanitizeJusticeTelemetryString,
  sanitizeJusticeTelemetryValue,
  sanitizeJusticeUrl,
  sanitizeJusticeUrlFragment,
} from './sensitive-route-sanitizer'

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
    const safeQuery = SAFE_JUSTICE_QUERY_PARAMS.map(
      (key) => `${key}=value-${key}`,
    ).join('&')
    const sanitized = sanitizeJusticeQueryString('/justitie/cautare', safeQuery)
    const params = new URLSearchParams(sanitized)
    for (const key of SAFE_JUSTICE_QUERY_PARAMS) {
      expect(params.get(key)).toBe(`value-${key}`)
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
