import { createLazyFileRoute } from "@tanstack/react-router";
import { CampaignAdminHubPage } from "@/features/campaigns/buget/admin/components/CampaignAdminHubPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute("/admin/campaigns/$campaignKey/")({
  component: CampaignAdminHubRoute,
});

function CampaignAdminHubRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);

  return <CampaignAdminHubPage campaignKey={campaignKey} />;
}

function resolveCampaignAdminCampaignKey(
  campaignKey: string,
): CampaignAdminCampaignKey {
  if (campaignKey !== FUNKY_CAMPAIGN_KEY) {
    throw new Error(`Unsupported campaign admin key: ${campaignKey}`);
  }

  return campaignKey;
}
