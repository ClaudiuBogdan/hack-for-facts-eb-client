import { createFileRoute, notFound } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import {
  fetchNgoProfileOverview,
  type NgoProfileOverview,
} from "@/features/ngos/profile/api";
import { normalizeNgoCui } from "@/features/ngos/lib/normalize-ngo-cui";
import { parseNgoProfileSearch } from "@/schemas/ngos";
export type NgoProfileRouteLoaderData = {
  readonly profile: NgoProfileOverview;
};
export const Route = createFileRoute("/ong-uri/$cui")({
  validateSearch: parseNgoProfileSearch,
  loader: async ({ params }) => {
    const cui = normalizeNgoCui(params.cui);
    if (!cui || !/^[1-9][0-9]{1,9}$/.test(cui)) throw notFound();
    const profile = await fetchNgoProfileOverview(cui);
    if (profile === null) throw notFound();
    return { profile } satisfies NgoProfileRouteLoaderData;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.profile.registryRecords[0].nameWithheld ? t`Name pending verification` : (loaderData?.profile.registryRecords[0].name ?? t`NGO profile`)} | Transparenta.eu`,
      },
      {
        name: "description",
        content: t`Registry observations and dated fiscal information linked by CUI.`,
      },
    ],
  }),
});
