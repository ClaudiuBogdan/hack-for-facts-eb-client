import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentCommittee } from '@/schemas/parliament'

// Capture the params the page passes to the committees hook.
const useCommitteesMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  // The page runs TWO reads — Camera and Senat — because the Senate publishes
  // no legislature for its committees. The mock answers per chamber so the
  // roster on screen is not the same page counted twice.
  useParliamentCommitteesBrowse: (params: unknown, options?: unknown) =>
    useCommitteesMock(params, options),
}))
vi.mock('./parliament-shell', () => ({
  ParliamentShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as Record<string, unknown>)}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}))

import { ParliamentCommitteesPage } from './parliament-committees-page'
import {
  parseCommitteeBrowseSearch,
  toCommitteeQueryParams,
  toSenateCommitteeQueryParams,
} from '../lib/committee-browse-search'

const committee: ParliamentCommittee = {
  committeeKey: 'camera_deputatilor:buget|2024',
  chamber: 'camera_deputatilor',
  name: 'Comisia pentru buget',
  legislature: '2024',
  committeeType: 'permanenta',
  sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
}

const page = (over: Record<string, unknown> = {}) => ({
  data: { pages: [{ committees: [committee], hasNextPage: false }] },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  ...over,
})

/** The URL search state is the only source of truth for these filters. */
describe('committee browse URL state', () => {
  it('defaults to the CURRENT legislature (2024, not the 1990 first page)', () => {
    expect(toCommitteeQueryParams(parseCommitteeBrowseSearch({}))).toEqual({
      chamber: 'camera_deputatilor',
      legislature: '2024',
    })
  })

  it('drops the legislature filter for "all"', () => {
    expect(toCommitteeQueryParams(parseCommitteeBrowseSearch({ legislatura: 'all' }))).toEqual(
      { chamber: 'camera_deputatilor' },
    )
  })

  it('binds Camera even for "toate" — the Senate is a SEPARATE read, not a second copy', () => {
    // Unbound, this half returns both chambers and the Senate half then repeats
    // all 191 of its rows: 848 committees rendered against 657 in the database.
    const search = parseCommitteeBrowseSearch({ chamber: 'all', legislatura: 'all' })
    expect(toCommitteeQueryParams(search)).toEqual({ chamber: 'camera_deputatilor' })
    expect(toSenateCommitteeQueryParams(search)).toEqual({ chamber: 'senat' })
  })

  it('round-trips a chamber + legislature link', () => {
    const search = parseCommitteeBrowseSearch({ chamber: 'senat', legislatura: '2020' })
    expect(search).toEqual({ chamber: 'senat', legislatura: '2020' })
    expect(toCommitteeQueryParams(search)).toEqual({
      chamber: 'senat',
      legislature: '2020',
    })
  })

  it('ignores junk values instead of forwarding them to the API', () => {
    expect(
      parseCommitteeBrowseSearch({ chamber: 'senate', legislatura: '<script>' }),
    ).toEqual({})
  })
})

describe('ParliamentCommitteesPage', () => {
  beforeEach(() => {
    useCommitteesMock.mockReset()
    navigateMock.mockReset()
    // Camera answers with the fixture; the Senate half answers empty unless a
    // test says otherwise, so one committee on screen means one committee.
    useCommitteesMock.mockImplementation((params: unknown) =>
      (params as { chamber?: string }).chamber === 'senat'
        ? page({ data: { pages: [{ committees: [], hasNextPage: false }] } })
        : page(),
    )
  })

  it('queries the CURRENT legislature by default, bound to Camera', () => {
    render(<ParliamentCommitteesPage search={{}} />)
    expect(useCommitteesMock).toHaveBeenCalledWith(
      // Camera is bound explicitly: this read is one HALF of the browse, and an
      // unbound chamber returns Senate rows that the Senate read then repeats.
      { chamber: 'camera_deputatilor', legislature: '2024' },
      expect.objectContaining({ enabled: true }),
    )
  })

  it('asks for the Senate WITHOUT a legislature, and never with one', () => {
    // Every Senate committee carries `legislature: null`, so pairing the two
    // asks for a combination that cannot exist — which is how choosing "Senat"
    // used to report that the Senate has no committees. It has 33.
    render(<ParliamentCommitteesPage search={{ chamber: 'senat' }} />)

    const calls = useCommitteesMock.mock.calls as unknown as ReadonlyArray<
      readonly [{ chamber?: string }, { enabled?: boolean } | undefined]
    >
    const senateCalls = calls.filter(([params]) => params.chamber === 'senat')
    expect(senateCalls).toHaveLength(1)
    expect(senateCalls[0]?.[0]).toEqual({ chamber: 'senat' })
    expect(senateCalls[0]?.[1]).toMatchObject({ enabled: true })
  })

  it('switches the Camera read OFF when only the Senate is asked for', () => {
    render(<ParliamentCommitteesPage search={{ chamber: 'senat' }} />)
    const calls = useCommitteesMock.mock.calls as unknown as ReadonlyArray<
      readonly [{ chamber?: string }, { enabled?: boolean } | undefined]
    >
    const cameraCall = calls.find(([params]) => params.chamber !== 'senat')
    expect(cameraCall?.[1]).toMatchObject({ enabled: false })
  })

  it('writes a chamber change to the URL instead of local state', () => {
    render(<ParliamentCommitteesPage search={{}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Senat' }))

    expect(navigateMock).toHaveBeenCalledTimes(1)
    const arg = navigateMock.mock.calls[0]?.[0] as {
      search: () => Record<string, unknown>
      replace: boolean
    }
    expect(arg.search()).toEqual({ chamber: 'senat', legislatura: '2024' })
  })

  it('writes a legislature change to the URL', () => {
    render(<ParliamentCommitteesPage search={{ chamber: 'senat' }} />)
    fireEvent.change(screen.getByLabelText('Filtru legislatură'), {
      target: { value: 'all' },
    })

    const arg = navigateMock.mock.calls[0]?.[0] as { search: () => Record<string, unknown> }
    expect(arg.search()).toEqual({ chamber: 'senat', legislatura: 'all' })
  })

  it('offers a load-more control while the cursor has further pages', () => {
    useCommitteesMock.mockImplementation((params: unknown) =>
      (params as { chamber?: string }).chamber === 'senat'
        ? page({ data: { pages: [{ committees: [], hasNextPage: false }] } })
        : page({ hasNextPage: true }),
    )
    render(<ParliamentCommitteesPage search={{}} />)

    expect(
      screen.getByRole('button', { name: 'Încarcă mai multe comisii' }),
    ).toBeInTheDocument()
  })

  it('shows an ERROR state, not "no committees", when the read fails', () => {
    useCommitteesMock.mockImplementation(() => page({ isError: true, data: undefined }))
    render(<ParliamentCommitteesPage search={{}} />)

    expect(screen.getByText('Lista comisiilor nu a putut fi încărcată')).toBeInTheDocument()
    expect(
      screen.queryByText('Nu există comisii disponibile pentru filtrul selectat.'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reîncearcă' })).toBeInTheDocument()
  })

  it('shows the empty state only for a genuinely empty result', () => {
    useCommitteesMock.mockImplementation(() => page({ data: { pages: [{ committees: [] }] } }))
    render(<ParliamentCommitteesPage search={{}} />)

    expect(
      screen.getByText('Nicio comisie nu corespunde filtrelor'),
    ).toBeInTheDocument()
  })
})
