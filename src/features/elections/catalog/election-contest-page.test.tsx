import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { ElectionContest, ElectionEvent, ElectionResult } from '@/schemas/elections-catalog'
import { contest, event, result, turnout, votes } from '../test/catalog-fixtures'

const { fetchElectionContest, fetchElectionResult, fetchElectionEvent } = vi.hoisted(() => ({
  fetchElectionContest: vi.fn(),
  fetchElectionResult: vi.fn(),
  fetchElectionEvent: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('@/features/elections/test/elections-router-mock')
  return { Link: MockElectionsLink }
})
vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionEvents: vi.fn(),
  fetchElectionEvent,
  fetchElectionContests: vi.fn(),
  fetchElectionContest,
  fetchElectionResult,
}))

const { ElectionContestPage } = await import('./election-contest-page')

const CONTEST = contest()
const KEY = CONTEST.contestKey
const EVENT = event()
const RESULT = result()

function renderContest(seed: { readonly initialContest?: ElectionContest; readonly initialResult?: ElectionResult | null; readonly initialEvent?: ElectionEvent } = {}) {
  return render(<ElectionContestPage contestKey={KEY} {...seed} />, { queryClient: createTestQueryClient() })
}

const factOf = (label: string) => screen.getAllByText(label, { selector: 'dt' })[0]?.nextElementSibling

beforeEach(() => {
  for (const mock of [fetchElectionContest, fetchElectionResult, fetchElectionEvent]) mock.mockReset()
})

