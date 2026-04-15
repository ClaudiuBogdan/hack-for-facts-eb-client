import { createLazyFileRoute } from "@tanstack/react-router";
import { CampaignAdminAnalyticsPage } from "@/features/campaigns/buget/admin/components/CampaignAdminAnalyticsPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/analytics",
)({
  component: CampaignAdminAnalyticsRoute,
});

function CampaignAdminAnalyticsRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);

  return <CampaignAdminAnalyticsPage campaignKey={campaignKey} />;
}

function resolveCampaignAdminCampaignKey(
  campaignKey: string,
): CampaignAdminCampaignKey {
  if (campaignKey !== FUNKY_CAMPAIGN_KEY) {
    throw new Error(`Unsupported campaign admin key: ${campaignKey}`);
  }

  return campaignKey;
}
