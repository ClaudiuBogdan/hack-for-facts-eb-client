import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampaignEntityPublicConfigApiError } from '../api/campaign-entity-public-config'
import type { CampaignEntityPublicConfig } from '../schemas/campaign-entity-public-config'
import { useDebateRequestAvailability } from './use-debate-request-availability'

type MockAuthState = {
  readonly isEnabled: boolean
  readonly isLoaded: boolean
  readonly isSignedIn: boolean
}

type MockPublicConfigQuery = {
  readonly data?: CampaignEntityPublicConfig
  readonly isLoading: boolean
  readonly isError: boolean
  readonly error: Error | null
}

let authState: MockAuthState = {
  isEnabled: true,
  isLoaded: true,
  isSignedIn: true,
}

let publicConfigQuery: MockPublicConfigQuery = {
  data: undefined,
  isLoading: false,
  isError: true,
  error: new CampaignEntityPublicConfigApiError('Missing', 404),
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('./use-campaign-entity-public-config', () => ({
  useCampaignEntityPublicConfig: () => publicConfigQuery,
}))

vi.mock('./use-campaign-content', () => ({
  getCampaignTimelineDefinition: () => ({
    anchorDate: '2026-03-27',
    anchorLabel: { ro: 'T0', en: 'T0' },
    entries: [
      {
        id: 'publicare-buget-de-stat',
        title: { ro: 'T0', en: 'T0' },
        description: { ro: 'T0', en: 'T0' },
        dayOffset: 0,
        isActionable: false,
      },
      {
        id: 'publicare-proiect-buget-local',
        title: { ro: 'Publication', en: 'Publication' },
        description: { ro: 'Publication', en: 'Publication' },
        dayOffset: 15,
        isActionable: true,
      },
      {
        id: 'inchidere-contestatii',
        title: { ro: 'Deadline', en: 'Deadline' },
        description: { ro: 'Deadline', en: 'Deadline' },
        dayOffset: 30,
        relativeTo: 'publicare-proiect-buget-local',
        relativeDayOffset: 15,
        isActionable: true,
      },
    ],
  }),
  getCampaignUatOverrideForCui: (entityCui: string) =>
    entityCui === 'static-publication'
      ? { 'publicare-proiect-buget-local': '2026-04-01' }
      : undefined,
}))

function createPublicConfig(
  values: CampaignEntityPublicConfig['values'],
): CampaignEntityPublicConfig {
  return {
    campaignKey: 'funky',
    entityCui: '12345678',
    entityName: 'Oras Test',
    isConfigured: true,
    values,
  }
}

describe('useDebateRequestAvailability', () => {
  beforeEach(() => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }
    publicConfigQuery = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new CampaignEntityPublicConfigApiError('Missing', 404),
    }
  })

  it('does not fall through to open while auth is still loading', () => {
    authState = {
      isEnabled: true,
      isLoaded: false,
      isSignedIn: false,
    }
    publicConfigQuery = {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }

    const { result } = renderHook(() => useDebateRequestAvailability('12345678'))

    expect(result.current.state).toBe('loading')
    expect(result.current.isSubmittable).toBe(false)
  })

  it('does not fall through to open when auth is enabled and the user is signed out', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
    }
    publicConfigQuery = {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }

    const { result } = renderHook(() => useDebateRequestAvailability('12345678'))

    expect(result.current.state).toBe('unavailable')
    expect(result.current.isSubmittable).toBe(false)
  })

  it('allows missing public config to fall back to static/default dates for signed-in users', () => {
    const { result } = renderHook(() => useDebateRequestAvailability('static-publication'))

    expect(result.current.state).toBe('ready')
    expect(result.current.availability?.publicationDate).toBe('2026-04-01')
  })

  it('uses loaded public config when available', () => {
    publicConfigQuery = {
      data: createPublicConfig({
        budgetPublicationDate: '2026-04-02',
        officialBudgetUrl: null,
        public_debate: null,
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    const { result } = renderHook(() => useDebateRequestAvailability('static-publication'))

    expect(result.current.state).toBe('ready')
    expect(result.current.availability?.publicationDate).toBe('2026-04-02')
  })
})
