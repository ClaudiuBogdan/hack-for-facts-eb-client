import { Suspense, type ReactNode } from 'react'
import { render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampaignParticipantsMap } from './campaign-participants-map'

type SubscriptionStatsState = {
  total: number
  perUat: Array<{ sirutaCode: string; uatName: string; count: number }>
  isLoading: boolean
  isError: boolean
}

let subscriptionStatsState: SubscriptionStatsState = {
  total: 0,
  perUat: [],
  isLoading: false,
  isError: false,
}

const mapPropsSpy = vi.fn()

vi.mock('@/features/notifications/campaign-notification-keys', () => ({
  FUNKY_CAMPAIGN_KEY: 'funky',
}))

vi.mock('../../hooks/use-subscription-stats', () => ({
  useSubscriptionStats: () => subscriptionStatsState,
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: (granularity: 'UAT' | 'County') => ({
    data: {
      type: 'FeatureCollection',
      features: [],
      granularity,
    },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/components/ssr/ClientOnly', () => ({
  ClientOnly: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ text }: { readonly text?: string }) => <div>{text}</div>,
}))

vi.mock('./buget-entity-map-selector-map', () => ({
  BugetEntityMapSelectorMap: (props: Record<string, unknown>) => {
    mapPropsSpy(props)
    return (
      <div
        data-testid="mock-campaign-participants-map"
        data-highlight={String(props.highlightSubscriptions)}
      />
    )
  },
}))

describe('CampaignParticipantsMap', () => {
  beforeEach(() => {
    subscriptionStatsState = {
      total: 0,
      perUat: [],
      isLoading: false,
      isError: false,
    }
    mapPropsSpy.mockClear()
  })

  it('does not highlight participant counts while stats are still loading', async () => {
    subscriptionStatsState = {
      total: 0,
      perUat: [],
      isLoading: true,
      isError: false,
    }

    render(
      <Suspense fallback={null}>
        <CampaignParticipantsMap
          locale="ro"
          onUatSelect={vi.fn()}
        />
      </Suspense>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-campaign-participants-map')).toBeInTheDocument()
    })

    expect(screen.getByTestId('mock-campaign-participants-map')).toHaveAttribute(
      'data-highlight',
      'false',
    )
  })
})
