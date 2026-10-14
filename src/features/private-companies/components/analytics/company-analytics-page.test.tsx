import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanyAnalysisMetricAggregate } from '@/schemas/company-analytics'
import { aggregate, breakdownFixture, recordsFixture, releaseFixture, releaseRef, seriesFixture, statsFixture } from '../../api/company-analytics.fixture'
import { CompanyAnalyticsSeedContext, createSeedStore } from '../../hooks/use-company-analytics'
import { companyAnalyticsKeys, releaseOfKey } from '../../lib/company-analytics-keys'
import { CompanyAnalyticsPage } from './company-analytics-page'

/**
 * The page against a fake API that can withdraw its release at any read. A
 * refusal by ANY read — the release, the figures, a panel, the list's next
 * page, a filter's options — withdraws every figure of the page at once and
 * says so; nothing from another release takes its place, nothing is read in
 * its place, and only the reader's click moves to the current release, with
 * the same question and language, read from the start. A refused cursor
 * stays the list's own business.
 */

const router = vi.hoisted(() => ({ search: {} as Record<string, unknown>, navigate: vi.fn() }))

interface Call {
  readonly op: string
  readonly variables: Record<string, unknown>
}

const api = vi.hoisted(() => ({
  calls: [] as Call[],
  /** The release the API serves as active. */
  active: '7',
  /** Which reads the API refuses for their release. */
  refuseRelease: (() => false) as (call: Call) => boolean,
  /** Which reads the API refuses for their cursor. */
  refuseCursor: (() => false) as (call: Call) => boolean,
  /** Which reads the API answers SERVICE_UNAVAILABLE (no v2 release published yet). */
  unavailable: (() => false) as (call: Call) => boolean,
  /** The figures' aggregates, when a test names them (else the fixture's). */
  metrics: null as readonly CompanyAnalysisMetricAggregate[] | null,
}))

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => router.search,
  useNavigate: () => router.navigate,
  Link: ({ children, to, className }: { readonly children: ReactNode; readonly to: string; readonly className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  const refusal = (field: string) => new actual.GraphQLRequestError('refused', { graphQLErrors: [{ message: 'refused', extensions: { code: 'INVALID_INPUT', field } }] })
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      const call = { op: options.operationName, variables }
      api.calls.push(call)
      if (api.unavailable(call))
        return Promise.reject(new actual.GraphQLRequestError('unavailable', { graphQLErrors: [{ message: 'the active companies analytics release cannot be served: schema companies-analytics-ch-v1', extensions: { code: 'SERVICE_UNAVAILABLE' } }] }))
      if (api.refuseRelease(call)) return Promise.reject(refusal('release'))
      if (api.refuseCursor(call)) return Promise.reject(refusal('after'))
      const release = releaseRef(String(variables.release ?? api.active), { publishedAt: null })
      switch (call.op) {
        case 'CompanyAnalysisRelease':
          return Promise.resolve({ companyAnalysisRelease: releaseFixture({ release }) })
        case 'CompanyAnalysisStats':
          return Promise.resolve({ companyAnalysisStats: statsFixture({ release, ...(api.metrics ? { metrics: [...api.metrics] } : {}) }) })
        case 'CompanyAnalysisRecords':
          return Promise.resolve({ companyAnalysisRecords: recordsFixture({ release }) })
        case 'CompanyAnalysisBreakdown':
          return Promise.resolve({ companyAnalysisBreakdown: breakdownFixture({ release }) })
        case 'CompanyAnalysisSeries':
          return Promise.resolve({ companyAnalysisSeries: seriesFixture({ release }) })
        default:
          return Promise.reject(new Error(`unexpected ${call.op}`))
      }
    },
  }
})

