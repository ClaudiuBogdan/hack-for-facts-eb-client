import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { CampaignAdminNotificationsPage } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationsSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/notifications",
)({
  component: CampaignAdminNotificationsRoute,
});

function CampaignAdminNotificationsRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);
  const search = Route.useSearch();
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/notifications",
  });

  return (
    <CampaignAdminNotificationsPage
      key={campaignKey}
      campaignKey={campaignKey}
      search={search}
      onSearchChange={(nextSearch, options) => {
        void navigate({
          search: toCampaignAdminNotificationsRouteSearch(nextSearch),
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

function toCampaignAdminNotificationsRouteSearch(
  search: CampaignAdminNotificationsSearch,
) {
  return {
    tab: search.tab,
    notificationType: search.notificationType,
    templateId: search.templateId,
    userId: search.userId,
    status: search.status,
    eventType: search.eventType,
    entityCui: search.entityCui,
    threadId: search.threadId,
    source: search.source,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    runNotificationType: search.runNotificationType,
    runConditions: search.runConditions,
    previewId: search.previewId,
    previewCursor: search.previewCursor,
    previewPageIndex: search.previewPageIndex,
    previewTrail: search.previewTrail,
    previewFilter: search.previewFilter,
    cursor: search.cursor,
    pageIndex: search.pageIndex,
    limit: search.limit,
  };
}
