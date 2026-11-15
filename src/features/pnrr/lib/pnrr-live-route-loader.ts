import type { QueryClient } from "@tanstack/react-query";
import { createLogger } from "@/lib/logger";
import { withDeadline } from "@/lib/ssr/deadline-signal";
import { shouldBlockLoaderForSsr } from "@/lib/ssr/loader-blocking";
import {
  PNRR_RELEASE_LANES,
  type PnrrLiveOverview,
  type PnrrLiveRelease,
} from "@/schemas/pnrr-live";
import { pnrrApi } from "../api/pnrr-api";
import {
  getPnrrFactReleaseId,
  pnrrLiveOverviewQueryOptions,
  pnrrLiveStatusQueryOptions,
  readPnrrLiveOverview,
} from "../hooks/use-pnrr-live-data";

/**
 * The `/pnrr` route's reads. On the server the loader reads the active release
 * and then that release's publisher-reported MIPE overview through the same
 * query options the page's hooks use, so the router hydrates them into the
 * browser cache under the release id. It reads no project rows and nothing
 * from the frozen file set. A read that fails or passes the deadline is left
 * out of the cache: the page reads it in the browser and shows its own
 * loading or error state, and the render goes out `no-store`. On a client
 * navigation the loader starts the release read and returns at once.
 */

/** TanStack Start sends no HTML until loaders settle; two reads share this. */
export const PNRR_SSR_DEADLINE_MS = 1_500;

const logger = createLogger("pnrr-live-route-loader");

/** What the document head may say, taken only from the active release. */
export type PnrrLiveHeadFacts = {
  readonly releaseId: string;
  readonly releaseState: PnrrLiveRelease["state"];
  readonly mipeProjectsAsOf: string | null;
  readonly ordsPaymentsCaptureAsOf: string | null;
  /** Publisher-reported MIPE project count; null when unavailable. */
  readonly reportedProjectCount: number | null;
};

export type PnrrLiveRouteLoaderData = {
  /** `false` when a server read failed and the browser reads it again. */
  readonly seeded: boolean;
  readonly head: PnrrLiveHeadFacts | null;
};

const laneAsOf = (release: PnrrLiveRelease, lane: string): string | null =>
  release.lanes.find((candidate) => candidate.lane === lane)?.asOf ?? null;

export function buildPnrrLiveHeadFacts({
  release,
  overview,
}: {
  readonly release: PnrrLiveRelease;
  readonly overview: PnrrLiveOverview | null;
}): PnrrLiveHeadFacts {
  const sameRelease =
    overview !== null && overview.meta.release.releaseId === release.releaseId;
  return {
    releaseId: release.releaseId,
    releaseState: release.state,
    mipeProjectsAsOf: laneAsOf(release, PNRR_RELEASE_LANES.mipeProjects),
    ordsPaymentsCaptureAsOf: laneAsOf(
      release,
      PNRR_RELEASE_LANES.ordsPaymentsCapture,
    ),
    reportedProjectCount: sameRelease ? overview.program.projectCount : null,
  };
}

function readCachedHeadFacts(
  queryClient: QueryClient,
): PnrrLiveHeadFacts | null {
  const status = queryClient.getQueryData(
    pnrrLiveStatusQueryOptions().queryKey,
  );
  if (!status) return null;
  const releaseId = getPnrrFactReleaseId(status.pnrrCurrentRelease);
  const overview = releaseId
    ? queryClient.getQueryData(pnrrLiveOverviewQueryOptions(releaseId).queryKey)
    : undefined;
  return buildPnrrLiveHeadFacts({
    release: status.pnrrCurrentRelease,
    overview: overview ?? null,
  });
}

export async function loadPnrrLiveOverviewRoute({
  queryClient,
  blockForSsr = shouldBlockLoaderForSsr(),
  deadlineMs = PNRR_SSR_DEADLINE_MS,
}: {
  readonly queryClient: QueryClient;
  readonly blockForSsr?: boolean;
  readonly deadlineMs?: number;
}): Promise<PnrrLiveRouteLoaderData> {
  const statusOptions = pnrrLiveStatusQueryOptions();

  if (!blockForSsr) {
    void queryClient.prefetchQuery(statusOptions);
    return { seeded: true, head: readCachedHeadFacts(queryClient) };
  }

  const signal = withDeadline(undefined, deadlineMs);

  let release: PnrrLiveRelease;
  try {
    const status = await queryClient.ensureQueryData({
      ...statusOptions,
      queryFn: () => pnrrApi.status(signal),
      retry: false,
    });
    release = status.pnrrCurrentRelease;
  } catch (error) {
    logger.warn("PNRR release read for SSR failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    queryClient.removeQueries({ queryKey: statusOptions.queryKey, exact: true });
    return { seeded: false, head: null };
  }

  const releaseId = getPnrrFactReleaseId(release);
  // An abstained release is a complete, honest answer: no fact is read.
  if (!releaseId) {
    return { seeded: true, head: buildPnrrLiveHeadFacts({ release, overview: null }) };
  }

  const overviewOptions = pnrrLiveOverviewQueryOptions(releaseId);
  try {
    const overview = await queryClient.ensureQueryData({
      ...overviewOptions,
      queryFn: () => readPnrrLiveOverview(releaseId, signal),
      retry: false,
    });
    return { seeded: true, head: buildPnrrLiveHeadFacts({ release, overview }) };
  } catch (error) {
    logger.warn("PNRR overview read for SSR failed", {
      releaseId,
      error: error instanceof Error ? error.message : String(error),
    });
    queryClient.removeQueries({
      queryKey: overviewOptions.queryKey,
      exact: true,
    });
    return {
      seeded: false,
      head: buildPnrrLiveHeadFacts({ release, overview: null }),
    };
  }
}
