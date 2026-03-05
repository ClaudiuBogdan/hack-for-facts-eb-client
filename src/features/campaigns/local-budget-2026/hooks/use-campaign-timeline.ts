import { useMemo } from 'react'
import { addDays, format, min, parseISO } from 'date-fns'
import { getCampaignTimelineDefinition } from './use-campaign-content'
import type {
  CampaignTimelineEntry,
  CampaignTimelineEntryDefinition,
  CampaignUatCalendarOverride,
} from '../types'

function toDateOnlyString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Maximum absolute deadline: T0 + 45 calendar days (Art. 39, Law 273/2006). */
const ABSOLUTE_MAX_OFFSET = 45

function computeTimelineEntries(params: {
  anchorDate: string
  entries: readonly CampaignTimelineEntryDefinition[]
  uatOverride?: CampaignUatCalendarOverride
}): readonly CampaignTimelineEntry[] {
  const anchorDate = parseISO(params.anchorDate)
  const today = toDateOnlyString(new Date())
  const absoluteMax = addDays(anchorDate, ABSOLUTE_MAX_OFFSET)

  // Track resolved dates + whether they were estimated, keyed by entry id
  const resolvedDates = new Map<string, { date: Date; isEstimated: boolean }>()

  return params.entries.map((entry) => {
    let computedDate: Date
    let isEstimated: boolean

    // 1. Check if UAT override has a direct date for this entry
    const overrideDate = params.uatOverride?.[entry.id]
    if (overrideDate) {
      computedDate = parseISO(overrideDate)
      isEstimated = false
    }
    // 2. Check if entry has relativeTo AND the parent was NOT estimated
    else if (entry.relativeTo && entry.relativeDayOffset !== undefined) {
      const parent = resolvedDates.get(entry.relativeTo)
      if (parent && !parent.isEstimated) {
        computedDate = addDays(parent.date, entry.relativeDayOffset)
        isEstimated = false
      } else {
        // Fall back to worst-case: anchorDate + dayOffset
        computedDate = addDays(anchorDate, entry.dayOffset)
        isEstimated = true
      }
    }
    // 3. Default: anchorDate + dayOffset
    else {
      computedDate = addDays(anchorDate, entry.dayOffset)
      // The first entry (T0, dayOffset 0) is never estimated
      isEstimated = entry.dayOffset !== 0
    }

    // Special case: "vot-aprobare-buget-local" is capped at min(computed, T0 + 45)
    if (entry.id === 'vot-aprobare-buget-local') {
      computedDate = min([computedDate, absoluteMax])
    }

    resolvedDates.set(entry.id, { date: computedDate, isEstimated })

    const computedDateStr = toDateOnlyString(computedDate)
    return {
      ...entry,
      computedDate: computedDateStr,
      isClosed: computedDateStr < today,
      isEstimated,
    }
  })
}

export function useCampaignTimeline(uatOverride?: CampaignUatCalendarOverride) {
  const timeline = getCampaignTimelineDefinition()

  return useMemo(() => {
    const computedEntries = computeTimelineEntries({
      anchorDate: timeline.anchorDate,
      entries: timeline.entries,
      uatOverride,
    })

    return {
      ...timeline,
      entries: computedEntries,
    }
  }, [timeline, uatOverride])
}
