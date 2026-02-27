import { useMemo } from 'react'
import { addDays, parseISO } from 'date-fns'
import { getCampaignTimelineDefinition } from './use-campaign-content'
import type { CampaignTimelineEntry, CampaignTimelineEntryDefinition } from '../types'

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function computeTimelineEntries(params: {
  anchorDate: string
  entries: readonly CampaignTimelineEntryDefinition[]
}): readonly CampaignTimelineEntry[] {
  const anchorDate = parseISO(params.anchorDate)
  const today = toDateOnlyString(new Date())

  return params.entries.map((entry) => {
    const computedDate = toDateOnlyString(addDays(anchorDate, entry.dayOffset))

    return {
      ...entry,
      computedDate,
      isClosed: computedDate < today,
    }
  })
}

export function useCampaignTimeline() {
  const timeline = getCampaignTimelineDefinition()

  return useMemo(() => {
    const computedEntries = computeTimelineEntries({
      anchorDate: timeline.anchorDate,
      entries: timeline.entries,
    })

    return {
      ...timeline,
      entries: computedEntries,
    }
  }, [timeline])
}
