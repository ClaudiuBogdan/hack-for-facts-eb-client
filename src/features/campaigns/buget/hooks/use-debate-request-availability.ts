import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { CampaignEntityPublicConfigApiError } from '../api/campaign-entity-public-config'
import { CAMPAIGN_KEY } from '../constants'
import { BUDGET_PUBLICATION_TIMELINE_ENTRY_ID } from '../utils/campaign-timeline-override'
import {
  computeTimelineEntryDefaultDate,
  DEBATE_REQUEST_GLOBAL_DEADLINE_TIMELINE_ENTRY_ID,
  resolveDebateRequestAvailability,
  type DebateRequestAvailability,
} from '../utils/debate-request-availability'
import { getCampaignTimelineDefinition, getCampaignUatOverrideForCui } from './use-campaign-content'
import { useCampaignEntityPublicConfig } from './use-campaign-entity-public-config'

export type UseDebateRequestAvailabilityResult =
  | {
      readonly state: 'loading'
      readonly isSubmittable: false
      readonly availability: null
      readonly error: null
    }
  | {
      readonly state: 'unavailable'
      readonly isSubmittable: false
      readonly availability: null
      readonly error: Error
    }
  | {
      readonly state: 'ready'
      readonly isSubmittable: boolean
      readonly availability: DebateRequestAvailability
      readonly error: null
    }

function isMissingPublicConfigError(error: unknown): boolean {
  return error instanceof CampaignEntityPublicConfigApiError && error.status === 404
}

export function useDebateRequestAvailability(entityCui: string | undefined): UseDebateRequestAvailabilityResult {
  const { isEnabled: isAuthEnabled, isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const baseOverride = useMemo(
    () => (entityCui ? getCampaignUatOverrideForCui(entityCui) : undefined),
    [entityCui],
  )
  const publicConfigQuery = useCampaignEntityPublicConfig(
    CAMPAIGN_KEY,
    entityCui,
    { enabled: Boolean(entityCui) },
  )

  return useMemo(() => {
    if (!entityCui || (isAuthEnabled && !isAuthLoaded) || publicConfigQuery.isLoading) {
      return {
        state: 'loading',
        isSubmittable: false,
        availability: null,
        error: null,
      }
    }

    if (isAuthEnabled && !isSignedIn) {
      return {
        state: 'unavailable',
        isSubmittable: false,
        availability: null,
        error: new Error('Sign in required to check public debate request availability.'),
      }
    }

    if (publicConfigQuery.isError && !isMissingPublicConfigError(publicConfigQuery.error)) {
      return {
        state: 'unavailable',
        isSubmittable: false,
        availability: null,
        error: publicConfigQuery.error,
      }
    }

    const timeline = getCampaignTimelineDefinition()
    const globalDeadlineDate = computeTimelineEntryDefaultDate(
      timeline,
      DEBATE_REQUEST_GLOBAL_DEADLINE_TIMELINE_ENTRY_ID,
    ) ?? timeline.anchorDate
    const availability = resolveDebateRequestAvailability({
      now: new Date(),
      publicConfigValues: publicConfigQuery.data?.values ?? null,
      staticPublicationDate: baseOverride?.[BUDGET_PUBLICATION_TIMELINE_ENTRY_ID] ?? null,
      globalDeadlineDate,
    })

    return {
      state: 'ready',
      isSubmittable: availability.status === 'open',
      availability,
      error: null,
    }
  }, [
    baseOverride,
    entityCui,
    isAuthEnabled,
    isAuthLoaded,
    isSignedIn,
    publicConfigQuery.data?.values,
    publicConfigQuery.error,
    publicConfigQuery.isError,
    publicConfigQuery.isLoading,
  ])
}
