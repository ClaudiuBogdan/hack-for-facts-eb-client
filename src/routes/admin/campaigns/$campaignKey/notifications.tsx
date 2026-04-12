import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { campaignAdminNotificationsRouteSearchSchema } from "@/features/campaigns/buget/admin/schemas/search-schema";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute(
  "/admin/campaigns/$campaignKey/notifications",
)({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  validateSearch: campaignAdminNotificationsRouteSearchSchema,
  head: ({ params }) => buildCampaignAdminNotificationsHead(params.campaignKey),
});

function buildCampaignAdminNotificationsHead(campaignKey: string) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/notifications`;

  return {
    meta: [
      { title: "Campaign notifications - Transparenta.eu" },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
