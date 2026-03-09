import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { BugetEntityMapSelectorPage } from './buget-entity-map-selector-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const query = search ? new URLSearchParams(search).toString() : ''
    const href = typeof to === 'string'
      ? `${to}${query ? `?${query}` : ''}`
      : '#'

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
  },
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: {
      CampaignEntityMapSelectorOpened: 'CampaignEntityMapSelectorOpened',
      CampaignEntitySelectedFromMap: 'CampaignEntitySelectedFromMap',
    },
    capture: vi.fn(),
  },
}))

vi.mock('../../hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    setSelectedEntity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({
    data: undefined,
    isLoading: true,
    error: null,
  }),
}))

vi.mock('../../hooks/use-uat-cui-map', () => ({
  useUatCuiMap: () => ({
    data: undefined,
    isLoading: true,
    error: null,
  }),
}))

describe('BugetEntityMapSelectorPage', () => {
  it('links the back action to the canonical selector route', () => {
    render(<BugetEntityMapSelectorPage locale="ro" />)

    expect(
      screen.getByRole('link', { name: /Înapoi la căutare/i }),
    ).toHaveAttribute('href', '/primarie')
  })
})
