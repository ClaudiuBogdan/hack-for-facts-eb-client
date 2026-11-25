import { describe, expect, it, vi } from 'vitest'
import { parseProcurementContractAwardWinnerSearch } from '@/schemas/procurement-contract-award-winner'

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (message: unknown) => String(message) }) }))

const { Route } = await import('./contract-awards/winners/$cui')

const route = Route as unknown as {
  readonly loader?: unknown
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string } } }) => { readonly meta: readonly Record<string, string>[] }
}

/** `/procurement/contract-awards/winners/$cui` (KB0Z): read in the browser only, kept in no cache and from search engines. */
describe('contract-award winner route', () => {
  it('reads nothing on the server, so a refused code and a served one render alike', () => {
    expect(route.loader).toBeUndefined()
  })

  it('keeps no render in any cache, and every render from search engines', () => {
    const headers = route.headers()
    expect(headers['Cache-Control']).toContain('no-store')
    expect(headers['CDN-Cache-Control']).toBe('no-store')
    expect(route.head({ match: { context: { locale: 'ro' } } }).meta).toContainEqual({ name: 'robots', content: 'noindex' })
  })

  it('keeps a year from 2021, the order and the page, the defaults and anything unusable left out', () => {
    expect(parseProcurementContractAwardWinnerSearch({ year: '2024', ordine: 'valoare', pagina: '3' })).toEqual({ year: 2024, ordine: 'valoare', pagina: 3 })
    expect(parseProcurementContractAwardWinnerSearch({ year: '2020', ordine: 'noi', pagina: '1' })).toEqual({})
    expect(parseProcurementContractAwardWinnerSearch({ year: 'x', ordine: 'oricare', pagina: '501' })).toEqual({})
  })
})
