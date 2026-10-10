import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
  redirect: (options: unknown) => ({ redirect: options }),
}))

vi.mock('@/config/env', () => ({
  getSiteUrl: () => 'https://transparenta.eu',
}))

const locale = vi.hoisted(() => ({ current: 'ro' as 'ro' | 'en' }))
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => locale.current,
}))

const createPublicPageCacheHeaders = vi.hoisted(() => vi.fn(() => ({ 'Cache-Control': 'public' })))
vi.mock('@/lib/http-cache', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/http-cache')>()), createPublicPageCacheHeaders }))

const ssr = vi.hoisted(() => ({ server: false }))
vi.mock('@/lib/ssr/loader-blocking', () => ({ shouldBlockLoaderForSsr: () => ssr.server }))

const serverRead = vi.hoisted(() => vi.fn(async () => ({ seed: [{ key: ['companies', 'analytics', 'release', 'active'], data: {} }], complete: true })))
vi.mock('@/features/private-companies/api/company-hub-analytics', () => ({ readCompanyHubForSsr: serverRead }))

type Head = {
  readonly meta: readonly Record<string, string>[]
  readonly links: readonly Record<string, string>[]
  readonly scripts: readonly { readonly type: string; readonly children: string }[]
}

type RouteOptions = {
  readonly ssr: unknown
  readonly validateSearch: (search: Record<string, unknown>) => unknown
  readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void
  readonly loaderDeps: (input: { readonly search: unknown }) => { readonly search: unknown }
  readonly loader: (input: { readonly deps: { readonly search: unknown } }) => Promise<{ readonly seed: readonly unknown[]; readonly complete: boolean }>
  readonly headers: () => Record<string, string>
  readonly head: () => Head
}

async function route(): Promise<RouteOptions> {
  const { Route } = await import('./companies.index')
  return (Route as unknown as { options: RouteOptions }).options
}

/** The head as the route builds it: from nothing but the page's language — no loader, no figures. */
async function head(): Promise<Head> {
  return (await route()).head()
}

/** The hub's description: what a reader can do and where the facts come from, with no count or year. */
const HUB_DESCRIPTION =
  'Caută orice firmă din România după nume sau CUI: starea, județul și activitățile din ediția publicată a registrului comerțului (ONRC), datele fiscale ANAF și bilanțurile depuse, fiecare cu sursa și data ei.'

function metaOf(built: Head, key: string) {
  const entry = built.meta.find((item) => item.name === key || item.property === key || (key === 'title' && 'title' in item))
  return entry ? (entry.content ?? entry.title) : undefined
}

function thrownBy(run: () => void): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  return undefined
}

