import { describe, it, expect } from 'vitest'
import { COUNTY_CODES, GROUPINGS, LEVEL_KEYS, MATTER_KEYS } from '@/features/justice/lib/analysis-model'
import { ECHR_VIEWS } from '@/features/justice/lib/echr-address'
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

  it('keep the ECHR page’s year and tab, and drop an application number or anything else in their place', () => {
    expect(sanitizeJusticeUrlFragment('/justice/echr?an=2018&vedere=hotarari&q=Popescu')).toBe('/justice/echr?an=2018&vedere=hotarari')
    expect(sanitizeJusticeUrlFragment('/justice/echr?vedere=6946/03&an=6946/03')).toBe('/justice/echr')
    for (const view of ECHR_VIEWS) expect(SAFE_JUSTICE_VALUES.vedere!(view)).toBe(true)
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

  it('scrub a case address another page carries as its way back, as the cookie settings’ link from a case page does', () => {
    const casePage = '/justice/cases/InaltaCurtedeCasatiesiJustitie/9999999/1/2025?lang=en'
    const scrubbed = `redirect=${encodeURIComponent('/justice/cases/InaltaCurtedeCasatiesiJustitie/:caseNumber')}`
    const cookies = `/cookies?redirect=${encodeURIComponent(casePage)}`
    expect(sanitizeJusticeUrlFragment(cookies)).toBe(`/cookies?${scrubbed}`)
    expect(sanitizeJusticeUrl(`https://transparenta.eu${cookies}#top`)).toBe(`https://transparenta.eu/cookies?${scrubbed}#top`)
    // Encoded twice, or a way back to a page that holds a way back itself.
    expect(sanitizeJusticeUrlFragment(`/cookies?redirect=${encodeURIComponent(encodeURIComponent(casePage))}`)).toBe(`/cookies?${scrubbed}`)
    expect(sanitizeJusticeUrlFragment(`/cookies?redirect=${encodeURIComponent(cookies)}`)).not.toContain('9999999')
    // The analytics payload the SDK sends, and text that quotes the address.
    const event = sanitizeJusticeEventProperties({ $current_url: `https://transparenta.eu${cookies}`, $pathname: '/cookies' })
    expect(JSON.stringify(event)).not.toMatch(/9999999/u)
    expect(sanitizeJusticeTelemetryString(`navigated to ${cookies}`)).not.toContain('9999999')
    expect(sanitizeJusticeTelemetryString(`navigated to ${cookies.replace('/cookies', 'cookies')}`)).not.toContain('9999999')
  })

  it('scrub a case address however often it was encoded, and one quoted inside another value’s text', () => {
    const casePage = '/justice/cases/InaltaCurtedeCasatiesiJustitie/9999999/1/2025'
    /** What a reader of the telemetry could recover: the text decoded until it stops changing. */
    const recovered = (text: string) => {
      let current = text
      for (let round = 0; round < 12; round += 1) current = decodeURIComponent(current)
      return current
    }
    let encoded = casePage
    for (let round = 0; round < 7; round += 1) encoded = encodeURIComponent(encoded)
    expect(recovered(sanitizeJusticeUrlFragment(`/cookies?redirect=${encoded}`))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeTelemetryString(`redirect=${encoded}`))).not.toContain('9999999')
    // A way back to the cookie settings, whose own way back is the case: `%252F` in the text.
    const twice = `/cookies?redirect=${encodeURIComponent(`/cookies?redirect=${encodeURIComponent(casePage)}`)}`
    expect(recovered(sanitizeJusticeTelemetryString(`went back to ${twice.slice('/cookies?redirect='.length)}`))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeUrlFragment(`/search?q=${encodeURIComponent(`vezi ${casePage}`)}`))).not.toContain('9999999')
    // An address quoted in a message, encoded twice, absolute too.
    for (const address of [casePage, `https://transparenta.eu${casePage}`])
      expect(recovered(sanitizeJusticeTelemetryString(`failed to load ${encodeURIComponent(encodeURIComponent(address))}`))).not.toContain('9999999')
  })

  it('keep each way back’s own query inside it: an inner key never becomes the outer page’s', () => {
    const inner = '/justice/analytics?an=2025&caseNumber=9999999/117/2025&partyKey=77'
    const cookies = (back: string) => `/cookies?redirect=${encodeURIComponent(back)}`
    for (const fragment of [cookies(inner), cookies(cookies(inner)), cookies(cookies(cookies(inner)))]) {
      const event = sanitizeJusticeEventProperties({ $current_url: `https://transparenta.eu${fragment}` })
      const text = decodeURIComponent(decodeURIComponent(decodeURIComponent(String(event.$current_url))))
      expect(text).not.toContain('9999999')
      expect(text).not.toContain('partyKey')
      // The analysis page's own question is kept.
      expect(text).toContain('/justice/analytics?an=2025')
    }
  })

  it('leave a way back that is not a justice address as it was', () => {
    for (const fragment of ['/cookies?redirect=%2Fprocurement%3Fq%3Dx', '/cookies?redirect=/justice/analytics?an%3D2025', '/search?q=justice+cases'])
      expect(sanitizeJusticeUrlFragment(fragment)).toBe(fragment)
    expect(sanitizeJusticeUrl('https://transparenta.eu/cookies?redirect=%2Fprocurement')).toBe('https://transparenta.eu/cookies?redirect=%2Fprocurement')
  })
})

