import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { campaignAdminEntitiesRouteSearchSchema } from "@/features/campaigns/buget/admin/schemas/search-schema";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute("/admin/campaigns/$campaignKey/entities")(
  {
    ssr: false,
    headers: () => createNoStoreHeaders(),
    validateSearch: campaignAdminEntitiesRouteSearchSchema,
    head: ({ params }) => buildCampaignAdminEntitiesHead(params.campaignKey),
  },
);

function buildCampaignAdminEntitiesHead(campaignKey: string) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/entities`;

  return {
    meta: [
      { title: "Campaign entities - Transparenta.eu" },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
