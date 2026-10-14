import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { ElectionEdition, ElectionEditionPage } from '@/schemas/elections-catalog'

const fetchElectionCatalog = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('@/features/elections/test/elections-router-mock')
  return { Link: MockElectionsLink }
})
vi.mock('@/hooks/use-warm-route-code', () => ({ useWarmRouteCode: () => undefined }))
vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionCatalog,
  fetchElectionEdition: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionContest: vi.fn(),
}))

const { ElectionsCatalogPage } = await import('./elections-catalog-page')

const edition = (electionKey: string, extra: Partial<ElectionEdition> = {}): ElectionEdition => ({
  electionKey,
  eventKey: null,
  reportedName: electionKey,
  reportedYear: 2024,
  reportedFamily: 'local',
  reportedRound: null,
  reportedDate: null,
  reportedAuthority: 'BEC/AEP/ROAEP',
  readiness: { identity: 'HELD', sourceSelection: 'HELD' },
  ...extra,
})
const pageOf = (items: readonly ElectionEdition[], extra: Partial<ElectionEditionPage> = {}): ElectionEditionPage => ({
  items: [...items],
  page: 1,
  pageSize: 20,
  total: items.length,
  hasMore: false,
  ...extra,
})

const onSearchChange = vi.fn()

function renderCatalog(search = {}, initialPage?: ElectionEditionPage) {
  return render(<ElectionsCatalogPage search={search} onSearchChange={onSearchChange} initialPage={initialPage} />, { queryClient: createTestQueryClient() })
}

