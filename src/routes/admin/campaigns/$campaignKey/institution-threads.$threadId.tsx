import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute(
  "/admin/campaigns/$campaignKey/institution-threads/$threadId",
)({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  head: (input) =>
    buildCampaignAdminInstitutionThreadDetailHead(
      (input.params as { campaignKey: string }).campaignKey,
      (input.params as { threadId: string }).threadId,
    ),
});

function buildCampaignAdminInstitutionThreadDetailHead(
  campaignKey: string,
  threadId: string,
) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/institution-threads/${encodeURIComponent(threadId)}`;

  return {
    meta: [
      { title: "Institution thread - Transparenta.eu" },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
