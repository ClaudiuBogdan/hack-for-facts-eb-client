import type { CampaignAdminUserInteractionListItem } from '@/features/campaigns/buget/admin/types'

export function getCampaignAdminPrimaryValue(
  item: CampaignAdminUserInteractionListItem
): string | null {
  if (item.institutionEmail) {
    return item.institutionEmail
  }

  if (item.websiteUrl) {
    return item.websiteUrl
  }

  switch (item.payloadSummary?.kind) {
    case 'budget_document':
      return item.payloadSummary.documentUrl
    case 'budget_publication_date':
      return item.payloadSummary.publicationDate ?? item.payloadSummary.sources[0]?.url ?? null
    case 'budget_status':
      return item.payloadSummary.isPublished
    case 'city_hall_contact':
      return item.payloadSummary.email ?? item.payloadSummary.phone
    case 'participation_report':
      return item.payloadSummary.observations ?? item.payloadSummary.debateTookPlace
    case 'contestation':
      return item.payloadSummary.contestedItem ?? item.payloadSummary.institutionEmail
    default:
      return null
  }
}
