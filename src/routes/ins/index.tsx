import { createFileRoute, redirect } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { fetchStatisticsHub } from "@/features/statistics/api/statistics-api";
import { createNoStoreHeaders, createPublicPageCacheHeaders } from "@/lib/http-cache";
import { parseStatisticsHubSearch } from "@/schemas/statistics";
import type { StatisticsHubData } from "@/schemas/statistics";

export type StatisticsHubLoaderData = {
  readonly hub: StatisticsHubData;
};

/**
 * The hub read happens once, on the server, and seeds the page's query.
 * Sections fail independently inside the read and are named in
 * `failures`; the read itself only throws on abort.
 */
export const Route = createFileRoute("/ins/")({
  validateSearch: parseStatisticsHubSearch,
  // The retired landing shared `?loc=<siruta>` links to its „Locul tău"
  // band; that place now has its own page.
  beforeLoad: ({ location }) => {
    const raw = (location.search as Record<string, unknown>).loc;
    const siruta =
      typeof raw === "number"
        ? String(raw)
        : typeof raw === "string"
          ? raw.trim()
          : undefined;
    if (siruta && /^\d{1,6}$/.test(siruta)) {
      throw redirect({
        to: "/ins/teritorii/$siruta",
        params: { siruta },
        replace: true,
      });
    }
  },
  loader: async ({ abortController }): Promise<StatisticsHubLoaderData> => ({
    hub: await fetchStatisticsHub(abortController.signal),
  }),
  // A render with a failed section is not worth caching for everyone: it is
  // served once and the next request reads again.
  headers: ({ loaderData }) =>
    !loaderData || loaderData.hub.failures.length > 0
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
        }),
  head: () => ({
    meta: [
      { title: `${t`Statistici INS`} — Transparenta.eu` },
      {
        name: "description",
        content: t`Cifrele oficiale ale României, de la Institutul Național de Statistică: inflație, salarii, șomaj, populație, locuințe și turism, pentru țară, județe și fiecare localitate.`,
      },
    ],
  }),
});
