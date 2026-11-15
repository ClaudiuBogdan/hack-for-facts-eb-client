import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { createLogger } from "@/lib/logger";
import { shouldBlockLoaderForSsr } from "@/lib/ssr/loader-blocking";
import {
  DEFAULT_CURRENCY,
  readClientCurrencyPreference,
  readUserCurrencyPreference,
} from "@/lib/user-preferences";
import type { Currency } from "@/schemas/charts";
import type { PnrrSearchState } from "@/schemas/pnrr";
import type { PnrrServerOverview } from "../workers/pnrr-worker-types";
import {
  loadPnrrLiveOverviewRoute,
  type PnrrLiveRouteLoaderData,
} from "./pnrr-live-route-loader";
import {
  buildPnrrOverviewSearchKey,
  pnrrOverviewQueryKey,
} from "./pnrr-overview-request";

/**
 * The `/pnrr` route's reads. The active release and its publisher-reported
 * MIPE totals come through the release loader (for the head and the visible
 * source dates); the dashboard overview comes from the web server's release
 * model in memory only, so the render never waits for a snapshot and never
 * reads project rows. Missing from memory, the overview is read by the page
 * and the render goes out `no-store`.
 */

const logger = createLogger("pnrr-dashboard-route-loader");

export type PnrrDashboardRouteLoaderData = PnrrLiveRouteLoaderData & {
  readonly initialCurrency: Currency;
};

type ServerOverviewInput = {
  readonly search: Partial<PnrrSearchState>;
  readonly releaseId: string;
};

const readInitialCurrency = createIsomorphicFn()
  .client(
    async (): Promise<Currency> =>
      readClientCurrencyPreference() ?? DEFAULT_CURRENCY,
  )
  .server(async (): Promise<Currency> => readUserCurrencyPreference());

const readServerOverview = createIsomorphicFn()
  .client(
    async (_input: ServerOverviewInput): Promise<PnrrServerOverview | null> =>
      null,
  )
  .server(
    async (input: ServerOverviewInput): Promise<PnrrServerOverview | null> => {
      const { readPnrrOverviewForSsr } = await import(
        "@/server/handlers/pnrr-overview"
      );
      return readPnrrOverviewForSsr(input.search, input.releaseId);
    },
  );

export async function loadPnrrDashboardRoute({
  queryClient,
  search,
  includeOverview,
  blockForSsr = shouldBlockLoaderForSsr(),
  readOverview = readServerOverview,
  readCurrency = readInitialCurrency,
}: {
  readonly queryClient: QueryClient;
  /** The overview's data filters (the SEO-normalised page search). */
  readonly search: Partial<PnrrSearchState>;
  /** Only the overview tab shows the overview. */
  readonly includeOverview: boolean;
  readonly blockForSsr?: boolean;
  readonly readOverview?: (
    input: ServerOverviewInput,
  ) => Promise<PnrrServerOverview | null>;
  readonly readCurrency?: () => Promise<Currency>;
}): Promise<PnrrDashboardRouteLoaderData> {
  const [live, initialCurrency] = await Promise.all([
    loadPnrrLiveOverviewRoute({ queryClient, blockForSsr }),
    readCurrency(),
  ]);
  const releaseId =
    live.head && live.head.releaseState !== "abstained"
      ? live.head.releaseId
      : null;

  if (!blockForSsr || !includeOverview || !releaseId) {
    return { ...live, initialCurrency };
  }

  let overview: PnrrServerOverview | null = null;
  try {
    overview = await readOverview({ search, releaseId });
  } catch (error) {
    logger.warn("PNRR dashboard overview for SSR failed", {
      releaseId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  // Built from another release, it must not be shown under this one.
  if (!overview || overview.fileSetId !== releaseId) {
    return { ...live, seeded: false, initialCurrency };
  }

  queryClient.setQueryData(
    pnrrOverviewQueryKey(releaseId, buildPnrrOverviewSearchKey(search)),
    overview,
  );
  return { ...live, initialCurrency };
}