beforeEach(() => {
  fetchElectionCatalog.mockReset()
  onSearchChange.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('the elections catalog', () => {
  it('lists source editions in the API’s order, counted as source editions, each opening its page', async () => {
    fetchElectionCatalog.mockResolvedValue(
      pageOf([edition('bec-local-2024', { reportedRound: 'tur1' }), edition('aep-european-2019', { reportedFamily: 'parliamentary', reportedYear: 2019 })], { total: 50, hasMore: true }),
    )
    renderCatalog()

    const list = await screen.findByRole('list', { name: 'Ediții de sursă' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['bec-local-2024', 'aep-european-2019'])
    expect(links[0]).toHaveAttribute('href', '/alegeri/bec-local-2024')
    expect(screen.getByText('50 de ediții de sursă')).toBeInTheDocument()
    // A stored family label is shown as stored, never corrected.
    expect(within(list).getByText('parliamentary')).toBeInTheDocument()
    expect(fetchElectionCatalog).toHaveBeenCalledWith({}, expect.any(AbortSignal))
  })

  it('says once that results are not available, without any result figure', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([edition('bec-local-2024')]))
    renderCatalog()
    await screen.findByRole('list', { name: 'Ediții de sursă' })
    expect(screen.getAllByRole('note')).toHaveLength(1)
    expect(screen.getByRole('note')).toHaveTextContent('Rezultatele, prezența la vot, candidații și mandatele nu sunt disponibile în această versiune.')
    expect(screen.queryByText(/câștigător|voturi valabile|prezență \d/iu)).not.toBeInTheDocument()
  })

  it('names a missing year and shows a round labelled „final" as the source’s text, not a status', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([edition('bec-referendum-2019', { reportedYear: null, reportedRound: 'final' })]))
    renderCatalog()
    expect(await screen.findByText('An neraportat')).toBeInTheDocument()
    expect(screen.getByText('final')).toBeInTheDocument()
    expect(screen.queryByText('Final')).not.toBeInTheDocument()
  })

  it('stands on the server’s page without reading it again', () => {
    renderCatalog({}, pageOf([edition('bec-local-2024')]))
    expect(screen.getByRole('link', { name: 'bec-local-2024' })).toBeInTheDocument()
    expect(fetchElectionCatalog).not.toHaveBeenCalled()
  })

  it('shows a failed read as a failure with a retry, never as an empty catalog', async () => {
    fetchElectionCatalog.mockRejectedValueOnce(new Error('upstream down'))
    renderCatalog()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Lista edițiilor nu s-a încărcat.')
    expect(screen.queryByText(/Nicio ediție|nu are încă/u)).not.toBeInTheDocument()
    // No count is held pending beside a list that failed.
    expect(screen.queryByText('Se încarcă')).not.toBeInTheDocument()

    fetchElectionCatalog.mockResolvedValueOnce(pageOf([edition('bec-local-2024')]))
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('link', { name: 'bec-local-2024' })).toBeInTheDocument()
    expect(fetchElectionCatalog).toHaveBeenCalledTimes(2)
  })

  it('says a filter that matches nothing is a genuine empty list', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([]))
    renderCatalog({ an: 1990 })
    expect(await screen.findByText('Nicio ediție de sursă nu corespunde filtrelor.')).toBeInTheDocument()
    expect(screen.getByText('0 ediții de sursă')).toBeInTheDocument()
  })

  it('offers the first page from a page past the last one', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([], { page: 9, total: 50 }))
    renderCatalog({ pagina: 9 })
    fireEvent.click(await screen.findByRole('button', { name: 'Mergi la prima pagină' }))
    expect(onSearchChange).toHaveBeenCalledWith({ pagina: undefined })
  })

  it('applies the year and an exact family label together, from the first page', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([edition('bec-local-2024')], { total: 50 }))
    renderCatalog({ pagina: 3 })
    await screen.findByRole('link', { name: 'bec-local-2024' })

    fireEvent.change(screen.getByLabelText('An raportat'), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText('Tip raportat'), { target: { value: 'presidential' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Filtrează edițiile de sursă' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ an: 2024, tip: 'presidential' })
  })

  it('offers the family the address names even when it is not a documented label, and clears every filter', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([]))
    renderCatalog({ tip: 'European Parliament', an: 2019 })
    const family = await screen.findByLabelText<HTMLSelectElement>('Tip raportat')
    expect(family.value).toBe('European Parliament')
    fireEvent.click(screen.getByRole('button', { name: 'Șterge filtrele' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({})
  })

  it('drops a year outside the API’s range instead of sending it', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([]))
    renderCatalog()
    fireEvent.change(await screen.findByLabelText('An raportat'), { target: { value: '1700' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Filtrează edițiile de sursă' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({})
  })

  it('pages through the API’s total with the shared pager', async () => {
    fetchElectionCatalog.mockResolvedValue(pageOf([edition('bec-local-2024')], { total: 50, hasMore: true }))
    renderCatalog()
    fireEvent.click(await screen.findByRole('button', { name: 'Pagina următoare' }))
    expect(onSearchChange).toHaveBeenCalledWith({ pagina: 2 })
  })

  it('never says a new filter matches nothing while its page is still loading', async () => {
    fetchElectionCatalog.mockResolvedValueOnce(pageOf([]))
    const view = renderCatalog({ an: 1990 })
    await screen.findByText('Nicio ediție de sursă nu corespunde filtrelor.')

    fetchElectionCatalog.mockReturnValueOnce(new Promise(() => undefined))
    view.rerender(<ElectionsCatalogPage search={{}} onSearchChange={onSearchChange} />)
    expect(screen.getByText('Se încarcă edițiile de sursă')).toBeInTheDocument()
    expect(screen.queryByText('Nicio ediție de sursă nu corespunde filtrelor.')).not.toBeInTheDocument()
    expect(screen.queryByText('Catalogul nu are încă nicio ediție de sursă.')).not.toBeInTheDocument()
    expect(screen.queryByText('0 ediții de sursă')).not.toBeInTheDocument()
  })

  it('never carries a page-past-the-end answer over to the page being loaded', async () => {
    fetchElectionCatalog.mockResolvedValueOnce(pageOf([], { page: 9, total: 50 }))
    const view = renderCatalog({ pagina: 9 })
    await screen.findByRole('button', { name: 'Mergi la prima pagină' })

    fetchElectionCatalog.mockReturnValueOnce(new Promise(() => undefined))
    view.rerender(<ElectionsCatalogPage search={{}} onSearchChange={onSearchChange} />)
    expect(screen.getByText('Se încarcă edițiile de sursă')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mergi la prima pagină' })).not.toBeInTheDocument()
  })

  it('keeps the previous rows only as previous, with no pager or count, while the next page loads', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => edition(`edition-${String(index).padStart(2, '0')}`))
    fetchElectionCatalog.mockResolvedValueOnce(pageOf(rows, { total: 50, hasMore: true }))
    const view = renderCatalog()
    await screen.findByText('50 de ediții de sursă')

    fetchElectionCatalog.mockReturnValueOnce(new Promise(() => undefined))
    view.rerender(<ElectionsCatalogPage search={{ pagina: 2 }} onSearchChange={onSearchChange} />)
    expect(screen.getByRole('link', { name: 'edition-00' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Se încarcă pagina cerută. Rândurile de mai jos sunt cele afișate anterior.')
    expect(screen.queryByRole('button', { name: 'Pagina următoare' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Se afișează/u)).not.toBeInTheDocument()
    expect(screen.queryByText('50 de ediții de sursă')).not.toBeInTheDocument()
  })

  it('says a failed refresh failed, keeping the last answer marked as such, with a retry', async () => {
    const view = renderCatalog({}, pageOf([edition('bec-local-2024')], { total: 1 }))
    fetchElectionCatalog.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(screen.getByRole('link', { name: 'bec-local-2024' })).toBeInTheDocument()

    fetchElectionCatalog.mockResolvedValueOnce(pageOf([edition('bec-local-2024')], { total: 1 }))
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(fetchElectionCatalog).toHaveBeenCalledTimes(2)
    expect(screen.getByText('1 ediție de sursă')).toBeInTheDocument()
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

