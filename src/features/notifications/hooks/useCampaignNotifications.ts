import { useMemo } from 'react'
import {
  FUNKY_CAMPAIGN_KEY,
  FUNKY_NOTIFICATION_ENTITY_UPDATES,
  FUNKY_NOTIFICATION_GLOBAL,
} from '../campaign-notification-keys'
import { useAllNotifications } from './useAllNotifications'

export function useCampaignNotifications() {
  const query = useAllNotifications()

  const campaignNotifications = useMemo(
    () =>
      (query.data ?? []).filter(
        (n) => n.campaignKey === FUNKY_CAMPAIGN_KEY
      ),
    [query.data]
  )

  const globalPreference = useMemo(
    () =>
      campaignNotifications.find(
        (n) => n.notificationType === FUNKY_NOTIFICATION_GLOBAL && n.entityCui === null
      ) ?? null,
    [campaignNotifications]
  )

  const entityNotifications = useMemo(
    () =>
      campaignNotifications.filter(
        (n) => n.notificationType === FUNKY_NOTIFICATION_ENTITY_UPDATES
      ),
    [campaignNotifications]
  )

  const activeCount = useMemo(
    () => entityNotifications.filter((n) => n.isActive).length,
    [entityNotifications]
  )

  return {
    ...query,
    data: entityNotifications,
    campaignNotifications,
    globalPreference,
    activeCount,
    totalCount: entityNotifications.length,
  }
}
