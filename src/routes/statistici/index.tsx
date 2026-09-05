import {
  loadNativeLanding,
  type NativeLandingBootstrap,
} from "@/features/statistics/hooks/use-native-landing";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { fetchLandingCatalog } from "@/features/statistics/api/statistics-api";
import { createPublicPageCacheHeaders } from "@/lib/http-cache";
import { parseStatisticsLandingSearch } from "@/schemas/statistics";
import type { StatisticsLandingCatalog } from "@/schemas/statistics";

export type StatisticsLandingLoaderData = {
  readonly landingData: NativeLandingBootstrap | null;
  readonly landingCatalog: StatisticsLandingCatalog | null;
};

/** Full source reads build compact, independent outcomes before server rendering. */
export const Route = createFileRoute("/statistici/")({
  validateSearch: parseStatisticsLandingSearch,
  loader: async ({ abortController }): Promise<StatisticsLandingLoaderData> => {
    const [landingData, landingCatalog] = await Promise.allSettled([
      loadNativeLanding(abortController.signal),
      fetchLandingCatalog(abortController.signal),
    ]);
    abortController.signal.throwIfAborted();
    return {
      landingData:
        landingData.status === "fulfilled" ? landingData.value : null,
      landingCatalog:
        landingCatalog.status === "fulfilled" ? landingCatalog.value : null,
    };
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => ({
    meta: [
      { title: `${t`Statistici INS`} — Transparenta.eu` },
      {
        name: "description",
        content: t`România în cifre: populație, salariați, șomaj și locuințe pentru fiecare localitate, județ și pentru întreaga țară — date oficiale INS Tempo.`,
      },
    ],
  }),
});
