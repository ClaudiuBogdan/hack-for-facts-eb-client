import {
  FUNKY_CAMPAIGN_KEY,
  FUNKY_NOTIFICATION_ENTITY_UPDATES,
  FUNKY_NOTIFICATION_GLOBAL,
} from './campaign-notification-keys'

export type NotificationType =
  | typeof FUNKY_NOTIFICATION_GLOBAL
  | 'newsletter_entity_monthly'
  | 'newsletter_entity_quarterly'
  | 'newsletter_entity_yearly'
  | typeof FUNKY_NOTIFICATION_ENTITY_UPDATES
  | 'alert_series_analytics'
  | 'alert_series_static'

export interface Notification {
  id: string
  userId: string
  entityCui: string | null
  notificationType: NotificationType
  campaignKey?: string | null
  isActive: boolean
  config: Record<string, unknown> | null
  hash: string
  createdAt: string
  updatedAt: string
  // Joined data (if available)
  entity?: {
    name: string
    cui: string
  }
}


export interface NotificationTypeConfig {
  type: NotificationType
  label: string
  description: string
  campaignKey?: string
}

export const NOTIFICATION_TYPE_CONFIGS: Record<NotificationType, NotificationTypeConfig> = {
  [FUNKY_NOTIFICATION_GLOBAL]: {
    type: FUNKY_NOTIFICATION_GLOBAL,
    label: 'Public Debate Campaign',
    description: 'Master preference for public debate campaign notifications',
    campaignKey: FUNKY_CAMPAIGN_KEY,
  },
  newsletter_entity_monthly: {
    type: 'newsletter_entity_monthly',
    label: 'Monthly Report',
    description: 'Receive a monthly report with budget execution',
  },
  newsletter_entity_quarterly: {
    type: 'newsletter_entity_quarterly',
    label: 'Quarterly Report',
    description: 'Receive a quarterly report with budget execution',
  },
  newsletter_entity_yearly: {
    type: 'newsletter_entity_yearly',
    label: 'Annual Report',
    description: 'Receive an annual report with budget execution',
  },
  [FUNKY_NOTIFICATION_ENTITY_UPDATES]: {
    type: FUNKY_NOTIFICATION_ENTITY_UPDATES,
    label: 'Public Debate Updates',
    description: 'Receive updates about public debate correspondence for this entity',
    campaignKey: FUNKY_CAMPAIGN_KEY,
  },
  alert_series_analytics: {
    type: 'alert_series_analytics',
    label: 'Analytics Series Alert',
    description: 'Receive an alert when an analytics data series meets conditions',
  },
  alert_series_static: {
    type: 'alert_series_static',
    label: 'Static Dataset Alert',
    description: 'Receive an alert for a static dataset when conditions are met',
  },
}
