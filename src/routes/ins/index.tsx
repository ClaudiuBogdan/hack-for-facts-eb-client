import { createFileRoute, redirect } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { fetchStatisticsHub } from "@/features/statistics/api/statistics-api";
import { statisticsHubQueryOptions } from "@/features/statistics/hooks/use-statistics-hub";
import { insPageMeta } from "@/features/statistics/lib/ins-head";
import { insLoaderSignal } from "@/features/statistics/lib/ssr-deadline";
import { createNoStoreHeaders, createPublicPageCacheHeaders } from "@/lib/http-cache";
import { shouldBlockLoaderForSsr } from "@/lib/ssr/loader-blocking";
import { parseStatisticsHubSearch } from "@/schemas/statistics";
import type { StatisticsHubData } from "@/schemas/statistics";

export type StatisticsHubLoaderData = {
  /** Present on the server render only; the page's own query supplies it in the browser. */
  readonly hub?: StatisticsHubData;
};

/**
 * The hub read happens once, on the server, and seeds the page's query.
 * Sections fail independently inside the read and are named in
 * `failures`; the read itself only throws on abort. In the browser the
 * read runs under the page's own key: a hover preload fills the cache the
 * click then draws from, and a read the cache already holds is not made
 * again.
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
  // Under the server's deadline: a section that does not answer in time
  // fails like one that answered wrong, and the browser reads it again.
  loader: async ({ context, abortController }): Promise<StatisticsHubLoaderData> => {
    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(statisticsHubQueryOptions()).catch(() => undefined);
      return {};
    }
    // Fetched directly, not through the query client: a query created on the
    // server is dehydrated with the server's `dataUpdatedAt`, so a copy served
    // from a shared cache past the figures' stale time would read again on
    // mount. The loader's data seeds the page's query with the client's clock.
    return { hub: await fetchStatisticsHub(insLoaderSignal(abortController.signal)) };
  },
  // A render with a failed section is not worth caching for everyone: it is
  // served once and the next request reads again. The document is rendered
  // in the language the locale cookie names, so a shared cache keys on it.
  headers: ({ loaderData }) =>
    !loaderData?.hub || loaderData.hub.failures.length > 0
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          vary: ["Accept-Encoding", "Cookie"],
        }),
  head: () => ({
    meta: insPageMeta({
      title: `${t`Statistici INS`} — Transparenta.eu`,
      description: t`Statistica oficială a României, pe înțelesul tuturor: salarii, inflație, șomaj și populație, pentru țară, județe și fiecare localitate, din datele INS.`,
    }),
  }),
});
