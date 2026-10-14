import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { ElectionContest, ElectionContestPage, ElectionEdition } from '@/schemas/elections-catalog'

const { fetchElectionEdition, fetchElectionContests } = vi.hoisted(() => ({ fetchElectionEdition: vi.fn(), fetchElectionContests: vi.fn() }))

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('@/features/elections/test/elections-router-mock')
  return { Link: MockElectionsLink }
})
vi.mock('@/hooks/use-warm-route-code', () => ({ useWarmRouteCode: () => undefined }))
vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionCatalog: vi.fn(),
  fetchElectionEdition,
  fetchElectionContests,
  fetchElectionContest: vi.fn(),
}))

const { ElectionEditionPage } = await import('./election-edition-page')

const EDITION: ElectionEdition = {
  electionKey: 'bec-local-2024',
  eventKey: null,
  reportedName: 'bec-local-2024',
  reportedYear: null,
  reportedFamily: 'local',
  reportedRound: null,
  reportedDate: null,
  reportedAuthority: 'BEC/AEP/ROAEP',
  readiness: { identity: 'HELD', sourceSelection: 'HELD' },
}
const contest = (contestKey: string, extra: Partial<ElectionContest> = {}): ElectionContest => ({
  contestKey,
  electionKey: 'bec-local-2024',
  reportedOffice: 'mayor',
  chamber: null,
  reportedRound: 'tur1',
  scopeType: 'source_constituency',
  sourceScopeKey: '8:19',
  scopeLabel: 'CINCU',
  constituencyCode: null,
  constituencyName: null,
  readiness: { identity: 'HELD', sourceSelection: 'HELD' },
  ...extra,
})
const pageOf = (items: readonly ElectionContest[], extra: Partial<ElectionContestPage> = {}): ElectionContestPage => ({
  items: [...items],
  page: 1,
  pageSize: 20,
  total: items.length,
  hasMore: false,
  ...extra,
})

const onSearchChange = vi.fn()

function renderEdition(search = {}, seed: { readonly initialEdition?: ElectionEdition; readonly initialContests?: ElectionContestPage } = {}) {
  return render(<ElectionEditionPage electionKey="bec-local-2024" search={search} onSearchChange={onSearchChange} {...seed} />, { queryClient: createTestQueryClient() })
}

const factOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling

