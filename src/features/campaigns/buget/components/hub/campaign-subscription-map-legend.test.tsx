import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CampaignSubscriptionMapLegend } from './campaign-subscription-map-legend'

const useLinguiMock = vi.fn(() => ({
  i18n: {
    locale: 'en',
  },
}))

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => useLinguiMock(),
}))

describe('CampaignSubscriptionMapLegend', () => {
  it('shows Romanian participant labels when the active locale is ro', () => {
    useLinguiMock.mockReturnValue({
      i18n: {
        locale: 'ro',
      },
    })

    render(
      <CampaignSubscriptionMapLegend
        totalParticipants={12}
        bins={[
          { min: 2, max: 2, color: '#f87171' },
          { min: 3, max: 3, color: '#dc2626' },
          { min: 2, max: 4, color: '#fca5a5' },
        ]}
      />,
    )

    expect(screen.getByText('12 participanți în campanie')).toBeInTheDocument()
    expect(screen.getByText('2 participanți')).toBeInTheDocument()
    expect(screen.getByText('3 participanți')).toBeInTheDocument()
    expect(screen.getByText('2 - 4 participanți')).toBeInTheDocument()
  })

  it('shows participant labels for single-value bins and ranges', () => {
    useLinguiMock.mockReturnValue({
      i18n: {
        locale: 'en',
      },
    })

    render(
      <CampaignSubscriptionMapLegend
        totalParticipants={12}
        bins={[
          { min: 1, max: 1, color: '#fee2e2' },
          { min: 3, max: 3, color: '#f87171' },
          { min: 2, max: 4, color: '#fca5a5' },
        ]}
      />,
    )

    expect(screen.getByText('12 participants in campaign')).toBeInTheDocument()
    expect(screen.getByText('1 participant')).toBeInTheDocument()
    expect(screen.queryByText('1 - 1')).not.toBeInTheDocument()
    expect(screen.getByText('3 participants')).toBeInTheDocument()
    expect(screen.getByText('2 - 4 participants')).toBeInTheDocument()
  })
})
