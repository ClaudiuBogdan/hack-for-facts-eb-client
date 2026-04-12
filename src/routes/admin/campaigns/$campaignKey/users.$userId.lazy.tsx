import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { CampaignAdminUserPage } from "@/features/campaigns/buget/admin/components/CampaignAdminUserPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminUserPageSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute("/admin/campaigns/$campaignKey/users/$userId")({
  component: CampaignAdminUserPageRoute,
});

function CampaignAdminUserPageRoute() {
  const { campaignKey: rawCampaignKey, userId } = Route.useParams();
  const search = Route.useSearch();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/users/$userId",
  });

  return (
    <CampaignAdminUserPage
      key={`${campaignKey}:${userId}`}
      campaignKey={campaignKey}
      userId={userId}
      search={search}
      onSearchChange={(nextSearch, options) => {
        void navigate({
          search: toCampaignAdminUserPageRouteSearch(nextSearch),
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

function toCampaignAdminUserPageRouteSearch(search: CampaignAdminUserPageSearch) {
  return {
    query: undefined,
    reviewStatus: search.reviewStatus,
    interactionId: search.interactionId,
    lessonId: search.lessonId,
    entityCui: search.entityCui,
    scopeType: search.scopeType,
    payloadKind: search.payloadKind,
    submissionPath: search.submissionPath,
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
    cursor: undefined,
    pageIndex: undefined,
    limit: 50,
  };
}
