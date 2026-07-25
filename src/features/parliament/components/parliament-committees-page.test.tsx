import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentCommittee } from '@/schemas/parliament'

// Capture the params the page passes to the committees hook.
const useCommitteesMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentCommitteesBrowse: (params: unknown) => useCommitteesMock(params),
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
      legislature: '2024',
    })
  })

  it('drops the legislature filter for "all"', () => {
    expect(toCommitteeQueryParams(parseCommitteeBrowseSearch({ legislatura: 'all' }))).toEqual(
      {},
    )
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
    useCommitteesMock.mockReturnValue(page())
  })

  it('queries the CURRENT legislature by default', () => {
    render(<ParliamentCommitteesPage search={{}} />)
    expect(useCommitteesMock).toHaveBeenCalledWith({ legislature: '2024' })
  })

  it('queries the chamber + legislature carried by the URL', () => {
    render(<ParliamentCommitteesPage search={{ chamber: 'senat', legislatura: 'all' }} />)
    expect(useCommitteesMock).toHaveBeenCalledWith({ chamber: 'senat' })
  })

  it('writes a chamber change to the URL instead of local state', () => {
    render(<ParliamentCommitteesPage search={{}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Senat' }))

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
    useCommitteesMock.mockReturnValue(page({ hasNextPage: true }))
    render(<ParliamentCommitteesPage search={{}} />)

    expect(
      screen.getByRole('button', { name: 'Încarcă mai multe comisii' }),
    ).toBeInTheDocument()
  })

  it('shows an ERROR state, not "no committees", when the read fails', () => {
    useCommitteesMock.mockReturnValue(page({ isError: true, data: undefined }))
    render(<ParliamentCommitteesPage search={{}} />)

    expect(screen.getByText('Lista comisiilor nu a putut fi încărcată')).toBeInTheDocument()
    expect(
      screen.queryByText('Nu există comisii disponibile pentru filtrul selectat.'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reîncearcă' })).toBeInTheDocument()
  })

  it('shows the empty state only for a genuinely empty result', () => {
    useCommitteesMock.mockReturnValue(page({ data: { pages: [{ committees: [] }] } }))
    render(<ParliamentCommitteesPage search={{}} />)

    expect(
      screen.getByText('Nu există comisii disponibile pentru filtrul selectat.'),
    ).toBeInTheDocument()
  })
})
