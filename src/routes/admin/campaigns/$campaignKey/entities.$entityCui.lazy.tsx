import { createLazyFileRoute } from "@tanstack/react-router";
import { CampaignAdminEntityDetailPage } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/entities/$entityCui",
)({
  component: CampaignAdminEntityDetailPageRoute,
});

function CampaignAdminEntityDetailPageRoute() {
  const { campaignKey: rawCampaignKey, entityCui } = Route.useParams();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);

  return (
    <CampaignAdminEntityDetailPage
      key={`${campaignKey}:${entityCui}`}
      campaignKey={campaignKey}
      entityCui={entityCui}
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
