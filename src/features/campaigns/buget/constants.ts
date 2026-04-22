export const CAMPAIGN_ID = 'buget'
export const CAMPAIGN_SLUG = 'buget'
export const CAMPAIGN_KEY = 'funky' as const
export const CAMPAIGN_LANDING_PATH = '/provocare'
export const CAMPAIGN_TERMS_PATH = '/provocare/termeni-si-conditii'
export const CAMPAIGN_ENTITY_BASE_PATH = '/primarie'
export const CAMPAIGN_ENTITY_SELECTOR_PATH = CAMPAIGN_ENTITY_BASE_PATH
export const CAMPAIGN_ENTITY_SELECTOR_MAP_PATH =
  `${CAMPAIGN_ENTITY_SELECTOR_PATH}/harta` as const
export const CAMPAIGN_BUDGET_ROUTE = `${CAMPAIGN_ENTITY_BASE_PATH}/$cui/buget`
export const CAMPAIGN_CALENDAR_ROUTE = `${CAMPAIGN_BUDGET_ROUTE}/calendar`
export const CAMPAIGN_NOTIFICATIONS_PATH = '/provocare/notificari'

export const CAMPAIGN_PROGRESS_STORAGE_KEY = 'funky:storage:progress_snapshot'
export const CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY = 'funky:storage:progress_events'
export const CAMPAIGN_PROGRESS_SYNC_STORAGE_KEY = 'funky:storage:progress_sync'
export const CAMPAIGN_PROGRESS_CLIENT_ID_STORAGE_KEY = 'funky:storage:client_id'

export const CAMPAIGN_DEFAULT_LOCALE = 'ro' as const

export const CAMPAIGN_PROGRESS_SCHEMA_VERSION = 1 as const

export function buildCampaignBudgetPath(cui: string): string {
  return `${CAMPAIGN_ENTITY_BASE_PATH}/${encodeURIComponent(cui.trim())}/buget`
}

export function buildCampaignCalendarPath(cui: string): string {
  return `${buildCampaignBudgetPath(cui)}/calendar`
}

export function buildCampaignResourcesPath(cui: string): string {
  return `${buildCampaignBudgetPath(cui)}/resurse`
}