describe('/companies route', () => {
  afterEach(() => {
    locale.current = 'ro'
    ssr.server = false
    serverRead.mockClear()
  })

  it('keeps the hub’s own choices and drops values it does not know', async () => {
    const { validateSearch } = await route()
    expect(validateSearch({ indicator: 'salariati', clasament: 'salariati', domenii: 'nope' })).toEqual({
      indicator: 'salariati',
      clasament: 'salariati',
      domenii: undefined,
    })
    // The registry-era map layers have no source in the analytics release: an old link opens the default.
    expect(validateSearch({ indicator: 'densitate' })).toEqual({ indicator: undefined })
    expect(validateSearch({ indicator: 'infiintari', domenii: 'firme' })).toEqual({ indicator: undefined, domenii: 'firme' })
  })

  it('sends an old directory deep link to the directory, with the language it carried', async () => {
    const { beforeLoad } = await route()
    expect(thrownBy(() => beforeLoad({ location: { search: { county: 'CLUJ', clasament: 'salariati', lang: 'en' } } }))).toEqual({
      redirect: { to: '/companies/search', search: { lang: 'en', county: ['CLUJ'] }, replace: true },
    })
  })

  it('stays on the hub for a link that carries only the hub’s choices', async () => {
    const { beforeLoad } = await route()
    expect(thrownBy(() => beforeLoad({ location: { search: { indicator: 'firme', lang: 'en' } } }))).toBeUndefined()
    expect(thrownBy(() => beforeLoad({ location: { search: { indicator: 'densitate', lang: 'en' } } }))).toBeUndefined()
  })

  it('never lets a CDN or a browser keep any response: its HTML holds a release’s figures', async () => {
    vi.stubEnv('DEV', false)
    try {
      const headers = (await route()).headers()
      expect(headers['Cache-Control']).toBe('no-store')
      expect(headers['CDN-Cache-Control']).toBe('no-store')
      expect(Object.values(headers).join(' ')).not.toMatch(/max-age|stale-while-revalidate|public/u)
      expect(createPublicPageCacheHeaders).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('reads the hub’s figures on the server only, for the choices in the address — a client navigation reads in the browser', async () => {
    const options = await route()
    expect(options.ssr).toBe(true)
    const deps = options.loaderDeps({ search: { clasament: 'salariati' } })
    expect(deps).toEqual({ search: { clasament: 'salariati' } })

    expect(await options.loader({ deps })).toEqual({ seed: [], complete: true })
    expect(serverRead).not.toHaveBeenCalled()

    ssr.server = true
    const read = await options.loader({ deps })
    expect(serverRead).toHaveBeenCalledWith({ clasament: 'salariati' })
    expect(read.seed).toHaveLength(1)
  })

  it('describes the hub by what a reader finds and where it comes from, quoting no figure it cannot vouch for', async () => {
    // The head is built from no data: the loader's figures never reach a title, a description or the structured data.
    const built = await head()
    expect(metaOf(built, 'title')).toContain('Transparenta.eu')
    expect(metaOf(built, 'og:title')).toBe(metaOf(built, 'title'))
    expect(metaOf(built, 'description')).toBe(HUB_DESCRIPTION)
    expect(metaOf(built, 'og:description')).toBe(HUB_DESCRIPTION)
    expect(metaOf(built, 'twitter:description')).toBe(HUB_DESCRIPTION)
    // No count, share or year in anything a search result quotes.
    for (const key of ['title', 'description', 'og:title', 'twitter:title']) expect(metaOf(built, key)).not.toMatch(/\d/u)
    expect(metaOf(built, 'robots')).toBe('index,follow')
    expect(metaOf(built, 'og:url')).toBe('https://transparenta.eu/companies')

    const [dataset, webPage] = built.scripts.map((script) => JSON.parse(script.children) as Record<string, unknown>)
    expect(dataset?.['@type']).toBe('Dataset')
    // Its provenance is the two sources the hub reads, and nothing it does not (no population source).
    expect(dataset?.isBasedOn).toEqual(['https://www.onrc.ro', 'https://www.anaf.ro'])
    // No period or freshness the hub cannot show: the figures are the browser's pinned edition's.
    expect(dataset).not.toHaveProperty('temporalCoverage')
    expect(dataset).not.toHaveProperty('dateModified')
    expect(dataset?.description).toBe(HUB_DESCRIPTION)
    expect(JSON.stringify(dataset?.variableMeasured)).not.toMatch(/\d|cifra de afaceri|salariați|înființate/u)
    expect(webPage?.['@type']).toBe('WebPage')
    expect(webPage?.description).toBe(HUB_DESCRIPTION)
  })

  it('gives each language its own canonical and names the other', async () => {
    expect((await head()).links).toEqual([
      { rel: 'canonical', href: 'https://transparenta.eu/companies' },
      { rel: 'alternate', hrefLang: 'ro', href: 'https://transparenta.eu/companies' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://transparenta.eu/companies?lang=en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://transparenta.eu/companies' },
    ])
    locale.current = 'en'
    const english = await head()
    expect(english.links[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/companies?lang=en' })
    expect(metaOf(english, 'og:url')).toBe('https://transparenta.eu/companies?lang=en')
    expect(metaOf(english, 'og:locale')).toBe('en_US')
  })
})
