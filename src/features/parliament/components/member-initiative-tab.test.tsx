import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ParliamentMember } from '@/schemas/parliament'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const useParliamentMemberInitiatives = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentMemberInitiatives: () =>
    useParliamentMemberInitiatives() as unknown,
}))

const { MemberInitiativeTab } = await import('./member-initiative-tab')

const member = {
  memberId: 'm-1',
  firstName: 'Ion',
  lastName: 'Popescu',
  chamber: 'camera',
} as unknown as ParliamentMember

const idle = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

const NO_RECORDS =
  /Nu există inițiative legislative publicate pentru acest parlamentar/

beforeEach(() => {
  useParliamentMemberInitiatives.mockReturnValue(idle)
})

describe('member initiative tab — a failed read is not an empty legislative record', () => {
  it('renders the failure state, NOT "no initiatives", when the query errors', () => {
    useParliamentMemberInitiatives.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('GraphQL request failed'),
    })

    render(<MemberInitiativeTab member={member} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Inițiativele legislative nu au putut fi încărcate/,
    )
    expect(screen.queryByText(NO_RECORDS)).toBeNull()
  })

  it('offers a retry that refetches', () => {
    const refetch = vi.fn()
    useParliamentMemberInitiatives.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('boom'),
      refetch,
    })

    render(<MemberInitiativeTab member={member} />)
    screen.getByRole('button', { name: /Reîncearcă/ }).click()

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('still says "no initiatives" for a genuinely EMPTY success', () => {
    useParliamentMemberInitiatives.mockReturnValue({
      ...idle,
      data: { initiatives: [], total: 0, page: 1, totalPages: 0 },
    })

    render(<MemberInitiativeTab member={member} />)

    expect(screen.getByText(NO_RECORDS)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the page already on screen when a background refetch fails', () => {
    useParliamentMemberInitiatives.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('refetch failed'),
      data: {
        initiatives: [
          {
            initiativeId: 'i-1',
            title: 'Propunere legislativă privind bugetul',
            registeredAt: '2026-03-04',
            status: 'În dezbatere',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      },
    })

    render(<MemberInitiativeTab member={member} />)

    expect(
      screen.getByText('Propunere legislativă privind bugetul'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