/**
 * What the reviews of 17 November 2026 found the sanitizer letting through: it
 * fails closed now, scrubbing whole what it cannot read to the end when a
 * lenient reading shows a justice address, a litigation profile or a case key.
 */
describe('a way back the sanitizer cannot read to the end', () => {
  const event = (url: string) => JSON.stringify(sanitizeJusticeEventProperties({ $current_url: `https://transparenta.eu${url}` }))
  /** What a reader of the telemetry could recover, a malformed escape notwithstanding. */
  const recovered = (text: string) => {
    let current = text
    for (let round = 0; round < 80; round += 1) current = current.replace(/%([0-9a-f]{2})/giu, (_m, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    return current
  }
  const cookies = (back: string) => `/cookies?redirect=${encodeURIComponent(back)}`

  it('scrubs a case page behind a malformed escape', () => {
    const url = cookies('/justice/%63ases/TribunalulCLUJ/9999999/117/2025%')
    expect(recovered(event(url))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeUrlFragment(url))).not.toContain('9999999')
  })

  it('scrubs a case page encoded past the layers it decodes, its route letters encoded too', () => {
    let encoded = '/%6austice/cases/TribunalulCLUJ/9999999/117/2025'
    for (let round = 0; round < 7; round += 1) encoded = encodeURIComponent(encoded)
    expect(recovered(event(`/cookies?redirect=${encoded}`))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeTelemetryString(`redirect=${encoded}`))).not.toContain('9999999')
  })

  it('scrubs a litigation profile nested past the depth it follows', () => {
    let url = '/companies/14837428?tab=litigii&caseNumber=9999999/117/2025'
    for (let round = 0; round < 7; round += 1) url = cookies(url)
    expect(recovered(event(url))).not.toContain('9999999')
  })

  it('drops a fragment that carries a value from a justice address, and keeps a plain anchor', () => {
    const url = cookies('/justice/cases/TribunalulCLUJ/9999999/117/2025#caseNumber=9999999/117/2025')
    expect(recovered(event(url))).not.toContain('9999999')
    expect(sanitizeJusticeUrlFragment('/justice/cases/TribunalulCLUJ/1/117/2025#parti')).toBe('/justice/cases/TribunalulCLUJ/:caseNumber#parti')
    expect(sanitizeJusticeUrl('https://transparenta.eu/justice/analytics?an=2025#9999999-117-2025')).toBe('https://transparenta.eu/justice/analytics?an=2025')
  })

  it('leaves alone what only looks like a justice address: another word, a host name', () => {
    for (const value of ['/justice-league/intro', 'https://justice.gov/about']) {
      let encoded = value
      for (let round = 0; round < 7; round += 1) encoded = encodeURIComponent(encoded)
      const url = `/cookies?redirect=${encoded}`
      expect(sanitizeJusticeUrlFragment(url)).toBe(url)
      expect(sanitizeJusticeUrlFragment(cookies(value))).toBe(cookies(value))
    }
  })

  it('leaves a way back it cannot read alone when it hides nothing', () => {
    for (const url of [cookies('/procurement?q=100%'), cookies('/search?q=a%GZb')]) expect(sanitizeJusticeUrlFragment(url)).toBe(url)
  })
})