beforeEach(() => {
  fetchElectionEdition.mockReset()
  fetchElectionContests.mockReset()
  onSearchChange.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('a source edition’s page', () => {
  it('states every reported fact, naming each one the source leaves out', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEdition()

    expect(await screen.findByText('BEC/AEP/ROAEP')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'bec-local-2024' })).toBeInTheDocument()
    expect(factOf('An raportat')).toHaveTextContent('Neraportat')
    expect(factOf('Tip raportat')).toHaveTextContent('local')
    expect(factOf('Data raportată')).toHaveTextContent('Neraportată')
    expect(factOf('Tur raportat')).toHaveTextContent('Neraportat')
    expect(factOf('Autoritate raportată')).toHaveTextContent('BEC/AEP/ROAEP')
    expect(factOf('Grupare pe platformă (neverificată)')).toHaveTextContent('Fără grupare')
    expect(screen.getByRole('note')).toHaveTextContent('nu au fost încă verificate')
  })

  it('shows a reported date as the calendar day it names and a stored „final" round as text', async () => {
    fetchElectionEdition.mockResolvedValue({ ...EDITION, reportedDate: '2024-06-09', reportedRound: 'final', eventKey: 'ro:local:2024', reportedYear: 2024 })
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEdition()
    await screen.findByText('BEC/AEP/ROAEP')
    expect(factOf('Data raportată')?.querySelector('time')).toHaveAttribute('dateTime', '2024-06-09')
    expect(factOf('Data raportată')).toHaveTextContent('June 9, 2024')
    expect(factOf('Tur raportat')).toHaveTextContent(/^final$/u)
    expect(factOf('An raportat')).toHaveTextContent(/^2024$/u)
    expect(factOf('Grupare pe platformă (neverificată)')).toHaveTextContent('ro:local:2024')
  })

  it('answers an edition the API does not have as missing, not as a failure', async () => {
    fetchElectionEdition.mockResolvedValue(null)
    fetchElectionContests.mockRejectedValue(new Error('NOT_FOUND'))
    renderEdition()
    expect(await screen.findByRole('heading', { name: 'Ediția de sursă nu a fost găsită' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the edition when its contests fail, with the list’s own retry', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockRejectedValueOnce(new Error('upstream down')).mockResolvedValueOnce(pageOf([contest('contest:bec-local-2024:mayor:source_constituency:8-19')]))
    renderEdition()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Lista scrutinelor nu s-a încărcat.')
    expect(factOf('Tip raportat')).toHaveTextContent('local')

    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('link', { name: 'CINCU' })).toBeInTheDocument()
  })

  it('keeps its contests when the edition’s own read fails, and retries the edition', async () => {
    fetchElectionEdition.mockRejectedValueOnce(new Error('upstream down')).mockResolvedValueOnce(EDITION)
    fetchElectionContests.mockResolvedValue(pageOf([contest('contest:bec-local-2024:mayor:source_constituency:8-19')]))
    renderEdition()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele ediției nu s-au încărcat.')
    expect(screen.getByRole('link', { name: 'CINCU' })).toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByText('BEC/AEP/ROAEP')).toBeInTheDocument()
  })

  it('lists the contests in the API’s order, counted as contests, each opening its page by its exact key', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockResolvedValue(
      pageOf(
        [
          contest('contest:bec-local-2024:county-council:county:1', { reportedOffice: 'county_council', scopeType: 'county', scopeLabel: null, sourceScopeKey: '1' }),
          contest('contest:bec-local-2024:mayor:source_constituency:8-19'),
        ],
        { total: 16192, hasMore: true },
      ),
    )
    renderEdition()

    const list = await screen.findByRole('list', { name: 'Scrutinele ediției' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['1', 'CINCU'])
    expect(links[1]).toHaveAttribute('href', '/alegeri/contest/contest:bec-local-2024:mayor:source_constituency:8-19')
    expect(screen.getByText('16.192 de scrutine')).toBeInTheDocument()
    expect(within(list).getByText('Județ')).toBeInTheDocument()
    expect(within(list).getByText('8:19')).toBeInTheDocument()
    expect(fetchElectionContests).toHaveBeenCalledWith('bec-local-2024', {}, expect.any(AbortSignal))
  })

  it('applies the office, scope type and round exactly as entered, from the first page', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockResolvedValue(pageOf([contest('contest:bec-local-2024:mayor:source_constituency:8-19')], { total: 40 }))
    renderEdition({ pagina: 2 })
    await screen.findByRole('link', { name: 'CINCU' })

    fireEvent.change(screen.getByLabelText('Funcție raportată'), { target: { value: ' local_council' } })
    fireEvent.change(screen.getByLabelText('Tip de arie din sursă'), { target: { value: 'siruta' } })
    fireEvent.change(screen.getByLabelText('Tur raportat'), { target: { value: 'tur 2,final' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Filtrează scrutinele' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ functie: ' local_council', arie: 'siruta', tur: 'tur 2,final' })
  })

  it('says a filter that matches nothing is a genuine empty list', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEdition({ functie: 'president' })
    expect(await screen.findByText('Niciun scrutin al ediției nu corespunde filtrelor.')).toBeInTheDocument()
    expect(screen.getByLabelText<HTMLInputElement>('Funcție raportată').value).toBe('president')
  })

  it('never says a changed filter matches nothing while the edition’s next page is still loading', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockResolvedValueOnce(pageOf([]))
    const view = renderEdition({ functie: 'president' })
    await screen.findByText('Niciun scrutin al ediției nu corespunde filtrelor.')

    fetchElectionContests.mockReturnValueOnce(new Promise(() => undefined))
    view.rerender(<ElectionEditionPage electionKey="bec-local-2024" search={{}} onSearchChange={onSearchChange} />)
    expect(screen.getByText('Se încarcă scrutinele')).toBeInTheDocument()
    expect(screen.queryByText('Niciun scrutin al ediției nu corespunde filtrelor.')).not.toBeInTheDocument()
    expect(screen.queryByText('Ediția nu are scrutine în date.')).not.toBeInTheDocument()
  })

  it('says when the edition’s refresh fails, keeping its last facts and its contests', async () => {
    const view = renderEdition({}, { initialEdition: EDITION, initialContests: pageOf([contest('contest:bec-local-2024:mayor:source_constituency:8-19')]) })
    fetchElectionEdition.mockRejectedValueOnce(new Error('upstream down'))
    fetchElectionContests.mockResolvedValueOnce(pageOf([contest('contest:bec-local-2024:mayor:source_constituency:8-19')]))
    await act(() => view.queryClient.invalidateQueries({ queryKey: ['elections-catalog', 'edition'] }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(factOf('Tip raportat')).toHaveTextContent('local')
    expect(screen.getByRole('link', { name: 'CINCU' })).toBeInTheDocument()
  })

  it('says when the contests’ refresh fails, keeping the last page and the edition', async () => {
    const view = renderEdition({}, { initialEdition: EDITION, initialContests: pageOf([contest('contest:bec-local-2024:mayor:source_constituency:8-19')]) })
    fetchElectionContests.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries({ queryKey: ['elections-catalog', 'contests'] }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(screen.getByRole('link', { name: 'CINCU' })).toBeInTheDocument()
    expect(factOf('Tip raportat')).toHaveTextContent('local')
    expect(fetchElectionEdition).not.toHaveBeenCalled()
  })
})
