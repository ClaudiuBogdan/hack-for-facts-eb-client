import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { createTestQueryClient, fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import COUNTS from '../data/registry-counts.json'
import { tallyOfCounts, tallyToData, type RegistryCounts } from '../counts'
import { EMPTY_QUERY, selectionKey, type RegistryQuery } from '../model'
import { row, snapshot } from '../test/fixtures'
import { NgoRegistryListPage } from './registry-list-page'

const api = vi.hoisted(() => ({ fetchRegistryRecords: vi.fn() }))
vi.mock('../api', () => api)
vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params: _params,
    search: _search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: unknown
    readonly search?: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

i18n.load('ro', {})
i18n.activate('ro')

const CLUJ_RADIATE: RegistryQuery = { ...EMPTY_QUERY, county: 'CLUJ', status: 'deregistered' }
const rows = Array.from({ length: 30 }, (_, index) =>
  row({
    id: `r${index}`,
    registryNumber: `${index + 1}/A/2020`,
    name: `ASOCIATIA ${index}`,
    county: 'CLUJ',
    locality: 'CLUJ-NAPOCA',
    sourceRegistryStatus: 'Radiat',
  }),
)
const firstPage = { edges: rows.map((node, index) => ({ cursor: String(index), node })), pageInfo: { hasNextPage: true, endCursor: '29' }, snapshot }
const seedOf = (query: RegistryQuery) => ({
  key: selectionKey(query),
  page: firstPage,
  tally: tallyToData(tallyOfCounts(COUNTS as unknown as RegistryCounts, query)!, query.county !== null),
  readAt: Date.now(),
})

const onSearch = vi.fn()
const renderPage = (search: Record<string, string>, query: RegistryQuery | null) =>
  render(<NgoRegistryListPage search={search} seed={query ? seedOf(query) : null} onSearch={onSearch} />, { queryClient: createTestQueryClient() })

describe('NgoRegistryListPage', () => {
  beforeEach(() => {
    onSearch.mockReset()
    api.fetchRegistryRecords.mockReset()
    api.fetchRegistryRecords.mockResolvedValue({ edges: [], pageInfo: { hasNextPage: false, endCursor: null }, snapshot })
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('asks the question as its headline and answers it from the server’s read at once: figures, statuses, records', () => {
    renderPage({ county: 'CLUJ', status: 'Radiat' }, CLUJ_RADIATE)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ONG-urile radiate din județul Cluj')
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(within(figures).getByText('354')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Radiate/, pressed: true })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /ASOCIATIA/ })).toHaveLength(25)
  })

  it('splits the selection on the axes its filters leave open, and narrows to a row the address can say', () => {
    renderPage({ county: 'CLUJ', status: 'Radiat' }, CLUJ_RADIATE)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Înregistrări', 'Pe localități', 'Pe forme', 'Pe ani'])
    fireEvent.click(screen.getByRole('tab', { name: 'Pe forme' }))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('button', { name: /Asociații/ })).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: /Fundații/ }))
    expect(onSearch).toHaveBeenCalledWith({ ...CLUJ_RADIATE, category: 'foundation' })
  })

  it('moves between the tabs with the arrow keys, one tab stop', () => {
    renderPage({ county: 'CLUJ', status: 'Radiat' }, CLUJ_RADIATE)
    const records = screen.getByRole('tab', { name: 'Înregistrări' })
    expect(records).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Pe forme' })).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(records, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Pe localități' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps every filter in a sheet that stays open while it changes the question', () => {
    const { rerender } = renderPage({ status: 'Radiat' }, null)
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/ }))
    const sheet = screen.getByRole('dialog')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Dizolvate' }))
    expect(onSearch).toHaveBeenLastCalledWith({ ...EMPTY_QUERY, status: 'dissolved' })
    rerender(<NgoRegistryListPage search={{ status: 'Dizolvata' }} seed={null} onSearch={onSearch} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('finds a county by its code in the sheet, and picks it on Enter', () => {
    renderPage({}, null)
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/ }))
    const field = within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Caută județul' })
    fireEvent.focus(field)
    expect(within(screen.getByRole('dialog')).getAllByRole('option')).toHaveLength(42)
    fireEvent.change(field, { target: { value: 'cj' } })
    expect(
      within(screen.getByRole('dialog'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['ClujCJ'])
    fireEvent.submit(field.closest('form')!)
    expect(onSearch).toHaveBeenLastCalledWith({ ...EMPTY_QUERY, county: 'CLUJ' })
  })

  it('says what in the address it could not use, and filters on none of it', async () => {
    renderPage({ county: 'Atlantida' }, null)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Toate ONG-urile din registru')
    fireEvent.click(screen.getByRole('button', { name: /atenționar/ }))
    expect(await screen.findByText(/county=Atlantida/)).toBeInTheDocument()
  })

  it('reads in the browser what the server did not, the records first', async () => {
    api.fetchRegistryRecords.mockResolvedValue(firstPage)
    renderPage({ q: 'asociatia' }, null)
    await waitFor(() => expect(screen.getAllByRole('link', { name: /ASOCIATIA/ })).toHaveLength(25))
    expect(api.fetchRegistryRecords).toHaveBeenCalledWith({ name: { contains: 'asociatia' } }, expect.objectContaining({ first: 100, after: null }))
  })
})
