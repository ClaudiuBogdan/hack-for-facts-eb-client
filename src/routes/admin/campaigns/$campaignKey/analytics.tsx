import { createFileRoute } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { getSiteUrl } from "@/config/env";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute("/admin/campaigns/$campaignKey/analytics")(
  {
    ssr: false,
    headers: () => createNoStoreHeaders(),
    head: ({ params }) => buildCampaignAdminAnalyticsHead(params.campaignKey),
  },
);

function buildCampaignAdminAnalyticsHead(campaignKey: string) {
  const site = getSiteUrl();
  const canonical = `${site}/admin/campaigns/${campaignKey}/analytics`;

  return {
    meta: [
      { title: t`Campaign analytics - Transparenta.eu` },
      { name: "canonical", content: canonical },
      { name: "robots", content: "noindex,follow" },
    ],
  };
}