/** The second review of 17 November 2026: what the rebuilding passes still missed, and what the output guard catches. */
describe('the output guard', () => {
  const event = (url: string) => JSON.stringify(sanitizeJusticeEventProperties({ $current_url: `https://transparenta.eu${url}` }))
  const recovered = (text: string) => {
    let current = text
    for (let round = 0; round < 80; round += 1) current = current.replace(/%([0-9a-f]{2})/giu, (_m, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    return current
  }
  const cookies = (back: string) => `/cookies?redirect=${encodeURIComponent(back)}`
  const layers = (value: string, count: number) => {
    let current = value
    for (let round = 0; round < count; round += 1) current = encodeURIComponent(current)
    return current
  }
  const wrapped = (value: string, count: number) => {
    let current = value
    for (let round = 0; round < count; round += 1) current = cookies(current)
    return current
  }

  it('scrubs a case number behind an encoded newline', () => {
    expect(recovered(event(cookies('/justice/cases/C/9999999/117/2025%0A%')))).not.toContain('9999999')
  })

  it('scrubs a hidden case page sitting beside an address the passes read', () => {
    const text = sanitizeJusticeTelemetryString('ok=%2Fjustice%2Fanalytics&bad=%2F%6Austice%2Fcases%2FC%2F9999999%2F117%2F2025')
    expect(recovered(text)).not.toContain('9999999')
  })

  it('scrubs what is encoded or wrapped past every layer the passes read', () => {
    expect(recovered(sanitizeJusticeTelemetryString(`x=${layers('/%6austice/cases/C/9999999/117/2025', 16)}`))).not.toContain('9999999')
    const litigation = wrapped('/companies/14837428?tab=litigii&caseNumber=9999999/117/2025', 23)
    expect(recovered(event(litigation))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeUrlFragment(litigation))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeTelemetryString(litigation))).not.toContain('9999999')
    expect(recovered(sanitizeJusticeUrlFragment(`/cookies?redirect=${layers('/justice/cases/C/9999999/117/2025', 22)}`))).not.toContain('9999999')
  })

  it('reads `.` and `..` segments the way a browser resolves them', () => {
    for (const path of ['/justice/%2E/cases/C/9999999/117/2025', '/justice/x/%2e%2E/cases/C/9999999/117/2025', '/justice\\cases\\C\\9999999'])
      expect(recovered(event(cookies(path)))).not.toContain('9999999')
  })

  it('keeps what hides nothing exactly as it was', () => {
    // A company's code is masked, its address read in the clear (TEL-001: no party code in telemetry); nothing else of it changes.
    const safe = cookies('/companies/123?tab=litigii#results')
    expect(sanitizeJusticeTelemetryString(safe)).toBe('/cookies?redirect=/companies/_?tab=litigii#results')
    for (const value of ['/justice%2Eleague/intro', 'https://justice%2egov/about']) {
      const text = `/cookies?redirect=${layers(value, 7)}`
      expect(sanitizeJusticeTelemetryString(text)).toBe(text)
    }
    const romanian = '/search?tip=%C8%99coal%C4%83%20general%C4%83'
    expect(sanitizeJusticeTelemetryString(romanian)).toBe(romanian)
    // A reader's search text is not left as it was (docs/design/landing-search-query-param.md, decision 9).
    expect(sanitizeJusticeTelemetryString('/search?q=%C8%99coal%C4%83%20general%C4%83')).toBe('/search?q=_')
    // A key that only ends in a sensitive one's name is another key.
    for (const text of ['/dashboard?showcase_id=42', 'Error: getCaseId=not-found']) expect(sanitizeJusticeTelemetryString(text)).toBe(text)
    expect(sanitizeJusticeTelemetryString('x caseId=9999999')).toBe('x caseId=[scrubbed]')
  })

  it('reads a long string in linear time', () => {
    for (const text of ['a'.repeat(32_000), `${'%41'.repeat(10_000)} /cookies?redirect=${'b'.repeat(20_000)}`, 'x /justice/analytics?an=2025 '.repeat(2_000)]) {
      const started = performance.now()
      sanitizeJusticeTelemetryString(text)
      expect(performance.now() - started).toBeLessThan(200)
    }
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
      vedere: 'hotarari',
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
        href: 'https://transparenta.eu/companies/_?tab=summary',
      },
      links: ['/justitie/dosare/:caseId?court=TB-BUCURESTI'],
      label: 'safe aggregate text',
    })
  })
})
