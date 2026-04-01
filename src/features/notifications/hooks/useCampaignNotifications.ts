import { useMemo } from 'react'
import { useAllNotifications } from './useAllNotifications'

export function useCampaignNotifications() {
  const query = useAllNotifications()

  const campaignNotifications = useMemo(
    () =>
      (query.data ?? []).filter(
        (n) => n.campaignKey === 'public_debate'
      ),
    [query.data]
  )

  const globalPreference = useMemo(
    () =>
      campaignNotifications.find(
        (n) => n.notificationType === 'campaign_public_debate_global' && n.entityCui === null
      ) ?? null,
    [campaignNotifications]
  )

  const entityNotifications = useMemo(
    () =>
      campaignNotifications.filter(
        (n) => n.notificationType === 'campaign_public_debate_entity_updates'
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
