export const CAMPAIGN_ID = 'buget'
export const CAMPAIGN_SLUG = 'buget'
export const CAMPAIGN_BASE_PATH = '/buget'
export const CAMPAIGN_CALENDAR_ROUTE = `${CAMPAIGN_BASE_PATH}/$cui/calendar`

export const CAMPAIGN_PROGRESS_STORAGE_KEY = `campaign_progress_snapshot:${CAMPAIGN_ID}`
export const CAMPAIGN_REGISTRATION_STORAGE_KEY_PREFIX = 'campaign_registration'

export const CAMPAIGN_DEFAULT_LOCALE = 'ro' as const

export const CAMPAIGN_PROGRESS_SCHEMA_VERSION = 1 as const

export function buildCampaignCalendarPath(cui: string): string {
  return `${CAMPAIGN_BASE_PATH}/${encodeURIComponent(cui.trim())}/calendar`
}
