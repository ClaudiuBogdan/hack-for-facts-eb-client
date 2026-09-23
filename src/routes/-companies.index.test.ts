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
vi.mock('@/lib/http-cache', () => ({ createPublicPageCacheHeaders }))

type Head = {
  readonly meta: readonly Record<string, string>[]
  readonly links: readonly Record<string, string>[]
  readonly scripts: readonly { readonly type: string; readonly children: string }[]
}

type RouteOptions = {
  readonly validateSearch: (search: Record<string, unknown>) => unknown
  readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void
  readonly loader: () => Promise<{ readonly seo: unknown }>
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly loaderData?: Awaited<ReturnType<RouteOptions['loader']>> }) => Head
}

async function route(): Promise<RouteOptions> {
  const { Route } = await import('./companies.index')
  return (Route as unknown as { options: RouteOptions }).options
}

async function head(): Promise<Head> {
  const options = await route()
  return options.head({ loaderData: await options.loader() })
}

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
  })

  it('keeps the hub’s own choices and drops values it does not know', async () => {
    const { validateSearch } = await route()
    expect(validateSearch({ indicator: 'infiintari', clasament: 'salariati', domenii: 'nope' })).toEqual({
      indicator: 'infiintari',
      clasament: 'salariati',
      domenii: undefined,
    })
  })

  it('sends an old directory deep link to the directory, with the language it carried', async () => {
    const { beforeLoad } = await route()
    expect(thrownBy(() => beforeLoad({ location: { search: { county: 'CLUJ', clasament: 'salariati', lang: 'en' } } }))).toEqual({
      redirect: { to: '/companies/search', search: { lang: 'en', county: ['CLUJ'] }, replace: true },
    })
  })

  it('stays on the hub for a link that carries only the hub’s choices', async () => {
    const { beforeLoad } = await route()
    expect(thrownBy(() => beforeLoad({ location: { search: { indicator: 'densitate', lang: 'en' } } }))).toBeUndefined()
  })

  it('is cached publicly, keyed on the cookies the render follows', async () => {
    const { headers } = await route()
    headers()
    // The locale and theme cookies change the HTML: a shared cache that
    // ignored them would serve one reader's language to another.
    expect(createPublicPageCacheHeaders).toHaveBeenCalledWith({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
      vary: ['Accept-Encoding', 'Cookie'],
    })
  })

  it('describes the page with its own figures, a canonical link and a dataset', async () => {
    const built = await head()
    expect(metaOf(built, 'title')).toContain('Transparenta.eu')
    expect(metaOf(built, 'og:title')).toBe(metaOf(built, 'title'))
    expect(metaOf(built, 'description')).toBe(metaOf(built, 'og:description'))
    expect(metaOf(built, 'description')).toMatch(/^1\.749\.479 de firme în funcțiune, 153\.618 înființate în 2025/)
    expect(metaOf(built, 'robots')).toBe('index,follow')
    expect(metaOf(built, 'og:url')).toBe('https://transparenta.eu/companies')

    const [dataset, webPage] = built.scripts.map((script) => JSON.parse(script.children) as Record<string, unknown>)
    expect(dataset?.['@type']).toBe('Dataset')
    expect(dataset?.temporalCoverage).toBe('2025')
    expect(dataset?.isBasedOn).toContain('https://insse.ro')
    expect(webPage?.['@type']).toBe('WebPage')
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
