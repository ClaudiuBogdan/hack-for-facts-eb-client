import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { ElectionContest } from '@/schemas/elections-catalog'

const fetchElectionContest = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('@/features/elections/test/elections-router-mock')
  return { Link: MockElectionsLink }
})
vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionCatalog: vi.fn(),
  fetchElectionEdition: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionContest,
}))

const { ElectionContestPage } = await import('./election-contest-page')

const KEY = 'contest:bec-local-2024:mayor:source_constituency:8-19'
const CONTEST: ElectionContest = {
  contestKey: KEY,
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
}

const factOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling

function renderContest(initialContest?: ElectionContest) {
  return render(<ElectionContestPage contestKey={KEY} initialContest={initialContest} />, { queryClient: createTestQueryClient() })
}

beforeEach(() => {
  fetchElectionContest.mockReset()
})

describe('a source contest’s page', () => {
  it('states the reported metadata, naming each missing value, and leads back to its edition', () => {
    renderContest(CONTEST)
    expect(screen.getByRole('heading', { level: 1, name: 'CINCU' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ediția de sursă bec-local-2024' })).toHaveAttribute('href', '/alegeri/bec-local-2024')
    expect(factOf('Funcție raportată')).toHaveTextContent('mayor')
    expect(factOf('Tip de arie din sursă')).toHaveTextContent('Circumscripție din sursă')
    expect(factOf('Cheie de arie din sursă')).toHaveTextContent('8:19')
    expect(factOf('Cod de circumscripție')).toHaveTextContent('Neraportat')
    expect(factOf('Nume de circumscripție')).toHaveTextContent('Neraportat')
    expect(factOf('Cameră')).toHaveTextContent('Neraportată')
    expect(factOf('Tur raportat')).toHaveTextContent('tur1')
    expect(factOf('Cheia scrutinului')).toHaveTextContent(KEY)
    expect(screen.getByText(/nu un teritoriu electoral verificat/u)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('nu sunt disponibile în această versiune')
    expect(fetchElectionContest).not.toHaveBeenCalled()
  })

  it('names a contest without a scope label by its source key', () => {
    renderContest({ ...CONTEST, scopeLabel: null })
    expect(screen.getByRole('heading', { level: 1, name: '8:19' })).toBeInTheDocument()
    expect(factOf('Etichetă de arie')).toHaveTextContent('Neraportată')
  })

  it('answers a contest the API does not have as missing', async () => {
    fetchElectionContest.mockResolvedValue(null)
    renderContest()
    expect(await screen.findByRole('heading', { name: 'Scrutinul nu a fost găsit' })).toBeInTheDocument()
    expect(fetchElectionContest).toHaveBeenCalledWith(KEY, expect.any(AbortSignal))
  })

  it('shows a failed read with a retry, under the key it was asked for', async () => {
    fetchElectionContest.mockRejectedValueOnce(new Error('upstream down')).mockResolvedValueOnce(CONTEST)
    renderContest()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele scrutinului nu s-au încărcat.')
    expect(screen.getByRole('heading', { level: 1, name: KEY })).toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'CINCU' })).toBeInTheDocument()
  })

  it('says when its refresh fails, keeping the last facts marked as such, with a retry', async () => {
    const view = renderContest(CONTEST)
    fetchElectionContest.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.')
    expect(factOf('Funcție raportată')).toHaveTextContent('mayor')

    fetchElectionContest.mockResolvedValueOnce(CONTEST)
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('keeps a missing contest missing when a later refresh fails, and says the refresh failed', async () => {
    fetchElectionContest.mockResolvedValueOnce(null)
    const view = renderContest()
    await screen.findByRole('heading', { name: 'Scrutinul nu a fost găsit' })
    fetchElectionContest.mockRejectedValueOnce(new Error('upstream down'))
    await act(() => view.queryClient.invalidateQueries())

    expect(await screen.findByRole('alert')).toHaveTextContent('Datele nu s-au putut actualiza.')
    expect(screen.getByRole('heading', { name: 'Scrutinul nu a fost găsit' })).toBeInTheDocument()
    expect(screen.queryByText('Datele scrutinului nu s-au încărcat.')).not.toBeInTheDocument()
  })
})
