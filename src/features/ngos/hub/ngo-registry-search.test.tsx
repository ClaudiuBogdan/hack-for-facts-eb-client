import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegistryPage, RegistryRecord } from '../registry/api'
import { NgoRegistrySearch } from './ngo-registry-search'

const { fetchRegistryPage, navigate } = vi.hoisted(() => ({ fetchRegistryPage: vi.fn(), navigate: vi.fn() }))

vi.mock('../registry/api', () => ({ fetchRegistryPage }))

vi.mock('@tanstack/react-router', async () => {
  const { forwardRef } = await import('react')
  return {
    useNavigate: () => navigate,
    Link: forwardRef<
      HTMLAnchorElement,
      { readonly children?: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: Record<string, string>; readonly preload?: unknown }
    >(function Link({ children, to, params, search, preload: _preload, ...props }, ref) {
      let href = to
      for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
      if (search) href += `?${new URLSearchParams(search).toString()}`
      return (
        <a ref={ref} href={href} {...props}>
          {children}
        </a>
      )
    }),
  }
})

const snapshot = {
  id: 'snap',
  sourceDeclaredDate: null,
  importedAt: '2026-09-20T00:00:00Z',
  capturedAt: '2026-09-20T00:00:00Z',
  refreshOverdue: false,
  acceptedAt: null,
  recordCount: 3,
  isCurrent: true,
  sourceUrl: 'https://rnong.just.ro/registru-ong',
  coverageBasis: 'provided_artifact',
  nationalCompleteness: 'unverified',
}

function record(overrides: Partial<RegistryRecord>): RegistryRecord {
  return {
    id: 'row:1',
    sourceRowNumber: 1,
    registryNumber: '2401/A/2021',
    specialRegistryNumber: null,
    sourceRegistrationDate: '2021-03-01',
    category: 'association',
    legalForm: 'Asociație',
    name: 'ASOCIAȚIA SALVAȚI COPIII ȘI BUNICII',
    nameWithheld: false,
    court: 'Judecatoria DEJ',
    sourceRegistryStatus: 'Inregistrat',
    county: 'CLUJ',
    locality: 'DEJ',
    sourceCui: null,
    linkedOrganizationCui: null,
    isBranch: false,
    sourceReportsPublicUtility: false,
    snapshot,
    ...overrides,
  }
}

function page(records: readonly RegistryRecord[]): RegistryPage {
  return { edges: records.map((node) => ({ cursor: node.id, node })), pageInfo: { hasNextPage: false, endCursor: null }, snapshot }
}

const input = () => screen.getByRole('combobox', { name: 'Numele organizației sau numărul din registru' })

describe('NgoRegistrySearch', () => {
  beforeEach(() => {
    fetchRegistryPage.mockReset()
    navigate.mockReset()
  })

  it('asks for three letters before it asks the registry', async () => {
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'sa' } })
    // Shown in the list and announced by the live region.
    expect(await screen.findAllByText('Scrie cel puțin 3 litere.')).toHaveLength(2)
    expect(fetchRegistryPage).not.toHaveBeenCalled()
  })

  it('lists the registry’s matches by name, each opening its entry, with the status that matters to a donor', async () => {
    fetchRegistryPage.mockResolvedValue(
      page([
        record({}),
        record({ id: 'row:2', name: 'SALVATI COPIII', legalForm: 'Fundație', sourceRegistryStatus: 'Radiat', registryNumber: '4831/B/1996' }),
        record({ id: 'row:3', name: 'hidden', nameWithheld: true }),
      ]),
    )
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'salvati copiii' } })
    const options = await screen.findAllByRole('option')
    expect(fetchRegistryPage).toHaveBeenCalledWith(expect.objectContaining({ q: 'salvati copiii', registryNumber: '' }), expect.anything(), 6)
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveAttribute('href', '/ong-uri/registru/row:1')
    expect(options[0]).toHaveTextContent('Asociație · DEJ · CLUJ')
    expect(within(options[1] as HTMLElement).getByText(/radiat/)).toBeInTheDocument()
    expect(options[2]).toHaveTextContent('Nume în curs de verificare')
    expect(options[2]).not.toHaveTextContent('hidden')
    expect(screen.getByRole('link', { name: /Toate rezultatele din registru/ }).getAttribute('href')).toContain('q=salvati+copiii')
  })

  it('looks a registry number up exactly', async () => {
    fetchRegistryPage.mockResolvedValue(page([record({})]))
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: '2401/a/2021' } })
    await waitFor(() =>
      expect(fetchRegistryPage).toHaveBeenCalledWith(expect.objectContaining({ q: '', registryNumber: '2401/A/2021' }), expect.anything(), 6),
    )
  })

  it('opens the registry list for the query on Enter with no row chosen', async () => {
    fetchRegistryPage.mockResolvedValue(page([record({})]))
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'habitat' } })
    await screen.findAllByRole('option')
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(navigate).toHaveBeenCalledWith({ to: '/ong-uri/registru', search: expect.objectContaining({ q: 'habitat', registryNumber: '' }) })
  })

  it('lets Base UI open a highlighted row while the list answers the field', async () => {
    fetchRegistryPage.mockResolvedValue(page([record({})]))
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'habitat' } })
    await screen.findAllByRole('option')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    await waitFor(() => expect(input()).toHaveAttribute('aria-activedescendant'))
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('never opens a row left from the previous query: Enter then lists the field’s own matches', async () => {
    fetchRegistryPage.mockResolvedValueOnce(page([record({})])).mockReturnValue(new Promise(() => {}))
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'habitat' } })
    await screen.findAllByRole('option')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.change(input(), { target: { value: 'habitat far' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(navigate).toHaveBeenCalledWith({ to: '/ong-uri/registru', search: expect.objectContaining({ q: 'habitat far' }) })
  })

  it('says when the registry does not answer, stops the spinner, and retries on request', async () => {
    fetchRegistryPage.mockRejectedValue(new Error('down'))
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'habitat' } })
    expect(await screen.findByRole('button', { name: 'Încearcă din nou' })).toBeInTheDocument()
    expect(screen.getAllByText(/Registrul nu a răspuns\./)).toHaveLength(2)
    expect(document.querySelector('.animate-spin')).toBeNull()
    const calls = fetchRegistryPage.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    await waitFor(() => expect(fetchRegistryPage.mock.calls.length).toBeGreaterThan(calls))
  })

  it('says when the registry holds no match', async () => {
    fetchRegistryPage.mockResolvedValue(page([]))
    render(<NgoRegistrySearch />)
    fireEvent.change(input(), { target: { value: 'zzzqqq' } })
    expect(await screen.findAllByText('Niciun ONG cu „zzzqqq” în registru.')).toHaveLength(2)
  })
})
