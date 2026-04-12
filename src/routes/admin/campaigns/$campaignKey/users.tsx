import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/config/env";
import { campaignAdminUsersRouteSearchSchema } from "@/features/campaigns/buget/admin/schemas/search-schema";
import { createNoStoreHeaders } from "@/lib/http-cache";

export const Route = createFileRoute("/admin/campaigns/$campaignKey/users")({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  validateSearch: campaignAdminUsersRouteSearchSchema,
  head: ({ params }) => {
    const site = getSiteUrl();
    const canonical = `${site}/admin/campaigns/${params.campaignKey}/users`;

    return {
      meta: [
        { title: "Campaign users - Transparenta.eu" },
        { name: "canonical", content: canonical },
        { name: "robots", content: "noindex,follow" },
      ],
    };
  },
});
