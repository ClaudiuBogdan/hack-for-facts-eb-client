import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { createTestQueryClient, fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import COUNTS from '../data/registry-counts.json'
import { tallyOfCounts, tallyToData, type RegistryCounts } from '../counts'
import { EMPTY_QUERY, selectionKey, type RegistryQuery } from '../model'
import { row, snapshot } from '../test/fixtures'
import { NgoRegistryListPage } from './registry-list-page'
import { TABLE_PAGE_CAP } from '../model'
import { viewOf } from '../view'

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

// The county shapes never arrive here: the map waits for them, its place held.
vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }) }))

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
const onView = vi.fn()
const renderPage = (search: Record<string, string>, query: RegistryQuery | null) =>
  render(<NgoRegistryListPage search={search} seed={query ? seedOf(query) : null} onSearch={onSearch} onView={onView} />, { queryClient: createTestQueryClient() })

describe('NgoRegistryListPage', () => {
  beforeEach(() => {
    onSearch.mockReset()
    onView.mockReset()
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
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith({ ...CLUJ_RADIATE, category: 'foundation' })
    // Anywhere on the row, not only its name: here, its count.
    const associations = within(panel).getByRole('button', { name: /Asociații/ }).closest('tr')!
    fireEvent.click(within(associations).getAllByRole('cell')[2]!)
    expect(onSearch).toHaveBeenLastCalledWith({ ...CLUJ_RADIATE, category: 'association' })
    // A drag that selects the count to copy it narrows nothing.
    onSearch.mockClear()
    const selection = vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '1.234' } as Selection)
    fireEvent.click(within(associations).getAllByRole('cell')[2]!, { detail: 1 })
    expect(onSearch).not.toHaveBeenCalled()
    selection.mockRestore()
  })

  it('shows the counties as the list or the map, the reader’s choice kept from one selection to the next', () => {
    const { rerender } = renderPage({}, EMPTY_QUERY)
    fireEvent.click(screen.getByRole('tab', { name: 'Pe județe' }))
    const panel = () => screen.getByRole('tabpanel')
    expect(within(panel()).getByRole('button', { name: 'Listă', pressed: true })).toBeInTheDocument()
    expect(within(panel()).getByRole('columnheader', { name: 'Județul' })).toBeInTheDocument()
    fireEvent.click(within(panel()).getByRole('button', { name: 'Hartă' }))
    expect(within(panel()).getByRole('button', { name: 'Hartă', pressed: true })).toBeInTheDocument()
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument()
    expect(within(panel()).getByText(/fără un județ recunoscut nu apar pe hartă/)).toBeInTheDocument()
    rerender(<NgoRegistryListPage search={{ status: 'Dizolvata' }} seed={seedOf({ ...EMPTY_QUERY, status: 'dissolved' })} onSearch={onSearch} onView={onView} />)
    expect(within(panel()).getByRole('button', { name: 'Hartă', pressed: true })).toBeInTheDocument()
  })

  it('keeps the answer’s view in the address: the table’s page, the tab, the counties’ map (QA NG-002, NG-003)', () => {
    const { unmount } = renderPage({ county: 'CLUJ', status: 'Radiat' }, CLUJ_RADIATE)
    fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }))
    expect(onView).toHaveBeenLastCalledWith({ page: 2 })
    expect(screen.getByText(/^26–\d+ din/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Pe forme' }))
    expect(onView).toHaveBeenLastCalledWith({ by: 'forma' })
    // Back from a record (the page mounts again) or a shared link: the address reopens page 2 of the records.
    unmount()
    renderPage({ county: 'CLUJ', status: 'Radiat', page: '2' }, CLUJ_RADIATE)
    expect(screen.getByRole('tab', { name: 'Înregistrări' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/^26–\d+ din/)).toBeInTheDocument()
  })

  it('opens the tab and the counties’ map an address names, and the default for one it cannot use', () => {
    const { unmount } = renderPage({ by: 'judet', view: 'map' }, EMPTY_QUERY)
    expect(screen.getByRole('tab', { name: 'Pe județe' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Hartă', pressed: true })).toBeInTheDocument()
    unmount()
    renderPage({ by: 'nimic', view: 'harta', page: '-3' }, EMPTY_QUERY)
    expect(screen.getByRole('tab', { name: 'Înregistrări' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/^1–25 din/)).toBeInTheDocument()
  })

  it('opens at most the last page a reader can reach from a link, and waits for a deep page’s rows', () => {
    expect(viewOf({ page: 999 }).page).toBe(TABLE_PAGE_CAP)
    expect(viewOf({ page: 3 }).page).toBe(3)
    expect(viewOf({}).page).toBe(1)
    // The server's first 30 rows cover pages 1–2; page 5 waits for the read on, its arrows kept, never „101–100".
    api.fetchRegistryRecords.mockReturnValue(new Promise(() => {}))
    const { unmount } = renderPage({ county: 'CLUJ', status: 'Radiat', page: '5' }, CLUJ_RADIATE)
    expect(screen.getByText('Se citește pagina 5…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pagina anterioară' })).toBeEnabled()
    expect(screen.queryByText(/^101–/)).not.toBeInTheDocument()
    unmount()
  })

  it('stops at 20 requests however many rows repeat, and says the filters narrow the rest', async () => {
    // Every page after the server's is the same row again: the table's need never fills, the read must still stop.
    const repeat = row({ id: 'same', registryNumber: '9/A/2020', name: 'ASOCIATIA REPETATA', county: 'CLUJ', sourceRegistryStatus: 'Radiat' })
    api.fetchRegistryRecords.mockResolvedValue({ edges: Array.from({ length: 100 }, (_, index) => ({ cursor: String(index), node: repeat })), pageInfo: { hasNextPage: true, endCursor: 'x' }, snapshot })
    renderPage({ county: 'CLUJ', status: 'Radiat', page: '79' }, CLUJ_RADIATE)
    // The note says what the table really holds: the server's 30 and the one repeated row, 31.
    expect(await screen.findByText(/^Tabelul arată primele 31 de înregistrări: pentru celelalte, restrânge selecția cu filtrele\.$/, {}, { timeout: 5000 })).toBeInTheDocument()
    // The server's page and 19 more: 20 in all.
    expect(api.fetchRegistryRecords).toHaveBeenCalledTimes(19)
    expect(screen.getByRole('button', { name: 'Pagina următoare' })).toBeDisabled()
  })

  it('says a deep page could not be read, with a retry, never an empty range', async () => {
    api.fetchRegistryRecords.mockRejectedValue(new Error('503'))
    renderPage({ county: 'CLUJ', status: 'Radiat', page: '5' }, CLUJ_RADIATE)
    expect(await screen.findByRole('alert')).toHaveTextContent('Citirea s-a oprit')
    expect(screen.getByText('Pagina 5')).toBeInTheDocument()
    expect(screen.queryByText(/^101–/)).not.toBeInTheDocument()
  })

  it('filters by an irregular registry number the registry holds (QA NG-001)', async () => {
    api.fetchRegistryRecords.mockResolvedValue(firstPage)
    renderPage({ registryNumber: '1/A/122' }, null)
    await waitFor(() => expect(api.fetchRegistryRecords).toHaveBeenCalledWith({ registryNumber: { eq: '1/A/122' } }, expect.anything()))
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Toate ONG-urile din registru')
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
    rerender(<NgoRegistryListPage search={{ status: 'Dizolvata' }} seed={null} onSearch={onSearch} onView={onView} />)
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

  it('names a row’s legal form in the reader’s language from its category, the source’s text only for a form it does not know', async () => {
    const page = {
      edges: [
        { cursor: '0', node: row({ id: 'f', name: 'FUNDATIA A', category: 'foundation', legalForm: 'FUNDATIE (text sursă)' }) },
        { cursor: '1', node: row({ id: 'x', name: 'ASOCIATIA B', category: 'altceva', legalForm: 'Formă necunoscută' }) },
      ],
      pageInfo: { hasNextPage: false, endCursor: '1' },
      snapshot,
    }
    api.fetchRegistryRecords.mockResolvedValue(page)
    renderPage({ q: 'fundatia' }, null)
    const known = (await screen.findByRole('link', { name: 'FUNDATIA A' })).closest('td')!
    expect(known).toHaveTextContent(/Fundație ·/)
    expect(known).not.toHaveTextContent('text sursă')
    expect(screen.getByRole('link', { name: 'ASOCIATIA B' }).closest('td')).toHaveTextContent(/Formă necunoscută ·/)
  })

  it('names no town for the registry’s „NEDETERMINAT": the county alone (QA NG-004)', async () => {
    api.fetchRegistryRecords.mockResolvedValue({
      edges: [{ cursor: '0', node: row({ id: 'n', name: 'PRO INCREMENTUM', county: 'CLUJ', locality: 'NEDETERMINAT' }) }],
      pageInfo: { hasNextPage: false, endCursor: '0' },
      snapshot,
    })
    renderPage({ q: 'pro incrementum' }, null)
    const cell = (await screen.findByRole('link', { name: 'PRO INCREMENTUM' })).closest('td')!
    expect(cell).toHaveTextContent(/Asociație · Cluj/)
    expect(cell).not.toHaveTextContent(/Nedeterminat/i)
  })

  it('reads in the browser what the server did not, the records first', async () => {
    api.fetchRegistryRecords.mockResolvedValue(firstPage)
    renderPage({ q: 'asociatia' }, null)
    await waitFor(() => expect(screen.getAllByRole('link', { name: /ASOCIATIA/ })).toHaveLength(25))
    expect(api.fetchRegistryRecords).toHaveBeenCalledWith({ name: { contains: 'asociatia' } }, expect.objectContaining({ first: 100, after: null }))
  })
})
