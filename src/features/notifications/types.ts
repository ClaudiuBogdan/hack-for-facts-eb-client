import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg as t } from '@lingui/core/macro'
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

type NotificationTypeConfigMessages = Omit<NotificationTypeConfig, 'label' | 'description'> & {
  label: MessageDescriptor
  description: MessageDescriptor
}

const NOTIFICATION_TYPE_CONFIGS: Record<NotificationType, NotificationTypeConfigMessages> = {
  [FUNKY_NOTIFICATION_GLOBAL]: {
    type: FUNKY_NOTIFICATION_GLOBAL,
    label: t`Public Debate Campaign`,
    description: t`Master preference for public debate campaign notifications`,
    campaignKey: FUNKY_CAMPAIGN_KEY,
  },
  newsletter_entity_monthly: {
    type: 'newsletter_entity_monthly',
    label: t`Monthly Report`,
    description: t`Receive a monthly report with budget execution`,
  },
  newsletter_entity_quarterly: {
    type: 'newsletter_entity_quarterly',
    label: t`Quarterly Report`,
    description: t`Receive a quarterly report with budget execution`,
  },
  newsletter_entity_yearly: {
    type: 'newsletter_entity_yearly',
    label: t`Annual Report`,
    description: t`Receive an annual report with budget execution`,
  },
  [FUNKY_NOTIFICATION_ENTITY_UPDATES]: {
    type: FUNKY_NOTIFICATION_ENTITY_UPDATES,
    label: t`Local Budget Campaign Updates`,
    description: t`Receive updates about this entity in the local budget campaign`,
    campaignKey: FUNKY_CAMPAIGN_KEY,
  },
  alert_series_analytics: {
    type: 'alert_series_analytics',
    label: t`Analytics Series Alert`,
    description: t`Receive an alert when an analytics data series meets conditions`,
  },
  alert_series_static: {
    type: 'alert_series_static',
    label: t`Static Dataset Alert`,
    description: t`Receive an alert for a static dataset when conditions are met`,
  },
}

export function getNotificationTypeConfig(
  notificationType: NotificationType,
): NotificationTypeConfig {
  const config = NOTIFICATION_TYPE_CONFIGS[notificationType]

  return {
    ...config,
    label: i18n._(config.label),
    description: i18n._(config.description),
  }
}
