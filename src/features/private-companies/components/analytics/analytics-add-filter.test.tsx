import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/lib/queryClient'
import { releaseFixture } from '../../api/company-analytics.fixture'
import { DEFAULT_STATE, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { AddFilter } from './analytics-add-filter'

/**
 * „+ Adaugă un filtru" through the app's own query client, the real registry
 * provider, name-suggestion hook and resolver adapter over a scripted
 * transport: the box asks for company names under a registry pin of its own,
 * and only while the directory reads the analysis release's ONRC edition;
 * otherwise it says why and still takes a CUI.
 */

const transport = vi.hoisted(() => ({
  capabilities: null as (() => Promise<unknown>) | null,
  registryReads: 0,
  resolve: (_variables: Record<string, unknown>): Promise<unknown> => Promise.resolve(null),
  resolves: [] as Record<string, unknown>[],
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: vi.fn(async (query: string, variables: Record<string, unknown> = {}) => {
      if (query.includes('companyRegistry {')) {
        transport.registryReads += 1
        if (!transport.capabilities) throw new Error('unscripted registry read')
        return { companyRegistry: await transport.capabilities() }
      }
      if (query.includes('companyResolveResult(')) {
        transport.resolves.push(variables)
        return transport.resolve(variables)
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`)
    }),
  }
})
vi.mock('../../lib/mock-mode', () => ({ isPrivateCompanyMockEnabled: () => false }))
// The localities' files are not this test's: none are read.
vi.mock('../../hooks/use-uat-index', () => ({
  useUatIndex: () => ({ index: { localities: null }, localities: null, names: new Map(), loading: false, failed: false, retry: () => undefined }),
}))

/** The directory reading ONRC edition 41 (publication 3) — the release fixture's own — or 42 (publication 4). */
const S41 = 'onrc:published:41:3:11'
const S42 = 'onrc:published:42:4:12'
const envelope = (scopeKey: string) => ({
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: scopeKey === S42 ? '42' : '41',
  sourceSnapshotId: 'onrc-2026-09-30',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-edition-v1',
  dimensionPolicyVersion: 'onrc-dimensions-v1',
  eligibilityPolicyVersion: 'public-legal-person-v1',
  publicationEpoch: scopeKey === S42 ? '4' : '3',
  accessEpoch: scopeKey === S42 ? '12' : '11',
  reason: null,
  scopeKey,
})
const capabilities = (scopeKey: string) => () => Promise.resolve({ registry: envelope(scopeKey), editions: [], registryFilterFields: [], caenRevisions: [] })
const named = (scopeKey: string) => () =>
  Promise.resolve({
    companyResolveResult: {
      hits: [{ dim: 'NAME', value: '14399840', label: 'DANUBIUS SRL', cui: '14399840', confidence: 0.9, revision: null, key: null, labelSource: 'core_organization' }],
      degraded: false,
      ambiguous: false,
      registry: envelope(scopeKey),
      scopeKey,
    },
  })

let client: QueryClient
let moves: CompanyAnalyticsState[] = []

function renderBox() {
  render(
    <QueryClientProvider client={client}>
      <AddFilter page={{ state: DEFAULT_STATE, live: releaseFixture(), question: null, move: (next) => void moves.push(next) }} trigger="Adaugă un filtru" triggerClassName="" />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Adaugă un filtru' }))
}

const type = (text: string) => fireEvent.change(screen.getByPlaceholderText('Județ, localitate, formă, stare, firmă…'), { target: { value: text } })
/** Past the name search's debounce (300 ms): long enough for a read to have started, were one asked. */
const pastDebounce = () => act(() => new Promise((done) => setTimeout(done, 450)))

beforeEach(() => {
  client = createQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
  transport.capabilities = null
  transport.registryReads = 0
  transport.resolves = []
  transport.resolve = () => Promise.resolve(null)
  moves = []
})

describe('AddFilter — company names only from the analysis release’s own ONRC edition', () => {
  it('finds a company by name under the directory’s confirmed scope and adds it to the selection', async () => {
    transport.capabilities = capabilities(S41)
    transport.resolve = named(S41)
    renderBox()
    await waitFor(() => expect(transport.registryReads).toBe(1))
    type('danubius')
    fireEvent.click(await screen.findByText('DANUBIUS SRL'))
    expect(transport.resolves).toEqual([{ dim: 'NAME', q: 'danubius', limit: 8, registryScope: S41 }])
    expect(moves.map((state) => state.scope.cuis)).toEqual([['14399840']])
  })

  it('asks no name of a directory reading another edition: it says why, and a CUI still adds a company', async () => {
    transport.capabilities = capabilities(S42)
    transport.resolve = named(S42)
    renderBox()
    await waitFor(() => expect(transport.registryReads).toBe(1))
    type('danubius')
    expect(await screen.findByText(/directorul de firme citește altă ediție ONRC \(42\) decât analiza \(41\)/)).toBeInTheDocument()
    await pastDebounce()
    expect(transport.resolves).toEqual([])
    expect(screen.queryByText('DANUBIUS SRL')).not.toBeInTheDocument()
    type('14399840')
    fireEvent.click(await screen.findByText('CUI 14399840'))
    expect(moves.map((state) => state.scope.cuis)).toEqual([['14399840']])
  })

  it('says a name search that failed, with a retry, and never that nothing was found', async () => {
    transport.capabilities = capabilities(S41)
    transport.resolve = () => Promise.reject(new Error('the search engine is down'))
    renderBox()
    await waitFor(() => expect(transport.registryReads).toBe(1))
    type('danubius')
    // The hook retries twice (1 s, then 2 s) before it fails.
    expect(await screen.findByText('Căutarea nu a mers.', undefined, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.queryByText('Nimic găsit.')).not.toBeInTheDocument()
    transport.resolve = named(S41)
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
    expect(await screen.findByText('DANUBIUS SRL')).toBeInTheDocument()
  }, 15000)
})
