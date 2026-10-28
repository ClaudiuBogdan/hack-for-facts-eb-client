import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { ElectionContestPage, ElectionContestsSearch, ElectionEvent } from '@/schemas/elections-catalog'
import { contest, event, pageOf } from '../test/catalog-fixtures'

const { fetchElectionEvent, fetchElectionContests } = vi.hoisted(() => ({ fetchElectionEvent: vi.fn(), fetchElectionContests: vi.fn() }))

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('@/features/elections/test/elections-router-mock')
  return { Link: MockElectionsLink }
})
vi.mock('@/hooks/use-warm-route-code', () => ({ useWarmRouteCode: () => undefined }))
vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionEvents: vi.fn(),
  fetchElectionEvent,
  fetchElectionContests,
  fetchElectionContest: vi.fn(),
  fetchElectionResult: vi.fn(),
}))

const { ElectionEditionPage } = await import('./election-edition-page')

const EVENT = event()
const FIRST_DAY = 'ro:local:2024:2024-06-09'
const VICTORIA = contest()
const CLUJ = contest({
  contestKey: 'ro:local:2024:2024-06-09:county_council:county:CJ',
  office: 'county_council',
  jurisdiction: { placeKey: 'county:CJ', placeType: 'county', sirutaCode: null, countyCode: 'CJ', name: 'CLUJ', countyName: 'CLUJ' },
  race: null,
})

const onSearchChange = vi.fn()

function renderEvent(
  search: ElectionContestsSearch = {},
  seed: { readonly initialEvent?: ElectionEvent; readonly initialContests?: { readonly occurrenceKey: string; readonly page: ElectionContestPage } } = {},
) {
  return render(<ElectionEditionPage electionKey="ro:local:2024" search={search} onSearchChange={onSearchChange} {...seed} />, {
    queryClient: createTestQueryClient(),
  })
}

const factOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling

