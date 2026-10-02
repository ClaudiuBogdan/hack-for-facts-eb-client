import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { breakdownFixture, recordsFixture, releaseFixture, seriesFixture, statsFixture } from '../../api/company-analytics.fixture'
import { CompanyAnalyticsSeedContext, createSeedStore } from '../../hooks/use-company-analytics'
import { releaseOfKey } from '../../lib/company-analytics-keys'
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
      if (api.refuseRelease(call)) return Promise.reject(refusal('release'))
      if (api.refuseCursor(call)) return Promise.reject(refusal('after'))
      const release = { releaseId: String(variables.release ?? api.active), publishedAt: null, active: true }
      switch (call.op) {
        case 'CompanyAnalysisRelease':
          return Promise.resolve({ companyAnalysisRelease: releaseFixture({ release }) })
        case 'CompanyAnalysisStats':
          return Promise.resolve({ companyAnalysisStats: statsFixture({ release }) })
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
  const view = render(
    <QueryClientProvider client={client}>
      <CompanyAnalyticsSeedContext value={seeds}>
        <CompanyAnalyticsPage />
      </CompanyAnalyticsSeedContext>
    </QueryClientProvider>,
  )
  return { client, view }
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
})

describe('CompanyAnalyticsPage', () => {
  it('answers with exact figures, a figure nobody reported as such, and the companies themselves', async () => {
    renderPage()
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cifra de afaceri în România, anul fiscal 2024')
    // The turnover sum past 2^53, every digit (the matcher reads the no-break space as a space).
    expect(screen.getByText('9,007,199,254,741,973.32 lei')).toBeInTheDocument()
    expect(screen.getAllByText('nicio firmă nu a raportat o valoare').length).toBeGreaterThan(0)
    expect(await screen.findByText('Firma 1')).toBeInTheDocument()
    expect(screen.getByText('Fără denumire publică')).toBeInTheDocument()
    expect(screen.getByText('reținut: semnal de calitate')).toBeInTheDocument()
    expect(screen.getAllByText('fără situație pentru 2024').length).toBeGreaterThan(0)
    await waitFor(() => expect(api.calls.filter((call) => call.op !== 'CompanyAnalysisRelease').every((call) => call.variables.release === '7')).toBe(true))
  })

  it('pins the release it answered from into the next question', async () => {
    router.search = { lang: 'ro' }
    renderPage()
    await screen.findByText(FIGURES)
    fireEvent.click(screen.getByRole('button', { name: /Evoluție/u }))
    const { search } = router.navigate.mock.calls[0]![0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    expect(search(router.search)).toEqual({ lang: 'ro', vedere: 'evolutie', editie: 7 })
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
      { key: ['companies', 'analytics', 'release', '8'], data: releaseFixture({ release: { releaseId: '8', publishedAt: null, active: true } }) },
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
