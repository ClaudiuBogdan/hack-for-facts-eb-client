import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { CampaignAdminEntityDetailPage } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/entities/$entityCui",
)({
  component: CampaignAdminEntityDetailPageRoute,
});

function CampaignAdminEntityDetailPageRoute() {
  const { campaignKey: rawCampaignKey, entityCui } = Route.useParams();
  const search = Route.useSearch() as CampaignAdminEntitiesSearch;
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/entities/$entityCui",
  });

  return (
    <CampaignAdminEntityDetailPage
      key={`${campaignKey}:${entityCui}`}
      campaignKey={campaignKey}
      entityCui={entityCui}
      search={search}
      onSearchChange={(nextSearch, options) => {
        void navigate({
          search: toCampaignAdminEntitiesRouteSearch(nextSearch),
          replace: options?.replace,
        });
      }}
    />
  );
}

function resolveCampaignAdminCampaignKey(
  campaignKey: string,
): CampaignAdminCampaignKey {
  if (campaignKey !== FUNKY_CAMPAIGN_KEY) {
    throw new Error(`Unsupported campaign admin key: ${campaignKey}`);
  }

  return campaignKey;
}

function toCampaignAdminEntitiesRouteSearch(
  search: CampaignAdminEntitiesSearch,
) {
  return {
    tab: search.tab,
    query: search.query,
    interactionId: search.interactionId,
    hasPendingReviews: search.hasPendingReviews,
    hasSubscribers: search.hasSubscribers,
    hasNotificationActivity: search.hasNotificationActivity,
    hasFailedNotifications: search.hasFailedNotifications,
    latestNotificationType: search.latestNotificationType,
    latestNotificationStatus: search.latestNotificationStatus,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    cursor: search.cursor,
    pageIndex: search.pageIndex,
    limit: search.limit,
    configEntityCui: search.configEntityCui,
    configBudgetPublicationDate: search.configBudgetPublicationDate,
    configHasBudgetPublicationDate: search.configHasBudgetPublicationDate,
    configOfficialBudgetUrl: search.configOfficialBudgetUrl,
    configHasOfficialBudgetUrl: search.configHasOfficialBudgetUrl,
    configUpdatedAtFrom: search.configUpdatedAtFrom,
    configUpdatedAtTo: search.configUpdatedAtTo,
    configSortBy: search.configSortBy,
    configSortOrder: search.configSortOrder,
    configCursor: search.configCursor,
    configPageIndex: search.configPageIndex,
    configLimit: search.configLimit,
    selectedEntityCui: search.selectedEntityCui,
    configCreate: search.configCreate,
    threadsStateGroup: search.threadsStateGroup,
    threadsThreadState: search.threadsThreadState,
    threadsResponseStatus: search.threadsResponseStatus,
    threadsQuery: search.threadsQuery,
    threadsEntityCui: search.threadsEntityCui,
    threadsUpdatedAtFrom: search.threadsUpdatedAtFrom,
    threadsUpdatedAtTo: search.threadsUpdatedAtTo,
    threadsLatestResponseAtFrom: search.threadsLatestResponseAtFrom,
    threadsLatestResponseAtTo: search.threadsLatestResponseAtTo,
    threadsSelectedThreadId: search.threadsSelectedThreadId,
    threadsCursor: search.threadsCursor,
    threadsPageIndex: search.threadsPageIndex,
    threadsLimit: search.threadsLimit,
  };
}
