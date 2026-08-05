import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type {
  ParliamentMember,
  ParliamentMemberVoteRecord,
} from '@/schemas/parliament'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, unknown>
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const useParliamentMemberVotingHistory = vi.fn()
const useParliamentMemberVoteActivity = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentMemberVotingHistory: () =>
    useParliamentMemberVotingHistory() as unknown,
  useParliamentMemberVoteActivity: () =>
    useParliamentMemberVoteActivity() as unknown,
}))

const { MemberVotingTab } = await import('./member-voting-tab')

const member = {
  memberId: 'm-1',
  firstName: 'Ion',
  lastName: 'Popescu',
  chamber: 'camera',
  groupName: 'Grup',
} as unknown as ParliamentMember

const idle = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
}

function voteRecord(voteId: string): ParliamentMemberVoteRecord {
  return {
    voteId,
    chamber: 'camera_deputatilor',
    title: `Vot ${voteId}`,
    heldAt: '2026-05-13',
    choice: 'for',
  } as unknown as ParliamentMemberVoteRecord
}

const NO_RECORDS =
  /Nu există înregistrări de vot publicate pentru acest parlamentar/

beforeEach(() => {
  navigate.mockClear()
  useParliamentMemberVotingHistory.mockReturnValue(idle)
  useParliamentMemberVoteActivity.mockReturnValue({
    ...idle,
    data: { availableYears: [2026], days: [] },
  })
})

describe('member voting tab — a failed read is not an empty voting record', () => {
  it('renders the failure state, NOT "no published votes", when the query errors', () => {
    useParliamentMemberVotingHistory.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('GraphQL request failed'),
    })

    render(<MemberVotingTab member={member} search={{}} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Istoricul de vot nu a putut fi încărcat/,
    )
    // The whole point: never tell a reader a real MP has no voting record
    // because a request failed.
    expect(screen.queryByText(NO_RECORDS)).toBeNull()
  })

  it('offers a retry that refetches', async () => {
    const refetch = vi.fn()
    useParliamentMemberVotingHistory.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('boom'),
      refetch,
    })

    render(<MemberVotingTab member={member} search={{}} />)
    screen.getByRole('button', { name: /Reîncearcă/ }).click()

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('still says "no published votes" for a genuinely EMPTY success', () => {
    useParliamentMemberVotingHistory.mockReturnValue({
      ...idle,
      data: { pages: [{ votes: [], total: 0 }] },
    })

    render(<MemberVotingTab member={member} search={{}} />)

    expect(screen.getByText(NO_RECORDS)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the votes already on screen when a background refetch fails', () => {
    // `isError` with data present is a failed refetch / failed `fetchNextPage`;
    // blowing the list away would be a regression, not a fix.
    useParliamentMemberVotingHistory.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('refetch failed'),
      data: { pages: [{ votes: [voteRecord('v-1')], total: 1 }] },
    })

    render(<MemberVotingTab member={member} search={{}} />)

    expect(screen.getByText('Vot v-1')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not fall through to the error branch while the first page loads', () => {
    useParliamentMemberVotingHistory.mockReturnValue({ ...idle, isLoading: true })

    render(<MemberVotingTab member={member} search={{}} />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(NO_RECORDS)).toBeNull()
  })
})