describe('a contest’s page', () => {
  it('names the place and office, and states the contest’s facts with its ballot day', async () => {
    fetchElectionContest.mockResolvedValue(CONTEST)
    fetchElectionResult.mockResolvedValue(RESULT)
    fetchElectionEvent.mockResolvedValue(EVENT)
    renderContest()

    expect(await screen.findByRole('heading', { level: 1, name: 'VICTORIA' })).toBeInTheDocument()
    expect(factOf('Funcție')).toHaveTextContent('Primar')
    expect(factOf('Tip de loc')).toHaveTextContent('Localitate')
    expect(factOf('Județ')).toHaveTextContent('IAȘI')
    expect(factOf('Cod SIRUTA')).toHaveTextContent('100004')
    expect(await screen.findByText('June 9, 2024')).toBeInTheDocument()
    expect(factOf('Ziua de vot')).toHaveTextContent('June 9, 2024, vot general')
    expect(factOf('Tur')).toHaveTextContent(/^1$/u)
    expect(factOf('Stare')).toHaveTextContent('Ținut')
    expect(factOf('Cheia scrutinului')).toHaveTextContent(KEY)
    expect(screen.getByRole('link', { name: 'Alegeri locale 2024' })).toHaveAttribute('href', '/alegeri/ro:local:2024')
    expect(fetchElectionResult).toHaveBeenCalledWith(CONTEST, expect.any(AbortSignal))
  })

  it('shows the votes in the API’s order with their shares, the gap between the first two and the turnout', async () => {
    renderContest({ initialContest: CONTEST, initialResult: RESULT, initialEvent: EVENT })

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['PARTIDUL NAȚIONAL LIBERAL1,12461.62%', 'PARTIDUL SOCIAL DEMOCRAT58432.02%'])
    expect(screen.getByText('Diferența dintre primii doi: 540 voturi, 29.61 puncte procentuale.')).toBeInTheDocument()
    expect(factOf('Înscriși pe liste')).toHaveTextContent('3,624')
    expect(factOf('Prezență')).toHaveTextContent('52.76%')
    // Blank votes are not in the data: said, never 0.
    expect(factOf('Voturi albe')).toHaveTextContent('Nu e în date')
    expect(document.body).not.toHaveTextContent(/câștig|ales\b/iu)
    expect(fetchElectionContest).not.toHaveBeenCalled()
    expect(fetchElectionResult).not.toHaveBeenCalled()
  })

  it('names an independent as an independent candidate, never by name', () => {
    const withIndependent = result({ tallies: [votes(null, '6168642', '53.60'), votes('ALIANȚA PENTRU UNIREA ROMÂNILOR', '5339053', '46.40')] })
    renderContest({ initialContest: CONTEST, initialResult: withIndependent, initialEvent: EVENT })
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Candidat independent')
  })

  it('puts what to know behind one marker: unchecked figures, missing mandates and the issue codes', async () => {
    const flagged = result({
      tallies: [votes('PARTIDUL NAȚIONAL LIBERAL', '1124', null, { status: 'SUSPECT', issues: ['OFFICIAL_TOTAL_DIFFERS'] })],
      turnout: [turnout('voted', '1912', { issues: ['POSTAL_VOTED_ENVELOPES'] })],
    })
    renderContest({ initialContest: CONTEST, initialResult: flagged, initialEvent: EVENT })

    expect(screen.getByText('defect cunoscut')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /De știut despre aceste cifre/u }))
    const notes = await screen.findByText('De știut')
    const list = notes.parentElement
    expect(list).toHaveTextContent('Unele cifre au un defect cunoscut; sunt marcate acolo unde apar.')
    expect(list).toHaveTextContent('Unele cifre nu au un total publicat separat cu care să fie comparate.')
    expect(list).toHaveTextContent('Unele procente lipsesc')
    expect(list).toHaveTextContent('Mandatele nu sunt în date.')
    // A coverage cell's code explains a missing measure, so it is listed too.
    expect(list).toHaveTextContent('Semnalări în date: NO_ALLOCATION_EVIDENCE, OFFICIAL_TOTAL_DIFFERS, POSTAL_VOTED_ENVELOPES.')
  })

  it('shows mandates per phase, never summed', () => {
    const withMandates = result({
      tallies: [
        ...RESULT.tallies,
        votes('PARTIDUL NAȚIONAL LIBERAL', '1', null, { measure: 'mandates', allocationPhase: 'man_1' }),
        votes('PARTIDUL NAȚIONAL LIBERAL', '2', null, { measure: 'mandates', allocationPhase: 'final' }),
      ],
    })
    renderContest({ initialContest: CONTEST, initialResult: withMandates, initialEvent: EVENT })
    expect(screen.getByRole('heading', { name: 'Mandate, prima repartizare' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mandate, repartizarea finală' })).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('says an annulled contest without figures has none, and that it was annulled', async () => {
    const annulled = contest({ status: 'annulled', race: null })
    renderContest({ initialContest: annulled, initialResult: null, initialEvent: EVENT })
    expect(screen.getByText('Locul scrutinului nu are cifre în date.')).toBeInTheDocument()
    expect(factOf('Stare')).toHaveTextContent('Anulat')
    fireEvent.click(screen.getByRole('button', { name: /De știut despre aceste cifre/u }))
    expect(await screen.findByText(/Scrutinul a fost anulat/u)).toBeInTheDocument()
  })

  it('answers a contest the API does not have as missing, not as a failure', async () => {
    fetchElectionContest.mockResolvedValue(null)
    renderContest()
    expect(await screen.findByRole('heading', { name: 'Scrutinul nu a fost găsit' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchElectionResult).not.toHaveBeenCalled()
  })

  it('keeps the contest when its figures fail, with their own retry', async () => {
    fetchElectionResult.mockRejectedValueOnce(new Error('upstream down')).mockResolvedValueOnce(RESULT)
    renderContest({ initialContest: CONTEST, initialEvent: EVENT })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Cifrele scrutinului nu s-au încărcat.')
    expect(screen.getByRole('heading', { level: 1, name: 'VICTORIA' })).toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('shows the day’s key when the event cannot be read', async () => {
    fetchElectionEvent.mockRejectedValue(new Error('upstream down'))
    renderContest({ initialContest: CONTEST, initialResult: RESULT })
    await vi.waitFor(() => expect(factOf('Ziua de vot')).toHaveTextContent('ro:local:2024:2024-06-09'))
    expect(screen.getByRole('link', { name: 'Alegerea ro:local:2024' })).toBeInTheDocument()
  })

  it('says why the gap between the first two is missing when the place has votes but no race', async () => {
    renderContest({ initialContest: CONTEST, initialResult: result({ race: null }), initialEvent: EVENT })
    expect(screen.queryByText(/Diferența dintre primii doi:/u)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /De știut despre aceste cifre/u }))
    expect(await screen.findByText(/Diferența dintre primii doi nu e calculată/u)).toBeInTheDocument()
  })

  it('takes the gap from the same read as the votes, never from the contest’s older record', () => {
    renderContest({ initialContest: CONTEST, initialResult: result({ race: { tied: false, marginVotes: '12', marginPoints: '0.66', issues: [] } }), initialEvent: EVENT })
    expect(screen.getByText('Diferența dintre primii doi: 12 voturi, 0.66 puncte procentuale.')).toBeInTheDocument()
    expect(screen.queryByText(/540 voturi/u)).not.toBeInTheDocument()
  })

  it('names the measures on each side when the national figures disagree on the diaspora', async () => {
    const mixed = result({
      tallies: [votes('PARTIDUL NAȚIONAL LIBERAL', '1124', '61.62', { includesDiaspora: true })],
      turnout: [turnout('registered', '3624', { includesDiaspora: false }), turnout('voted', '1912', { includesDiaspora: true })],
    })
    renderContest({ initialContest: CONTEST, initialResult: mixed, initialEvent: EVENT })
    fireEvent.click(screen.getByRole('button', { name: /De știut despre aceste cifre/u }))
    const notes = (await screen.findByText('De știut')).parentElement
    expect(notes).toHaveTextContent('Cifrele naționale nu numără aceiași votanți: diaspora e inclusă în voturile competitorilor, votanții și nu e inclusă în înscrișii pe liste.')
    expect(notes).not.toHaveTextContent('Cifrele naționale includ diaspora.')
    expect(notes).not.toHaveTextContent('Cifrele naționale nu includ diaspora.')
  })

  it('says when a refresh of a place without figures fails, keeping that answer with a retry', async () => {
    const view = renderContest({ initialContest: CONTEST, initialResult: null, initialEvent: EVENT })
    fetchElectionResult.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries({ queryKey: ['elections-catalog', 'result'] }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(screen.getByText('Locul scrutinului nu are cifre în date.')).toBeInTheDocument()

    fetchElectionResult.mockResolvedValueOnce(RESULT)
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('says when the contest’s refresh fails, keeping its last facts', async () => {
    const view = renderContest({ initialContest: CONTEST, initialResult: RESULT, initialEvent: EVENT })
    fetchElectionContest.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries({ queryKey: ['elections-catalog', 'contest'] }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(factOf('Funcție')).toHaveTextContent('Primar')
  })
})
