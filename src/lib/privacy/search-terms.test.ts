import { describe, expect, it } from 'vitest'
import { withoutSearchTerms } from './search-terms'
import { sanitizeJusticeTelemetryValue } from './sensitive-route-sanitizer'

/** docs/design/landing-search-query-param.md, decision 9: no reader's search text in telemetry. */
describe('withoutSearchTerms', () => {
  it('masks q in any address: relative, absolute, protocol-relative, on any page', () => {
    expect(withoutSearchTerms('/?q=primaria%20cluj')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=primaria+cluj')).toBe('/?q=_')
    expect(withoutSearchTerms('https://transparenta.eu/?q=Ia%C8%99i')).toBe('https://transparenta.eu/?q=_')
    expect(withoutSearchTerms('https://transparenta.eu?q=Iasi')).toBe('https://transparenta.eu?q=_')
    expect(withoutSearchTerms('//transparenta.eu/?q=Iasi')).toBe('//transparenta.eu/?q=_')
    expect(withoutSearchTerms('http://localhost:3000/?q=2816464#top')).toBe('http://localhost:3000/?q=_#top')
    expect(withoutSearchTerms('/parlament/membri?q=popescu')).toBe('/parlament/membri?q=_')
    expect(withoutSearchTerms('/catalog/../?q=Cluj')).toBe('/catalog/../?q=_')
  })

  it('reads the name and the = through their escapes, and masks every q', () => {
    expect(withoutSearchTerms('/?%71=Cluj')).toBe('/?%71=_')
    expect(withoutSearchTerms('/?Q=Cluj')).toBe('/?Q=_')
    expect(withoutSearchTerms('/?q%3DCluj')).toBe('/?q%3D_')
    expect(withoutSearchTerms('/?q=first&q=second')).toBe('/?q=_&q=_')
  })

  it('keeps the other parameters, before and after, as they were encoded', () => {
    expect(withoutSearchTerms('/?harta=venituri&q=primaria&currency=EUR')).toBe('/?harta=venituri&q=_&currency=EUR')
    expect(withoutSearchTerms('/?note=a%20b&q=x')).toBe('/?note=a%20b&q=_')
  })

  it('masks a value whole: an escaped space, ampersand or hash, a backtick or a quote inside it ends nothing', () => {
    expect(withoutSearchTerms('/?q=River%20Town')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=a%26b&harta=venituri')).toBe('/?q=_&harta=venituri')
    expect(withoutSearchTerms('/?q=C%23%20developer')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=`Cluj`')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=%22Cluj%20Napoca%22&x=1')).toBe('/?q=_&x=1')
    expect(withoutSearchTerms('<a href="/?q=&quot;Cluj&quot;">')).toBe('<a href="/?q=_">')
  })

  it('reads as the value what an address leaves unescaped, and HTML entities', () => {
    // The router writes parentheses as they are (`normalizeSearchEncoding`); `encodeURIComponent` leaves `'!*~`.
    expect(withoutSearchTerms('/?q=(CJ)%20Popescu')).toBe('/?q=_')
    expect(withoutSearchTerms("/?q=O'Brien&x=1")).toBe('/?q=_&x=1')
    expect(withoutSearchTerms('/?q=wow!*~')).toBe('/?q=_')
    // React escapes an apostrophe in an attribute as an entity: its `#` is no fragment.
    expect(withoutSearchTerms('<a href="/?q=O&#x27;Brien">')).toBe('<a href="/?q=_">')
    expect(withoutSearchTerms('<a href="/?q=O&#39;Brien&amp;x=1">')).toBe('<a href="/?q=_&amp;x=1">')
  })

  it('ends a value where the string it sits in ends, leaving JSON and other parameters whole', () => {
    expect(withoutSearchTerms('{"url":"/?q=","status":503}')).toBe('{"url":"/?q=","status":503}')
    expect(withoutSearchTerms('{"url":"/?q=Cluj","status":503}')).toBe('{"url":"/?q=_","status":503}')
    expect(withoutSearchTerms('/?q=x&filter[status]=active')).toBe('/?q=_&filter[status]=active')
  })

  it('reads an escaped line break as part of the search, wherever it is', () => {
    expect(withoutSearchTerms('/?q=Consiliul%0APopescu')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=%0APopescu')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=%0A%2FPopescu')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=Dosar%201234%0A%2F117%2F2024&x=1')).toBe('/?q=_&x=1')
    // An escaped list of addresses is masked from its first q on: over-scrubbing, the safe direction.
    const list = ['host0', 'host1'].map((host) => `https%3A%2F%2F${host}%2F%3Fq%3Dx`).join('%0A')
    expect(withoutSearchTerms(list)).toBe('https%3A%2F%2Fhost0%2F%3Fq%3D_')
  })

  it('reads HTML’s escaped separator', () => {
    expect(withoutSearchTerms('/?harta=venituri&amp;q=secret')).toBe('/?harta=venituri&amp;q=_')
    // Only before a parameter: `R&amp;D` is one value.
    expect(withoutSearchTerms('/?q=R&amp;D')).toBe('/?q=_')
    expect(withoutSearchTerms('/?q=R&amp;D&amp;x=1')).toBe('/?q=_&amp;x=1')
    // HTML's separator, itself URL-escaped inside a return address.
    expect(withoutSearchTerms('/cookies?redirect=%2F%3Fharta%3Dvenituri%26amp%3Bq%3DIasiNord')).toBe('/cookies?redirect=%2F%3Fharta%3Dvenituri%26amp%3Bq%3D_')
  })

  it('masks a search inside a return address, escaped whole, in part or not at all, and the outer one beside it', () => {
    expect(withoutSearchTerms('https://transparenta.eu/cookies?redirect=%2F%3Fq%3Dprimaria%2520cluj')).toBe('https://transparenta.eu/cookies?redirect=%2F%3Fq%3D_')
    expect(withoutSearchTerms('/cookies?redirect=%252F%253Fharta%253Dvenituri%2526q%253Dsecret')).toBe('/cookies?redirect=%252F%253Fharta%253Dvenituri%2526q%253D_')
    expect(withoutSearchTerms('/cookies?redirect=/?q=secret')).toBe('/cookies?redirect=/?q=_')
    expect(withoutSearchTerms('/cookies?redirect=/?harta=venituri%26q=Cluj')).toBe('/cookies?redirect=/?harta=venituri%26q=_')
    expect(withoutSearchTerms('/cookies?redirect=/?q=Cluj%26harta=venituri')).toBe('/cookies?redirect=/?q=_%26harta=venituri')
    expect(withoutSearchTerms('/?redirect=%2F%3Fq%3DIasi&q=Cluj')).toBe('/?redirect=%2F%3Fq%3D_&q=_')
  })

  it('reads a return address escaped any number of times, as the footer’s cookie link nests it on each visit', () => {
    let address = '/?q=JudeteleNord'
    for (let visit = 0; visit < 8; visit += 1) address = `/cookies?redirect=${encodeURIComponent(address)}`
    expect(withoutSearchTerms(address)).not.toContain('JudeteleNord')
  })

  it('masks a query string with no path, as Sentry and the error page record one', () => {
    expect(withoutSearchTerms('?q=Cluj')).toBe('?q=_')
    expect(withoutSearchTerms('q=Cluj%20Napoca&page=2')).toBe('q=_&page=2')
  })

  it('masks every address in prose, word by word', () => {
    expect(withoutSearchTerms('Navigated from /?q=ana to /entities/1 ("/?q=ion")')).toBe('Navigated from /?q=_ to /entities/1 ("/?q=_")')
  })

  it('leaves strings with no q parameter as they were', () => {
    for (const text of ['/?harta=venituri', '/', 'faq=1', 'quarter=2', '/entities/1?quarter=2', '/files/YQ==?page=2', 'a query=1', '/?q=']) {
      expect(withoutSearchTerms(text)).toBe(text)
    }
  })

  it('reads long hostile strings in linear time', () => {
    const cases = [
      '/?'.repeat(20_000) + 'a'.repeat(20_000),
      '/?q=' + '&'.repeat(40_000),
      '/?q=' + '%2525'.repeat(10_000),
      Array.from({ length: 4_000 }, (_, index) => `https%3A%2F%2Fhost${index}%2F%3Fq%3Dx%0A`).join(''),
      '/?q=' + '&#x27;'.repeat(10_000),
      '/?q=' + '&a'.repeat(20_000),
      ('%' + '25'.repeat(5_000) + 'x').repeat(8),
      '/?q=x' + ('&' + '%' + '25'.repeat(5_000)).repeat(8),
    ]
    for (const text of cases) {
      const started = performance.now()
      withoutSearchTerms(text)
      expect(performance.now() - started).toBeLessThan(500)
    }
  })
})

describe('the shared telemetry chain (PostHog properties, Sentry events)', () => {
  it('masks the search in URLs and breadcrumbs', () => {
    expect(sanitizeJusticeTelemetryValue({ url: 'https://transparenta.eu/?q=secret', breadcrumbs: [{ data: { from: '/?q=secret', to: '/entities/1' } }] })).toEqual({
      url: 'https://transparenta.eu/?q=_',
      breadcrumbs: [{ data: { from: '/?q=_', to: '/entities/1' } }],
    })
  })

  it('masks the search before the party-code scrubber decodes the address, so no word of it is left', () => {
    const scrubbed = JSON.stringify(sanitizeJusticeTelemetryValue({ url: 'https://transparenta.eu/?furnizor=14837428&q=River%20Town%26Hills' }))
    expect(scrubbed).not.toMatch(/River|Town|Hills|14837428/u)
  })

  it('masks the query an error page records beside its route, and Sentry’s query string in each of its forms', () => {
    expect(sanitizeJusticeTelemetryValue({ global_error: { route: '/', query: '?q=Cluj' } })).toEqual({ global_error: { route: '/', query: '?q=_' } })
    expect(
      sanitizeJusticeTelemetryValue({
        request: { url: 'https://transparenta.eu/?q=Cluj', query_string: 'q=Cluj%20Napoca' },
        asObject: { query_string: { q: 'Cluj', page: '2' } },
        asPairs: { query_string: [['q', 'Cluj'], ['page', '2']] },
      }),
    ).toEqual({
      request: { url: 'https://transparenta.eu/?q=_', query_string: 'q=_' },
      asObject: { query_string: { q: '_', page: '2' } },
      asPairs: { query_string: [['q', '_'], ['page', '2']] },
    })
  })

  it('masks a decoded campaign parameter that holds a search whole, and leaves one that does not', () => {
    expect(
      sanitizeJusticeTelemetryValue({
        utm_content: '/?q=Primaria Popescu',
        $session_entry_utm_content: '/?q= Popescu',
        $initial_gad_source: '/?q=Primaria Cluj',
        gad_source: '/?q=_ Cluj',
        utm_source: 'newsletter',
      }),
    ).toEqual({ utm_content: '_', $session_entry_utm_content: '_', $initial_gad_source: '_', gad_source: '_', utm_source: 'newsletter' })
  })

  it('reads a hostile property name in linear time', () => {
    const key = 'utm_'.repeat(20_000) + '1'
    const started = performance.now()
    sanitizeJusticeTelemetryValue({ [key]: '/?q=x' })
    expect(performance.now() - started).toBeLessThan(500)
  })

  it('masks a search held by its key in any shape, and the keyword PostHog copies out of a search engine’s referrer', () => {
    expect(sanitizeJusticeTelemetryValue({ extra: { search: { q: ['Cluj', 'Napoca'], harta: 'venituri' } } })).toEqual({ extra: { search: { q: '_', harta: 'venituri' } } })
    expect(
      sanitizeJusticeTelemetryValue({ ph_keyword: 'Cluj Nord', $session_entry_ph_keyword: 'Cluj Nord', $set_once: { $initial_ph_keyword: 'Cluj Nord' }, $search_engine: 'bing' }),
    ).toEqual({
      ph_keyword: '_',
      $session_entry_ph_keyword: '_',
      $set_once: { $initial_ph_keyword: '_' },
      $search_engine: 'bing',
    })
  })
})
