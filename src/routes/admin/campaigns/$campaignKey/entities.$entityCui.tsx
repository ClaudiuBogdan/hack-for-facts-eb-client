import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute(
  "/admin/campaigns/$campaignKey/entities/$entityCui",
)({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  head: ({ params }) =>
    buildCampaignAdminEntityDetailHead(params.campaignKey, params.entityCui),
});

function buildCampaignAdminEntityDetailHead(
  campaignKey: string,
  entityCui: string,
) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/entities/${encodeURIComponent(entityCui)}`;
  const title = "Campaign entity page - Transparenta.eu";

  return {
    meta: [
      { title },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