beforeEach(() => {
  fetchElectionEvent.mockReset()
  fetchElectionContests.mockReset()
  onSearchChange.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('an election’s page', () => {
  it('names the event by family and year and states its facts', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEvent()

    expect(await screen.findByRole('heading', { level: 1, name: 'Alegeri locale 2024' })).toBeInTheDocument()
    expect(factOf('Tip')).toHaveTextContent('Alegeri locale')
    expect(factOf('An')).toHaveTextContent(/^2024$/u)
    expect(factOf('Cifre publicate pe platformă')?.querySelector('time')).toHaveAttribute('dateTime', '2026-10-20T17:27:21.366Z')
    expect(factOf('Cifre publicate pe platformă')).toHaveTextContent('October 20, 2026')
    expect(factOf('Cheia alegerii')).toHaveTextContent('ro:local:2024')
  })

  it('offers each ballot day, and reads the first day’s contests when the address names none', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([VICTORIA]))
    renderEvent()

    const days = within(await screen.findByRole('navigation', { name: 'Zilele de vot' })).getAllByRole('link')
    expect(days.map((link) => link.textContent)).toEqual(['June 9, 2024vot general', 'June 23, 2024balotaj'])
    await screen.findByRole('link', { name: 'VICTORIA' })
    expect(fetchElectionContests).toHaveBeenCalledWith(FIRST_DAY, {}, expect.any(AbortSignal))
  })

  it('reads the day the address names by its date', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEvent({ data: '2024-06-23' })
    await screen.findByText('Ziua de vot nu are scrutine în date.')
    expect(fetchElectionContests).toHaveBeenCalledWith('ro:local:2024:2024-06-23', { data: '2024-06-23' }, expect.any(AbortSignal))
  })

  it('says a date the event has no day on, reading no contests', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    renderEvent({ data: '2024-01-01' })
    expect(await screen.findByText('Alegerea nu are o zi de vot la data 2024-01-01.')).toBeInTheDocument()
    expect(fetchElectionContests).not.toHaveBeenCalled()
  })

  it('answers an event the API does not have as missing, not as a failure', async () => {
    fetchElectionEvent.mockResolvedValue(null)
    renderEvent()
    expect(await screen.findByRole('heading', { name: 'Alegerea nu a fost găsită' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchElectionContests).not.toHaveBeenCalled()
  })

  it('shows a failed event read with its retry', async () => {
    fetchElectionEvent.mockRejectedValueOnce(new Error('upstream down')).mockResolvedValueOnce(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEvent()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele alegerii nu s-au încărcat.')
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Alegeri locale 2024' })).toBeInTheDocument()
  })

  it('keeps the event when its contests fail, with the list’s own retry', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockRejectedValueOnce(new Error('upstream down')).mockResolvedValueOnce(pageOf([VICTORIA]))
    renderEvent()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Lista scrutinelor nu s-a încărcat.')
    expect(factOf('Tip')).toHaveTextContent('Alegeri locale')

    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('link', { name: 'VICTORIA' })).toBeInTheDocument()
  })

  it('lists the contests in the API’s order with their office, county and first by votes, never a winner', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([CLUJ, VICTORIA], { total: 6416, hasMore: true }))
    renderEvent()

    const list = await screen.findByRole('list', { name: 'Scrutinele zilei de vot' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['CLUJ', 'VICTORIA'])
    expect(links[1]).toHaveAttribute('href', '/alegeri/contest/ro:local:2024:2024-06-09:mayor:uat:100004')
    expect(screen.getByText('6.416 scrutine')).toBeInTheDocument()
    const [cluj, victoria] = within(list).getAllByRole('listitem')
    expect(cluj).toHaveTextContent('Consiliu județean')
    // No race is no computed ranking, never „no votes": the API withholds it where the votes are not comparable.
    expect(cluj).toHaveTextContent('Primul la voturi: necalculat')
    expect(cluj).not.toHaveTextContent('Fără voturi')
    expect(victoria).toHaveTextContent('Primar · IAȘI')
    expect(victoria).toHaveTextContent('Primul la voturi: PARTIDUL NAȚIONAL LIBERAL, 61.62%')
    expect(list).not.toHaveTextContent(/câștig|ales/iu)
  })

  it('marks a partial, provisional or flagged race on its row, and says the rest once behind the list’s marker', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    const race = VICTORIA.race
    if (!race) throw new Error('fixture has a race')
    const partial = contest({ contestKey: 'k:partial', race: { ...race, geographicCompleteness: 'partial', finality: 'provisional', issues: ['MISSING_SCOPE:uat:1'] } })
    fetchElectionContests.mockResolvedValue(pageOf([partial, CLUJ, VICTORIA]))
    renderEvent()

    const list = await screen.findByRole('list', { name: 'Scrutinele zilei de vot' })
    const [partialRow, , plainRow] = within(list).getAllByRole('listitem')
    expect(partialRow).toHaveTextContent('incomplet, provizoriu, cu semnalări')
    expect(plainRow).not.toHaveTextContent(/incomplet|provizoriu|semnalări/u)

    fireEvent.click(screen.getByRole('button', { name: /De știut despre aceste cifre/u }))
    const notes = (await screen.findByText('De știut')).parentElement
    expect(notes).toHaveTextContent('Unele clasamente nu au un total publicat separat cu care să fie comparate.')
    expect(notes).toHaveTextContent('„Necalculat"')
    expect(notes).toHaveTextContent('e marcat pe rândul lui')
  })

  it('says an independent leader is an independent candidate, never by name', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    const race = VICTORIA.race
    if (!race) throw new Error('fixture has a race')
    fetchElectionContests.mockResolvedValue(pageOf([contest({ race: { ...race, leader: { ...race.leader, competitor: { kind: 'independent', label: null } } } })]))
    renderEvent()
    const list = await screen.findByRole('list', { name: 'Scrutinele zilei de vot' })
    expect(list).toHaveTextContent('Primul la voturi: Candidat independent, 61.62%')
  })

  it('offers the day’s own offices with their counts, and applies office, place type and county from the first page, on the same day', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([VICTORIA], { total: 40 }))
    renderEvent({ data: '2024-06-09', pagina: 2 })
    await screen.findByRole('link', { name: 'VICTORIA' })

    const office = screen.getByLabelText<HTMLSelectElement>('Funcție')
    expect([...office.options].map((option) => option.textContent)).toEqual(['Oricare', 'Primar (3,186)', 'Consiliu local (3,186)'])
    fireEvent.change(office, { target: { value: 'mayor' } })
    fireEvent.change(screen.getByLabelText('Tip de loc'), { target: { value: 'uat' } })
    fireEvent.change(screen.getByLabelText('Județ'), { target: { value: 'CJ' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Filtrează scrutinele' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ data: '2024-06-09', functie: 'mayor', arie: 'uat', judet: 'CJ' })
  })

  it('says a filter that matches nothing is a genuine empty list, and clears filters on the same day', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEvent({ data: '2024-06-23', judet: 'CJ' })
    expect(await screen.findByText('Niciun scrutin al zilei nu corespunde filtrelor.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Șterge filtrele' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ data: '2024-06-23' })
  })

  it('stands on the server’s event and first contests without reading them again', () => {
    renderEvent({}, { initialEvent: EVENT, initialContests: { occurrenceKey: FIRST_DAY, page: pageOf([VICTORIA]) } })
    expect(screen.getByRole('link', { name: 'VICTORIA' })).toBeInTheDocument()
    expect(fetchElectionEvent).not.toHaveBeenCalled()
    expect(fetchElectionContests).not.toHaveBeenCalled()
  })

  it('never seeds a day with another day’s contests', async () => {
    fetchElectionContests.mockResolvedValue(pageOf([]))
    renderEvent({ data: '2024-06-23' }, { initialEvent: EVENT, initialContests: { occurrenceKey: FIRST_DAY, page: pageOf([VICTORIA]) } })
    await screen.findByText('Ziua de vot nu are scrutine în date.')
    expect(screen.queryByRole('link', { name: 'VICTORIA' })).not.toBeInTheDocument()
  })

  it('says when the contests’ refresh fails, keeping the last page and the event', async () => {
    const view = renderEvent({}, { initialEvent: EVENT, initialContests: { occurrenceKey: FIRST_DAY, page: pageOf([VICTORIA]) } })
    fetchElectionContests.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries({ queryKey: ['elections-catalog', 'contests'] }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(screen.getByRole('link', { name: 'VICTORIA' })).toBeInTheDocument()
    expect(fetchElectionEvent).not.toHaveBeenCalled()
  })
})
