import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { campaignAdminUserPageRouteSearchSchema } from "@/features/campaigns/buget/admin/schemas/search-schema";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute("/admin/campaigns/$campaignKey/users/$userId")({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  validateSearch: campaignAdminUserPageRouteSearchSchema,
  head: ({ params }) => buildCampaignAdminUserPageHead(params.campaignKey, params.userId),
});

function buildCampaignAdminUserPageHead(
  campaignKey: string,
  userId: string,
) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/users/${encodeURIComponent(userId)}`;
  const title = "Campaign user page - Transparenta.eu";

  return {
    meta: [
      { title },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
