/* eslint-disable react-refresh/only-export-components */
import {
  createLazyFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { CampaignAdminEntitiesPage } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/entities",
)({
  component: CampaignAdminEntitiesRoute,
});

function CampaignAdminEntitiesRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/entities",
  });
  const entitiesBasePath = `/admin/campaigns/${campaignKey}/entities`;
  const isEntitiesIndexRoute =
    location.pathname === entitiesBasePath ||
    location.pathname === `${entitiesBasePath}/`;

  if (!isEntitiesIndexRoute) {
    return <Outlet />;
  }

  return (
    <CampaignAdminEntitiesPage
      key={campaignKey}
      campaignKey={campaignKey}
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
    configUpdatedAtFrom: search.configUpdatedAtFrom,
    configUpdatedAtTo: search.configUpdatedAtTo,
    configSortBy: search.configSortBy,
    configSortOrder: search.configSortOrder,
    configCursor: search.configCursor,
    configPageIndex: search.configPageIndex,
    configLimit: search.configLimit,
    selectedEntityCui: search.selectedEntityCui,
    configCreate: search.configCreate,
  };
}
