import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legislationOverviewFixture } from '../mocks/fixtures/legislation-overview'
import { LegislationAnalyticsPage } from './legislation-analytics-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/use-legislation', () => ({
  useLegislationOverview: vi.fn(),
  useLegislationStatusCounts: vi.fn(),
}))

import {
  useLegislationOverview,
  useLegislationStatusCounts,
} from '../hooks/use-legislation'
import { legislationStatusCountsFixture } from '../mocks/fixtures/legislation-status-counts'

describe('LegislationAnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(useLegislationOverview).mockReturnValue({
      data: legislationOverviewFixture,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLegislationOverview>)
    vi.mocked(useLegislationStatusCounts).mockReturnValue({
      data: legislationStatusCountsFixture,
      isError: false,
    } as unknown as ReturnType<typeof useLegislationStatusCounts>)
  })

  it('renders the headline counts and the most-cited acts', () => {
    render(<LegislationAnalyticsPage />)

    expect(screen.getByText('Acte normative')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Actele pe care se sprijină restul legislației',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Legea nr. 227/2015')).toBeInTheDocument()
  })

  it('marks Analiză as the current tab', () => {
    render(<LegislationAnalyticsPage />)

    expect(screen.getByText('Analiză')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Prezentare')).not.toHaveAttribute('aria-current')
  })

  it('repeats the Constitutional Court caveat on this route', () => {
    render(<LegislationAnalyticsPage />)

    // This route is independently linkable and carries the strongest numeric
    // claims in the module — the caveat may not live only on the landing page.
    expect(
      screen.getByText(/nu modifică statutul actelor pe care le vizează/),
    ).toBeInTheDocument()
  })

  it('renders a skeleton while loading', () => {
    vi.mocked(useLegislationOverview).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useLegislationOverview>)

    render(<LegislationAnalyticsPage />)

    expect(
      screen.getByLabelText('Se încarcă analiza legislației'),
    ).toBeInTheDocument()
  })

  it('renders an error message when the overview fails', () => {
    vi.mocked(useLegislationOverview).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useLegislationOverview>)

    render(<LegislationAnalyticsPage />)

    expect(
      screen.getByText('Nu am putut încărca datele despre legislație.'),
    ).toBeInTheDocument()
  })
})
