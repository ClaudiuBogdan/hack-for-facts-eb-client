import { useState } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient } from '@/lib/queryClient'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'
import { SOURCE_EDITION_41 } from '../../api/company-analytics.fixture'
import { CompanyField, OnrcField } from './analytics-filter-fields'

/**
 * Two of the filters panel's fields, through the app's own query client:
 *
 * - the company picker under a registry pin of its own (the real provider,
 *   name-suggestion hook and resolver adapter over a scripted transport):
 *   names are asked — under the pin's confirmed scope — only while the
 *   directory reads the analysis release's own ONRC edition; otherwise, and
 *   after a refusal moved the directory, it says so and takes CUIs only, and
 *   a move of the directory moves nothing of the analysis;
 * - the ONRC observations of one identifier: each code read in its own
 *   domain (an exact CAEN only with its revision, never guessed), the
 *   supported exclusions and no exact-revision one.
 */

const transport = vi.hoisted(() => ({
  capabilities: [] as (() => Promise<unknown>)[],
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
        const next = transport.capabilities.length > 1 ? transport.capabilities.shift() : transport.capabilities[0]
        if (!next) throw new Error('unscripted registry read')
        return { companyRegistry: await next() }
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

/** The directory reading ONRC edition 41 (publication 3) — the analysis release's own — or 42 (publication 4). */
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
const scopeRefusal = () =>
  Promise.reject(
    new GraphQLRequestError('GraphQL errors', {
      graphQLErrors: [{ message: 'company registry scope changed (publication, rollback, withdrawal or access) since registryScope was issued; read the current scope and resolve again', extensions: { code: 'INVALID_INPUT' } }],
    }),
  )

let client: QueryClient
let changes: CompanyAnalysisScope[] = []

function renderPicker() {
  return render(
    <QueryClientProvider client={client}>
      <CompanyField scope={{}} max={500} source={SOURCE_EDITION_41} onChange={(scope) => changes.push(scope)} />
    </QueryClientProvider>,
  )
}

const type = (text: string) => fireEvent.change(screen.getByRole('combobox', { name: 'Adaugă o firmă' }), { target: { value: text } })
/** Past the name field's debounce (300 ms): long enough for a read to have started, were one asked. */
const pastDebounce = () => act(() => new Promise((done) => setTimeout(done, 450)))

beforeEach(() => {
  client = createQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
  transport.capabilities = []
  transport.registryReads = 0
  transport.resolves = []
  transport.resolve = () => Promise.resolve(null)
  changes = []
})

describe('CompanyField — names only from the analysis release’s own ONRC edition', () => {
  it('offers the directory’s names under its confirmed scope while it reads the same edition and publication', async () => {
    transport.capabilities = [capabilities(S41)]
    transport.resolve = named(S41)
    renderPicker()
    await waitFor(() => expect(transport.registryReads).toBe(1))
    type('danubius')
    fireEvent.click(await screen.findByText('DANUBIUS SRL'))
    // The resolver was asked under the directory's confirmed scope, and its typed envelope accepted for it.
    expect(transport.resolves).toEqual([{ dim: 'NAME', q: 'danubius', limit: 8, registryScope: S41 }])
    expect(changes).toEqual([{ cuis: ['14399840'] }])
    expect(screen.queryByTestId('companies-analytics-names-unavailable')).not.toBeInTheDocument()
  })

  it('asks no name of a directory reading another edition: it says so and takes a CUI as typed', async () => {
    transport.capabilities = [capabilities(S42)]
    transport.resolve = named(S42)
    renderPicker()
    expect(await screen.findByTestId('companies-analytics-names-unavailable')).toHaveTextContent('directorul de firme citește altă ediție ONRC (42) decât analiza (41)')
    type('danubius')
    await pastDebounce()
    expect(transport.resolves).toEqual([])
    expect(screen.queryByText('DANUBIUS SRL')).not.toBeInTheDocument()
    type('RO 14399840')
    fireEvent.click(await screen.findByText('CUI 14399840'))
    expect(changes).toEqual([{ cuis: ['14399840'] }])
  })

  it('says a directory that moved after a refused name read, moves only the picker on the reader’s click, and then offers no name of the other edition', async () => {
    transport.capabilities = [capabilities(S41), capabilities(S42)]
    transport.resolve = scopeRefusal
    renderPicker()
    await waitFor(() => expect(transport.registryReads).toBe(1))
    type('danubius')
    // The refusal re-reads the directory's registry, which answers another edition: said, never followed by itself.
    const accept = await screen.findByRole('button', { name: 'Arată datele actuale' })
    expect(transport.registryReads).toBe(2)
    expect(transport.resolves).toHaveLength(1)
    fireEvent.click(accept)
    expect(await screen.findByTestId('companies-analytics-names-unavailable')).toHaveTextContent('(42) decât analiza (41)')
    await pastDebounce()
    // Nothing of the analysis moved: no company chosen, no further name asked.
    expect(changes).toEqual([])
    expect(transport.resolves).toHaveLength(1)
  })
})

describe('OnrcField — the observations of one ONRC identifier', () => {
  let latest: CompanyAnalysisScope = {}

  function Harness() {
    const [scope, setScope] = useState<CompanyAnalysisScope>({})
    latest = scope
    return <OnrcField scope={scope} limits={{ statuses: 60, counties: 60, caen: 200, legalForms: 30 }} statusNames={new Map([['1048', 'funcțiune']])} onChange={setScope} />
  }

  const add = (label: string, text: string) => {
    const input = screen.getByRole('textbox', { name: label })
    fireEvent.change(input, { target: { value: text } })
    fireEvent.submit(input.closest('form')!)
  }

  beforeEach(() => {
    latest = {}
  })

  it('writes a status, a county, a broad and an exact CAEN for the same identifier, each in its own domain', () => {
    render(<Harness />)
    add('Cu starea', '1048')
    add('În județul', 'cj')
    add('Cu CAEN (orice revizie)', '6201')
    add('Cu CAEN exact', 'REV2:6201')
    expect(latest.onrc).toEqual({ status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: ['rev2:6201'] })
    expect(screen.getByText('1048 · funcțiune')).toBeInTheDocument()
    expect(screen.getByText('6201 (orice revizie)')).toBeInTheDocument()
  })

  it('never guesses a revision: an exact CAEN without one is said, not written', () => {
    render(<Harness />)
    add('Cu CAEN exact', '6201')
    expect(screen.getByRole('alert')).toHaveTextContent('revizia nu e ghicită')
    expect(latest.onrc).toBeUndefined()
  })

  it('offers the supported exclusions and no exact-revision one, and drops the filter with its last value', () => {
    render(<Harness />)
    expect(screen.queryByRole('textbox', { name: /Fără CAEN exact/u })).not.toBeInTheDocument()
    add('Fără starea', '1070')
    add('Fără CAEN (orice revizie)', '4711')
    expect(latest.onrc).toEqual({ exclude: { status: ['1070'], caenCode: ['4711'] } })
    fireEvent.click(screen.getByRole('button', { name: 'Scoate 1070' }))
    fireEvent.click(screen.getByRole('button', { name: 'Scoate 4711' }))
    expect(latest.onrc).toBeUndefined()
  })
})
