import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { ElectionEventPage } from '@/schemas/elections-catalog'
import { day, event, pageOf } from '../test/catalog-fixtures'

const fetchElectionEvents = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('@/features/elections/test/elections-router-mock')
  return { Link: MockElectionsLink }
})
vi.mock('@/hooks/use-warm-route-code', () => ({ useWarmRouteCode: () => undefined }))
vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionEvents,
  fetchElectionEvent: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionContest: vi.fn(),
  fetchElectionResult: vi.fn(),
}))

const { ElectionsCatalogPage } = await import('./elections-catalog-page')

const LOCAL = event()
const PRESIDENTIAL = event({
  eventKey: 'ro:presidential:2024',
  family: 'presidential',
  occurrences: [day('2024-11-24', { eventKey: 'ro:presidential:2024', occurrenceKey: 'ro:presidential:2024:2024-11-24', status: 'annulled' })],
})

const onSearchChange = vi.fn()

function renderCatalog(search = {}, initialPage?: ElectionEventPage) {
  return render(<ElectionsCatalogPage search={search} onSearchChange={onSearchChange} initialPage={initialPage} />, { queryClient: createTestQueryClient() })
}

beforeEach(() => {
  fetchElectionEvents.mockReset()
  onSearchChange.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('the elections list', () => {
  it('lists events in the API’s order, named by family and year, each opening its page', async () => {
    fetchElectionEvents.mockResolvedValue(pageOf([LOCAL, PRESIDENTIAL], { total: 26, hasMore: true }))
    renderCatalog()

    const list = await screen.findByRole('list', { name: 'Alegeri' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Alegeri locale 2024', 'Alegeri prezidențiale 2024'])
    expect(links[0]).toHaveAttribute('href', '/alegeri/ro:local:2024')
    expect(screen.getByText('26 de alegeri')).toBeInTheDocument()
    expect(fetchElectionEvents).toHaveBeenCalledWith({}, expect.any(AbortSignal))
  })

  it('shows each ballot day with its kind, and an annulled day as annulled', async () => {
    fetchElectionEvents.mockResolvedValue(pageOf([LOCAL, PRESIDENTIAL]))
    renderCatalog()
    const rows = within(await screen.findByRole('list', { name: 'Alegeri' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('June 9, 2024, vot general')
    expect(rows[0]).toHaveTextContent('June 23, 2024, balotaj')
    expect(rows[1]).toHaveTextContent('November 24, 2024, vot general, anulat')
  })

  it('stands on the server’s page without reading it again', () => {
    renderCatalog({}, pageOf([LOCAL]))
    expect(screen.getByRole('link', { name: 'Alegeri locale 2024' })).toBeInTheDocument()
    expect(fetchElectionEvents).not.toHaveBeenCalled()
  })

  it('shows a failed read as a failure with a retry, never as an empty list', async () => {
    fetchElectionEvents.mockRejectedValueOnce(new Error('upstream down'))
    renderCatalog()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Lista alegerilor nu s-a încărcat.')
    expect(screen.queryByText('Nu există încă alegeri cu rezultate publicate.')).not.toBeInTheDocument()
    // No count is held pending beside a list that failed.
    expect(screen.queryByText('Se încarcă')).not.toBeInTheDocument()

    fetchElectionEvents.mockResolvedValueOnce(pageOf([LOCAL]))
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('link', { name: 'Alegeri locale 2024' })).toBeInTheDocument()
    expect(fetchElectionEvents).toHaveBeenCalledTimes(2)
  })

  it('says an empty answer is a genuine empty list', async () => {
    fetchElectionEvents.mockResolvedValue(pageOf([]))
    renderCatalog()
    expect(await screen.findByText('Nu există încă alegeri cu rezultate publicate.')).toBeInTheDocument()
    expect(screen.getByText('0 alegeri')).toBeInTheDocument()
  })

  it('offers the first page from a page past the last one', async () => {
    fetchElectionEvents.mockResolvedValue(pageOf([], { page: 9, total: 26 }))
    renderCatalog({ pagina: 9 })
    fireEvent.click(await screen.findByRole('button', { name: 'Mergi la prima pagină' }))
    expect(onSearchChange).toHaveBeenCalledWith({ pagina: undefined })
  })

  it('pages through the API’s total with the shared pager', async () => {
    fetchElectionEvents.mockResolvedValue(pageOf([LOCAL], { total: 26, hasMore: true }))
    renderCatalog()
    fireEvent.click(await screen.findByRole('button', { name: 'Pagina următoare' }))
    expect(onSearchChange).toHaveBeenCalledWith({ pagina: 2 })
  })

  it('keeps the previous rows only as previous, with no pager or count, while the next page loads', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => event({ eventKey: `ro:local:${String(2000 + index)}`, year: 2000 + index }))
    fetchElectionEvents.mockResolvedValueOnce(pageOf(rows, { total: 26, hasMore: true }))
    const view = renderCatalog()
    await screen.findByText('26 de alegeri')

    fetchElectionEvents.mockReturnValueOnce(new Promise(() => undefined))
    view.rerender(<ElectionsCatalogPage search={{ pagina: 2 }} onSearchChange={onSearchChange} />)
    expect(screen.getByRole('link', { name: 'Alegeri locale 2000' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Se încarcă pagina cerută. Rândurile de mai jos sunt cele afișate anterior.')
    expect(screen.queryByRole('button', { name: 'Pagina următoare' })).not.toBeInTheDocument()
    expect(screen.queryByText('26 de alegeri')).not.toBeInTheDocument()
  })

  it('says a failed refresh failed, keeping the last answer marked as such, with a retry', async () => {
    const view = renderCatalog({}, pageOf([LOCAL], { total: 1 }))
    fetchElectionEvents.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(screen.getByRole('link', { name: 'Alegeri locale 2024' })).toBeInTheDocument()

    fetchElectionEvents.mockResolvedValueOnce(pageOf([LOCAL], { total: 1 }))
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(fetchElectionEvents).toHaveBeenCalledTimes(2)
    expect(screen.getByText('1 alegere')).toBeInTheDocument()
  })
})

/**
 * The shared pager under these lists, as the app ships it: the catalogs
 * compiled by the same Lingui plugin as the build. A Romanian entry left
 * empty compiles to the English one, so a pager label translated for English
 * would read in English on a Romanian page.
 */
describe('the lists’ pager in each language', () => {
  const PAGER: ReadonlyArray<readonly [romanian: string, english: string]> = [
    ['Se afișează {from}–{to} din {totalCount} rânduri', 'Showing {from}–{to} of {totalCount} rows'],
    ['Paginare', 'Pagination'],
    ['Prima pagină', 'First page'],
    ['Prima', 'First'],
    ['Precedenta', 'Previous'],
    ['Pagina {safeCurrent} din {totalPages}', 'Page {safeCurrent} of {totalPages}'],
    ['Ultima pagină ({totalPages})', 'Last page ({totalPages})'],
    ['Ultima', 'Last'],
    ['Mergi la', 'Go to'],
    ['Mergi la pagina', 'Go to page'],
  ]

  /** A compiled message as text, its placeholders as `{name}`. */
  const textOf = (message: unknown): string =>
    typeof message === 'string'
      ? message
      : Array.isArray(message)
        ? message.map((token: unknown) => (typeof token === 'string' ? token : Array.isArray(token) ? `{${String(token[0])}}` : '')).join('')
        : ''

  it('reads Romanian on a Romanian page and English on an English one', async () => {
    const ro: Record<string, unknown> = (await import('@/locales/ro/messages.po')).messages
    const en: Record<string, unknown> = (await import('@/locales/en/messages.po')).messages
    for (const [romanian, english] of PAGER) {
      // Every message whose English is this label: the pager's own, and any other with the same English.
      const ids = Object.keys(en).filter((id) => textOf(en[id]) === english)
      expect(ids, english).not.toHaveLength(0)
      const romanianTexts = ids.map((id) => textOf(ro[id]))
      expect(romanianTexts, english).toContain(romanian)
      expect(romanianTexts, english).not.toContain(english)
    }
  })
})
