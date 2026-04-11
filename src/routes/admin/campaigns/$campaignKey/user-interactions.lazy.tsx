import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { CampaignAdminUserInteractionsPage } from '@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage'
import { FUNKY_CAMPAIGN_KEY } from '@/features/campaigns/buget/admin/constants'
import type {
  CampaignAdminCampaignKey,
  CampaignAdminQueueSearch,
} from '@/features/campaigns/buget/admin/types'

export const Route = createLazyFileRoute('/admin/campaigns/$campaignKey/user-interactions')({
  component: CampaignAdminUserInteractionsRoute,
})

function CampaignAdminUserInteractionsRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams()
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey)
  const search = Route.useSearch()
  const navigate = useNavigate({
    from: '/admin/campaigns/$campaignKey/user-interactions',
  })

  return (
    <CampaignAdminUserInteractionsPage
      key={campaignKey}
      campaignKey={campaignKey}
      search={search}
      onSearchChange={(nextSearch, options) => {
        void navigate({
          search: toCampaignAdminRouteSearch(nextSearch),
          replace: options?.replace,
        })
      }}
    />
  )
}

function resolveCampaignAdminCampaignKey(campaignKey: string): CampaignAdminCampaignKey {
  if (campaignKey !== FUNKY_CAMPAIGN_KEY) {
    throw new Error(`Unsupported campaign admin key: ${campaignKey}`)
  }

  return campaignKey
}

function toCampaignAdminRouteSearch(
  search: CampaignAdminQueueSearch
){
  return {
    phase: search.phase,
    reviewStatusMode: search.reviewStatusMode,
    reviewStatus: search.reviewStatus,
    interactionId: search.interactionId,
    lessonId: search.lessonId,
    entityCui: search.entityCui,
    scopeType: search.scopeType,
    payloadKind: search.payloadKind,
    submissionPath: search.submissionPath,
    userId: search.userId,
    recordKey: search.recordKey,
    recordKeyPrefix: search.recordKeyPrefix,
    submittedAtFrom: search.submittedAtFrom,
    submittedAtTo: search.submittedAtTo,
    updatedAtFrom: search.updatedAtFrom,
    updatedAtTo: search.updatedAtTo,
    hasInstitutionThread: search.hasInstitutionThread,
    threadPhase: search.threadPhase,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    reviewSelectionKey: search.reviewSelectionKey,
    cursor: search.cursor,
    pageIndex: search.pageIndex,
    limit: search.limit,
  }
}