function renderPage(seed: readonly { readonly key: readonly unknown[]; readonly data: unknown }[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const seeds = createSeedStore(seed)
  const tree = () => (
    <QueryClientProvider client={client}>
      <CompanyAnalyticsSeedContext value={seeds}>
        <CompanyAnalyticsPage />
      </CompanyAnalyticsSeedContext>
    </QueryClientProvider>
  )
  const view = render(tree())
  // The address changed (the mocked router's search): the page as the router would render it again.
  const rerender = () => view.rerender(tree())
  return { client, view, rerender }
}

/** The figures of a loaded answer, as a reader sees them. */
const FIGURES = '2,718,250'

function expectWithdrawn(pin: string) {
  expect(screen.getByText(`Ediția ${pin} a analizei nu mai este disponibilă`)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Deschide ediția curentă' })).toBeInTheDocument()
  // No figure, list, panel, count or source line of the release stays on screen.
  expect(screen.queryByText(FIGURES)).not.toBeInTheDocument()
  expect(screen.queryByText('Firme eligibile în selecție')).not.toBeInTheDocument()
  expect(screen.queryByText('Firma 1')).not.toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByText(/situații/u)).not.toBeInTheDocument()
  expect(screen.queryByText(/Surse:/u)).not.toBeInTheDocument()
}

/** The active release read after the page loaded: never, without the reader's click. */
const activeReads = () => api.calls.filter((call) => call.op === 'CompanyAnalysisRelease' && call.variables.release === undefined).length

beforeEach(() => {
  router.search = {}
  router.navigate.mockReset()
  router.navigate.mockResolvedValue(undefined)
  api.calls = []
  api.active = '7'
  api.refuseRelease = () => false
  api.refuseCursor = () => false
  api.unavailable = () => false
  api.metrics = null
})

describe('CompanyAnalyticsPage', () => {
  it('answers with exact figures, a figure nobody reported as such, and the companies themselves', async () => {
    renderPage()
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Firmele, în 2024')
    // The turnover sum past 2^53, every digit (the matcher reads the no-break space as a space).
    expect(screen.getAllByText('9,007,199,254,741,973.32 lei').length).toBeGreaterThan(0)
    expect(await screen.findByText('Firma 1')).toBeInTheDocument()
    expect(screen.getByText('Fără denumire publică')).toBeInTheDocument()
    // A held value is a marked dash, its reason said in the cell (to a screen reader) and once under the table.
    const held = screen.getAllByText('reținut: semnal de calitate')
    expect(held.map((element) => element.tagName)).toEqual(['SPAN', 'LI'])
    expect(held[0]).toHaveClass('sr-only')
    expect(held[1]).toHaveTextContent('1reținut: semnal de calitate')
    // A company without a statement says so once, in the measure's column.
    expect(screen.getAllByText('fără bilanț')).toHaveLength(1)
    await waitFor(() => expect(api.calls.filter((call) => call.op !== 'CompanyAnalysisRelease').every((call) => call.variables.release === '7')).toBe(true))
  })

  it('says what „cu bilanț” counts: a statement in the standard history, never proof that a company did not file (D5)', async () => {
    renderPage()
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^(Despre aceste cifre|\d+ (de )?atenționăr?i?e?)$/u }))
    expect(
      await screen.findByText('„Cu bilanț” înseamnă o situație financiară în istoricul standard al platformei. Situațiile publicate doar în format lung nu sunt numărate aici, așa că „fără bilanț” nu dovedește că firma nu a depus.'),
    ).toBeInTheDocument()
    expect(screen.getByText('O valoare lipsă nu e zero: o firmă fără bilanț în istoricul standard nu are cifre pentru acel an.')).toBeInTheDocument()
  })

  it('says a measure nobody reported is not reported — a dash with its reason, never a zero', async () => {
    router.search = { indicator: 'employees' }
    renderPage()
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(within(figures).getAllByText('nicio firmă nu a raportat o valoare').length).toBe(2)
    expect(within(figures).queryByText(/^0$/u)).not.toBeInTheDocument()
  })

  it('keeps an employee mean’s fraction: 0.43 a company is not none', async () => {
    router.search = { indicator: 'employees' }
    api.metrics = [{ ...aggregate('EMPLOYEES', '299616', '691828'), mean: '0.43' }]
    renderPage()
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(within(figures).getByText('0.43')).toBeInTheDocument()
    expect(within(figures).getByText('299,616')).toBeInTheDocument()
  })

  it('lists each company with why it has no common county or status, the date ONRC recorded as its civil date, and where the names come from', async () => {
    renderPage()
    await screen.findByText('Firma 2')
    const line = (cui: string) => screen.getByText(new RegExp(`^CUI ${cui} · `, 'u')).textContent
    expect(line('1')).toBe('CUI 1 · SRL · Cluj-Napoca, Cluj · funcțiune · înregistrată la ONRC pe 15 March 2010')
    expect(line('2')).toBe('CUI 2 · SRL · fără județ comun (valori diferite în înscrieri) · fără stare comună (observații incomplete) · înregistrată la ONRC pe 1 January 0001')
    expect(line('3')).toBe('CUI 3 · SRL · Cluj-Napoca, Cluj · funcțiune')
    expect(screen.getByText(/Denumirile firmelor sunt cele publice actuale din directorul platformei, nu cele din ediția ONRC\./u)).toHaveTextContent(
      'Județe, localități, stări: nomenclatorul teritorial al platformei; nomenclatorul stărilor al aplicației, nu etichete publicate de ONRC.',
    )
    expect(document.body.textContent).not.toMatch(/registrationYear|anul înregistrării/u)
  })

  it('names the ONRC edition the release was exported from, with ONRC’s publication date as it was written', async () => {
    renderPage()
    expect(await screen.findByTestId('companies-analytics-source-edition')).toHaveTextContent('ediția ONRC 41, publicată de ONRC pe 30 September 2026')
  })

  it('says analytics is unavailable before a v2 release is published — never a zero, never a figure', async () => {
    api.unavailable = (call) => call.op === 'CompanyAnalysisRelease'
    renderPage()
    expect(await screen.findByText('Analiza firmelor nu este disponibilă acum')).toBeInTheDocument()
    expect(screen.queryByText(FIGURES)).not.toBeInTheDocument()
    expect(screen.queryByText('Firme eligibile în selecție')).not.toBeInTheDocument()
    // The release read is retried as any transient failure; nothing else is read.
    expect(api.calls.every((call) => call.op === 'CompanyAnalysisRelease')).toBe(true)
  })

  it('withdraws every figure when the figures themselves are refused — as after a completed operation the release went stale', async () => {
    api.refuseRelease = (call) => call.op === 'CompanyAnalysisStats'
    renderPage()
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    expectWithdrawn('7')
    expect(activeReads()).toBe(1)
  })

  it('pins the release it answered from into the next question', async () => {
    router.search = { lang: 'ro' }
    renderPage()
    await screen.findByText(FIGURES)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'În timp' }))
    const { search } = router.navigate.mock.calls[0]![0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    expect(search(router.search)).toEqual({ lang: 'ro', vedere: 'evolutie', editie: 7 })
  })

  it('walks the answer’s tabs by keyboard: an arrow moves the focus only, Enter opens the tab', async () => {
    router.search = { lang: 'ro' }
    renderPage()
    await screen.findByText(FIGURES)
    const first = screen.getByRole('tab', { name: 'Firmele' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', first.id)
    // One stop for Tab, not one per tab (the list hands its focus to the tab shown).
    expect(screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0).length).toBeLessThanOrEqual(1)
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    const next = screen.getByRole('tab', { name: 'Județe' })
    await waitFor(() => expect(next).toHaveFocus())
    expect(router.navigate).not.toHaveBeenCalled()
    fireEvent.keyDown(next, { key: 'Enter' })
    const { search } = router.navigate.mock.calls[0]![0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    expect(search(router.search)).toEqual({ lang: 'ro', vedere: 'defalcare', editie: 7 })
  })

  it('shows the answer as a table, a map or charts from the pinned bar, the choice written in the address', async () => {
    router.search = { lang: 'ro' }
    renderPage()
    await screen.findByText(FIGURES)
    const modes = screen.getByRole('navigation', { name: 'Cum se arată răspunsul' })
    expect(within(modes).getByRole('button', { name: 'Tabel' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(modes).getByRole('button', { name: 'Hartă' }))
    const { search } = router.navigate.mock.calls[0]![0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    expect(search(router.search)).toEqual({ lang: 'ro', mod: 'harta', editie: 7 })
  })

  it('answers the first pinned question from the release it already read: nothing is read again, nothing empties', async () => {
    const { rerender } = renderPage()
    await screen.findByText(FIGURES)
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/u }))
    const sheet = await screen.findByRole('dialog')
    // The first question asked pins the release it was answered from (above): the same question, now pinned.
    router.search = { editie: 7 }
    rerender()
    // Not a frame without the figures, nor without the panel's statement fields (a pick there would jump under the pointer).
    expect(screen.getByText(FIGURES)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBe(sheet)
    expect(screen.getByRole('group', { name: 'Mărime' })).toBeInTheDocument()
    await waitFor(() => expect(api.calls.some((call) => call.op === 'CompanyAnalysisStats')).toBe(true))
    expect(api.calls.filter((call) => call.op === 'CompanyAnalysisRelease').map((call) => call.variables.release)).toEqual([undefined])
  })

  it('never answers a refused pin from the release the page read before it was refused', async () => {
    const { client, rerender } = renderPage()
    await screen.findByText(FIGURES)
    await screen.findByText('Firma 1')
    api.refuseRelease = (call) => call.variables.release === '7'
    fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }))
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    router.search = { editie: 7 }
    rerender()
    expectWithdrawn('7')
    expect(api.calls.filter((call) => call.op === 'CompanyAnalysisRelease').map((call) => call.variables.release)).toEqual([undefined])
    // Nor kept under its pin, for a later render to find.
    expect(client.getQueryData(companyAnalyticsKeys.release('7'))).toBeUndefined()
  })

  it('hands the release it read over to its pin once: a pinned answer dropped since is read from the API', async () => {
    const { client, rerender } = renderPage()
    await screen.findByText(FIGURES)
    router.search = { editie: 7 }
    rerender()
    expect(screen.getByText(FIGURES)).toBeInTheDocument()
    // Back to the unpinned question, long enough for the pinned answer to be collected.
    router.search = {}
    rerender()
    client.removeQueries({ queryKey: companyAnalyticsKeys.release('7'), exact: true })
    router.search = { editie: 7 }
    rerender()
    await waitFor(() => expect(api.calls.filter((call) => call.op === 'CompanyAnalysisRelease').map((call) => call.variables.release)).toEqual([undefined, '7']))
  })

  it('clears a list’s search on Escape, and closes the filters on the next', async () => {
    renderPage()
    await screen.findByText(FIGURES)
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/u }))
    const search = await screen.findByRole('textbox', { name: 'Caută: Formă juridică' })
    // Typed into, as a reader does: the field has the focus.
    act(() => search.focus())
    fireEvent.change(search, { target: { value: 'srl' } })
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(search).toHaveValue('')
    fireEvent.keyDown(search, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says a pinned release is gone when the release itself is refused, and reads nothing else', async () => {
    router.search = { editie: 6, judet: 'CJ', lang: 'en' }
    api.refuseRelease = (call) => call.variables.release === '6'
    renderPage()
    await screen.findByText('Ediția 6 a analizei nu mai este disponibilă')
    expectWithdrawn('6')
    expect(api.calls.map((call) => [call.op, call.variables.release])).toEqual([['CompanyAnalysisRelease', '6']])
  })

  it('withdraws every figure when only the next page of the list is refused', async () => {
    renderPage()
    await screen.findByText(FIGURES)
    await screen.findByText('Firma 1')
    api.refuseRelease = (call) => call.op === 'CompanyAnalysisRecords' && call.variables.after === 'c3'
    fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }))
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    expectWithdrawn('7')
    expect(activeReads()).toBe(1)
  })

  it('withdraws every figure when the breakdown is refused', async () => {
    router.search = { vedere: 'defalcare' }
    api.refuseRelease = (call) => call.op === 'CompanyAnalysisBreakdown'
    renderPage()
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    expectWithdrawn('7')
  })

  it('withdraws every figure when the series is refused', async () => {
    router.search = { vedere: 'evolutie' }
    api.refuseRelease = (call) => call.op === 'CompanyAnalysisSeries'
    renderPage()
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    expectWithdrawn('7')
  })

  it('withdraws every figure when a filter’s options are refused, and closes the filters with them', async () => {
    renderPage()
    await screen.findByText(FIGURES)
    api.refuseRelease = (call) => call.op === 'CompanyAnalysisBreakdown' && call.variables.dimension === 'LEGAL_FORM'
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/u }))
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    expectWithdrawn('7')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps a refused cursor the list’s own business: the figures stay and the list offers to start over', async () => {
    renderPage()
    await screen.findByText('Firma 1')
    api.refuseCursor = (call) => call.op === 'CompanyAnalysisRecords' && call.variables.after === 'c3'
    fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }))
    expect(await screen.findByRole('button', { name: 'Începe lista de la capăt' })).toBeInTheDocument()
    expect(screen.getByText(FIGURES)).toBeInTheDocument()
    expect(screen.queryByText('Ediția 7 a analizei nu mai este disponibilă')).not.toBeInTheDocument()
  })

  it('drops the cached answers of a withdrawn release, so a remount reads the API again', async () => {
    const { client } = renderPage()
    await screen.findByText(FIGURES)
    await screen.findByText('Firma 1')
    api.refuseRelease = (call) => call.op === 'CompanyAnalysisRecords' && call.variables.after === 'c3'
    fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }))
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    await waitFor(() => {
      const kept = client.getQueryCache().findAll().filter((query) => releaseOfKey(query.queryKey) === '7' && query.state.data !== undefined)
      expect(kept.map((query) => query.queryKey[2])).toEqual([])
    })
  })

  it('never seeds a withdrawn release again: a server seed is taken once, and forgotten on refusal', async () => {
    const seeds = createSeedStore([
      { key: ['companies', 'analytics', 'stats', '7', {}, []], data: { seeded: true } },
      { key: ['companies', 'analytics', 'release', 'active'], data: releaseFixture() },
      { key: ['companies', 'analytics', 'release', '8'], data: releaseFixture({ release: releaseRef('8', { publishedAt: null }) }) },
    ])
    expect(seeds.take(['companies', 'analytics', 'stats', '7', {}, []])).toEqual({ found: true, data: { seeded: true } })
    expect(seeds.take(['companies', 'analytics', 'stats', '7', {}, []])).toEqual({ found: false })
    seeds.forget('7')
    // The active release's seed was release 7: forgotten with it; another release's stays.
    expect(seeds.take(['companies', 'analytics', 'release', 'active']).found).toBe(false)
    expect(seeds.take(['companies', 'analytics', 'release', '8']).found).toBe(true)
  })

  it('moves to the current release only on the reader’s click: same question, same language, read from the start', async () => {
    router.search = { lang: 'en', judet: 'CJ' }
    const { client } = renderPage()
    await screen.findByText(FIGURES)
    await screen.findByText('Firma 1')
    // Release 7 is withdrawn and 8 published: the page learns it from its next read.
    api.active = '8'
    api.refuseRelease = (call) => call.variables.release === '7'
    fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }))
    await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')
    expectWithdrawn('7')
    // Nothing follows the publication by itself.
    expect(activeReads()).toBe(1)
    expect(api.calls.some((call) => call.variables.release === '8')).toBe(false)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deschide ediția curentă' }))
    })
    const { search } = router.navigate.mock.lastCall![0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    // The same question in the same language, with no pin: the current release answers it.
    expect(search({ ...router.search, editie: 7 })).toEqual({ lang: 'en', judet: 'CJ' })
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    expect(screen.queryByText('Ediția 7 a analizei nu mai este disponibilă')).not.toBeInTheDocument()
    expect(activeReads()).toBe(2)
    expect(api.calls.some((call) => call.op === 'CompanyAnalysisStats' && call.variables.release === '8')).toBe(true)
    // Nothing of release 7 is kept once the page has left it.
    await waitFor(() => expect(client.getQueryCache().findAll().filter((query) => releaseOfKey(query.queryKey) === '7')).toEqual([]))
  })
})
