import type { CampaignUatCalendarOverride } from '../types'

export const BUDGET_PUBLICATION_TIMELINE_ENTRY_ID = 'publicare-proiect-buget-local' as const

type ResolveCampaignTimelineOverrideParams = {
  readonly baseOverride?: CampaignUatCalendarOverride
  readonly configBudgetPublicationDate?: string | null
  readonly userBudgetPublicationDate?: string | null
}

export function resolveCampaignTimelineOverride({
  baseOverride,
  configBudgetPublicationDate,
  userBudgetPublicationDate,
}: ResolveCampaignTimelineOverrideParams): CampaignUatCalendarOverride | undefined {
  const mergedOverride = {
    ...(baseOverride ?? {}),
  }

  if (configBudgetPublicationDate) {
    mergedOverride[BUDGET_PUBLICATION_TIMELINE_ENTRY_ID] =
      configBudgetPublicationDate
  } else if (
    !mergedOverride[BUDGET_PUBLICATION_TIMELINE_ENTRY_ID]
    && userBudgetPublicationDate
  ) {
    mergedOverride[BUDGET_PUBLICATION_TIMELINE_ENTRY_ID] =
      userBudgetPublicationDate
  }

  return Object.keys(mergedOverride).length > 0
    ? mergedOverride
    : undefined
}
