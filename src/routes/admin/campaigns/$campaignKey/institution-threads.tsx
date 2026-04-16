import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { campaignAdminInstitutionThreadsRouteSearchSchema } from "@/features/campaigns/buget/admin/schemas/search-schema";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute(
  "/admin/campaigns/$campaignKey/institution-threads",
)({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  validateSearch: campaignAdminInstitutionThreadsRouteSearchSchema,
  head: (input) =>
    buildCampaignAdminInstitutionThreadsHead(
      (input.params as { campaignKey: string }).campaignKey,
    ),
});

function buildCampaignAdminInstitutionThreadsHead(campaignKey: string) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/institution-threads`;

  return {
    meta: [
      { title: "Institution threads - Transparenta.eu" },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
