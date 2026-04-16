import { createLazyFileRoute } from "@tanstack/react-router";
import { CampaignAdminInstitutionThreadDetailPage } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/institution-threads/$threadId",
)({
  component: CampaignAdminInstitutionThreadDetailRoute,
});

function CampaignAdminInstitutionThreadDetailRoute() {
  const { campaignKey: rawCampaignKey, threadId } = Route.useParams() as {
    campaignKey: string;
    threadId: string;
  };
  const search = Route.useSearch() as CampaignAdminInstitutionThreadsSearch;
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);

  return (
    <CampaignAdminInstitutionThreadDetailPage
      key={`${campaignKey}:${threadId}`}
      campaignKey={campaignKey}
      threadId={threadId}
      search={search as CampaignAdminInstitutionThreadsSearch}
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
