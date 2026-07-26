import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import type {
  ParliamentMember,
  ParliamentMemberSpeech,
} from '@/schemas/parliament'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    to,
    params,
    search,
    className,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, unknown>
    className?: string
  }) => {
    const path = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to,
    )
    const query = new URLSearchParams(
      Object.entries(search ?? {}).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          if (value !== undefined) acc[key] = String(value)
          return acc
        },
        {},
      ),
    ).toString()
    return (
      <a href={query ? `${path}?${query}` : path} className={className}>
        {children}
      </a>
    )
  },
}))

const useParliamentMemberSpeeches = vi.fn()
const useParliamentMemberSpeechActivity = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentMemberSpeeches: () => useParliamentMemberSpeeches() as unknown,
  useParliamentMemberSpeechActivity: () =>
    useParliamentMemberSpeechActivity() as unknown,
}))

const { MemberInterventiiTab } = await import('./member-interventii-tab')

const member = {
  memberId: 'm-1',
  firstName: 'Ion',
  lastName: 'Popescu',
  chamber: 'camera',
  groupName: 'Grup',
} as unknown as ParliamentMember

function speech(
  overrides: Partial<ParliamentMemberSpeech> & { speechKey: string },
): ParliamentMemberSpeech {
  return {
    spokenAt: '2026-05-13',
    chamber: 'camera_deputatilor',
    summary: `Rezumatul ${overrides.speechKey}.`,
    isCanonical: false,
    ...overrides,
  }
}

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

function mockSpeeches(speeches: ParliamentMemberSpeech[]) {
  useParliamentMemberSpeeches.mockReturnValue({
    ...idle,
    data: { pages: [{ speeches, total: speeches.length }] },
  })
}

beforeEach(() => {
  navigate.mockClear()
  useParliamentMemberSpeeches.mockReturnValue(idle)
  useParliamentMemberSpeechActivity.mockReturnValue({
    ...idle,
    data: { availableYears: [2026], days: [] },
  })
})

describe('member interventions — grouped by sitting', () => {
  it('collapses several turns from one sitting into one section', () => {
    mockSpeeches([
      speech({ speechKey: 'a', isCanonical: true, sessionKey: 'canon:s1' }),
      speech({ speechKey: 'b', isCanonical: true, sessionKey: 'canon:s1' }),
      speech({
        speechKey: 'c',
        isCanonical: true,
        sessionKey: 'canon:s2',
        spokenAt: '2026-05-11',
      }),
    ])

    render(<MemberInterventiiTab member={member} search={{}} />)

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(2)
    // Dates are locale-aware (the test locale is `en`), never hardcoded ro-RO.
    expect(headings[0]).toHaveTextContent('May 13, 2026')
    expect(headings[1]).toHaveTextContent('May 11, 2026')
    expect(headings[0]).toHaveTextContent('Camera Deputaților')
  })

  it('links a PROVEN sitting to its full transcript', () => {
    mockSpeeches([
      speech({ speechKey: 'a', isCanonical: true, sessionKey: 'canon:s1' }),
    ])
    render(<MemberInterventiiTab member={member} search={{}} />)

    expect(
      screen.getByRole('link', { name: /Stenograma completă a ședinței/ }),
    ).toHaveAttribute('href', '/parlament/stenograme/sedinte/canon:s1')
  })

  it('offers NO sitting link for a date-grouped (unproven) bucket', () => {
    // Same day + same chamber is almost always the same sitting — but "almost
    // always" is not a link.
    mockSpeeches([speech({ speechKey: 'a' }), speech({ speechKey: 'b' })])
    render(<MemberInterventiiTab member={member} search={{}} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(
      screen.queryByRole('link', { name: /Stenograma completă a ședinței/ }),
    ).toBeNull()
  })

  it('links every canonical contribution to its HIGHLIGHTED position', () => {
    mockSpeeches([
      speech({ speechKey: 'canon:sp:7', isCanonical: true, sessionKey: 'canon:s1' }),
    ])
    render(<MemberInterventiiTab member={member} search={{}} />)

    expect(
      screen.getByRole('link', {
        name: /Vezi în stenograma completă a ședinței/,
      }),
    ).toHaveAttribute(
      'href',
      '/parlament/stenograme/sedinte/canon:s1?interventie=canon%3Asp%3A7',
    )
  })

  it('drops the repeated per-card date under a sitting heading', () => {
    mockSpeeches([
      speech({ speechKey: 'a', isCanonical: true, sessionKey: 'canon:s1' }),
    ])
    render(<MemberInterventiiTab member={member} search={{}} />)

    const heading = screen.getAllByRole('heading', { level: 3 })[0]!
    expect(heading).toHaveTextContent('May 13, 2026')
    // The card itself no longer repeats it.
    const card = screen.getByText(/Rezumatul a\./).closest('article')!
    expect(within(card).queryByText(/13 mai 2026|May 13, 2026/)).toBeNull()
  })
})

describe('member interventions — toolbar and states', () => {
  it('puts free-text search in the TOOLBAR, not only in the sheet', () => {
    mockSpeeches([speech({ speechKey: 'a' })])
    render(<MemberInterventiiTab member={member} search={{}} />)

    expect(
      screen.getByRole('searchbox', {
        name: /Caută în intervențiile parlamentarului/,
      }),
    ).toBeInTheDocument()
  })

  it('keeps the heatmap as an OPTIONAL, collapsed activity section', () => {
    mockSpeeches([speech({ speechKey: 'a' })])
    const { container } = render(
      <MemberInterventiiTab member={member} search={{}} />,
    )
    const details = container.querySelector('details')!
    expect(details.open).toBe(false)
    expect(details).toHaveTextContent(/Activitatea în plen pe zile/)
  })

  it('reuses the shared availability/provenance failure language', () => {
    useParliamentMemberSpeeches.mockReturnValue({
      ...idle,
      isError: true,
      error: new GraphQLRequestError('GraphQL request failed: fetch failed'),
    })
    render(<MemberInterventiiTab member={member} search={{}} />)

    expect(screen.getByText(/Nu am putut contacta serverul/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reîncearcă/ })).toBeInTheDocument()
  })

  it('shows a layout-matching skeleton while loading', () => {
    useParliamentMemberSpeeches.mockReturnValue({ ...idle, isLoading: true })
    render(<MemberInterventiiTab member={member} search={{}} />)
    expect(screen.getByLabelText('Se încarcă intervențiile')).toBeInTheDocument()
  })

  it('does not invent bill or vote links it has no stored relationship for', () => {
    mockSpeeches([
      speech({ speechKey: 'a', isCanonical: true, sessionKey: 'canon:s1' }),
    ])
    render(<MemberInterventiiTab member={member} search={{}} />)

    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toMatch(
        /\/parlament\/(proiecte|voturi)\//,
      )
    }
  })
})
