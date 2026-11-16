import {
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  pnrrApi,
  type PnrrOrganizationListFilters,
  type PnrrProjectListFilters,
} from "../api/pnrr-api";
import { GraphQLRequestError } from "@/lib/graphql/graphql-client";
import type { PnrrLiveRelease } from "@/schemas/pnrr-live";

const PNRR_LIVE_QUERY_KEY = ["pnrr-live"] as const;

/**
 * The active release is re-read on entry (once the cached copy is older than
 * this) and while the page stays open and visible. A new release id changes
 * every fact query key, so all PNRR reads move to the new release together.
 */
export const PNRR_LIVE_STATUS_STALE_MS = 30_000;
export const PNRR_LIVE_STATUS_REFETCH_INTERVAL_MS = 5 * 60_000;
const PNRR_LIVE_STATUS_RETRY_COUNT = 2;

export const pnrrLiveQueryKeys = {
  status: () => [...PNRR_LIVE_QUERY_KEY, "status"] as const,
  overview: (releaseId: string | null) =>
    [...PNRR_LIVE_QUERY_KEY, "overview", releaseId] as const,
};

/**
 * A fact answer that names a different release than the one the client
 * asserted. The server normally refuses with RELEASE_MISMATCH; this guards the
 * same invariant on the client so two snapshots are never shown side by side.
 */
export class PnrrReleaseDivergenceError extends Error {
  constructor(
    readonly expectedReleaseId: string | undefined,
    readonly receivedReleaseId: string,
  ) {
    super("PNRR answer belongs to a different release than the one asserted");
    this.name = "PnrrReleaseDivergenceError";
  }
}

export function assertPnrrAnswerRelease<
  T extends { readonly meta: { readonly release: PnrrLiveRelease } },
>(answer: T, assertReleaseId: string | undefined): T {
  if (answer.meta.release.releaseId !== assertReleaseId) {
    throw new PnrrReleaseDivergenceError(
      assertReleaseId,
      answer.meta.release.releaseId,
    );
  }
  return answer;
}

export const isPnrrReleaseMismatch = (error: unknown): boolean =>
  error instanceof PnrrReleaseDivergenceError ||
  (error instanceof GraphQLRequestError &&
    error.graphQLErrors.some(
      (entry) => entry.extensions?.["code"] === "RELEASE_MISMATCH",
    ));

/** One read for the overview, shared by the browser hook and the SSR loader. */
export async function readPnrrLiveOverview(
  assertReleaseId: string,
  signal?: AbortSignal,
) {
  return assertPnrrAnswerRelease(
    await pnrrApi.overview(assertReleaseId, signal),
    assertReleaseId,
  );
}

export function pnrrLiveStatusQueryOptions() {
  return queryOptions({
    queryKey: pnrrLiveQueryKeys.status(),
    queryFn: ({ signal }) => pnrrApi.status(signal),
    staleTime: PNRR_LIVE_STATUS_STALE_MS,
    refetchInterval: PNRR_LIVE_STATUS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: PNRR_LIVE_STATUS_RETRY_COUNT,
  });
}

export function pnrrLiveOverviewQueryOptions(releaseId: string | undefined) {
  return queryOptions({
    queryKey: pnrrLiveQueryKeys.overview(releaseId ?? null),
    queryFn: ({ signal }) => readPnrrLiveOverview(releaseId ?? "", signal),
    enabled: Boolean(releaseId),
  });
}

function useReleaseMismatchRecovery() {
  const queryClient = useQueryClient();
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (isPnrrReleaseMismatch(error)) {
        await queryClient.invalidateQueries({
          queryKey: pnrrLiveQueryKeys.status(),
        });
      }
      throw error;
    }
  };
}

export function usePnrrLiveStatus() {
  const queryClient = useQueryClient();
  const query = useQuery(pnrrLiveStatusQueryOptions());
  useEffect(() => {
    if (query.data?.pnrrCurrentRelease.state !== "abstained") return;
    void queryClient.cancelQueries({
      predicate: (candidate) =>
        candidate.queryKey[0] === PNRR_LIVE_QUERY_KEY[0] &&
        candidate.queryKey[1] !== "status",
    });
  }, [query.data?.pnrrCurrentRelease.state, queryClient]);
  return query;
}

export function getPnrrFactReleaseId(
  release: PnrrLiveRelease | null | undefined,
): string | undefined {
  return release?.state === "abstained" ? undefined : release?.releaseId;
}

function usePnrrFactReleaseId(): string | undefined {
  const status = usePnrrLiveStatus();
  return getPnrrFactReleaseId(status.data?.pnrrCurrentRelease);
}

export function usePnrrLiveOverview() {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    ...pnrrLiveOverviewQueryOptions(assertReleaseId),
    queryFn: ({ signal }) =>
      run(() => readPnrrLiveOverview(assertReleaseId ?? "", signal)),
  });
}

export function usePnrrLiveProjects(input: {
  readonly filters: PnrrProjectListFilters;
  readonly first: number;
  readonly after?: string;
}) {
  const assertReleaseId = usePnrrFactReleaseId();
  const releaseBoundInput = { ...input, assertReleaseId };
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "projects", releaseBoundInput],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.projects(releaseBoundInput, signal)),
    enabled: Boolean(assertReleaseId),
  });
}

export function usePnrrLiveProjectFacets(filters: PnrrProjectListFilters) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [
      ...PNRR_LIVE_QUERY_KEY,
      "project-facets",
      filters,
      assertReleaseId ?? null,
    ],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.projectFacets(filters, assertReleaseId, signal)),
    enabled: Boolean(assertReleaseId),
  });
}

export function usePnrrLiveProject(key: string) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "project", key, assertReleaseId ?? null],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.project(key, assertReleaseId, signal)),
    enabled: key.length > 0 && Boolean(assertReleaseId),
  });
}

export function usePnrrLiveProjectHistory(key: string) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [
      ...PNRR_LIVE_QUERY_KEY,
      "project-history",
      key,
      assertReleaseId ?? null,
    ],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.projectHistory(key, assertReleaseId, signal)),
    enabled: key.length > 0 && Boolean(assertReleaseId),
  });
}

function usePnrrLivePaginatedSource<
  T extends {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  },
>(
  key: string,
  read: (
    input: {
      readonly first: number;
      readonly after?: string;
      readonly assertReleaseId?: string;
    },
    signal: AbortSignal,
  ) => Promise<T>,
) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useInfiniteQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "source", key, assertReleaseId ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      run(() =>
        read(
          {
            first: 24,
            after: pageParam,
            assertReleaseId,
          },
          signal,
        ),
      ),
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage && lastPage.pageInfo.endCursor
        ? lastPage.pageInfo.endCursor
        : undefined,
    enabled: Boolean(assertReleaseId),
  });
}

export const usePnrrLiveFundingCalls = () =>
  usePnrrLivePaginatedSource("funding-calls", (input, signal) =>
    pnrrApi.fundingCalls(input, signal),
  );

export const usePnrrLiveFundingApplications = () =>
  usePnrrLivePaginatedSource("funding-applications", (input, signal) =>
    pnrrApi.fundingApplications(input, signal),
  );

export const usePnrrLiveProgramRevisions = () =>
  usePnrrLivePaginatedSource("program-revisions", (input, signal) =>
    pnrrApi.programRevisions(input, signal),
  );

export const usePnrrLiveCatalogResources = () =>
  usePnrrLivePaginatedSource("catalog-resources", (input, signal) =>
    pnrrApi.catalogResources(input, signal),
  );

export const usePnrrLiveDocumentReferences = () =>
  usePnrrLivePaginatedSource("document-references", (input, signal) =>
    pnrrApi.documentReferences(input, signal),
  );

export function usePnrrLiveOrganization(cui: string, enabled = true) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [
      ...PNRR_LIVE_QUERY_KEY,
      "organization-identity",
      cui,
      assertReleaseId ?? null,
    ],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.organizationIdentity(cui, assertReleaseId, signal)),
    enabled: enabled && cui.length > 0 && Boolean(assertReleaseId),
  });
}

export function usePnrrLiveOrganizationProfile(cui: string, enabled = true) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [
      ...PNRR_LIVE_QUERY_KEY,
      "organization-profile",
      cui,
      assertReleaseId ?? null,
    ],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.organizationProfile(cui, assertReleaseId, signal)),
    enabled: enabled && cui.length > 0 && Boolean(assertReleaseId),
  });
}

function usePnrrLivePaginatedOrganizationCollection<
  T extends {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  },
>(
  key: string,
  cui: string,
  read: (
    cui: string,
    input: {
      readonly first: number;
      readonly after?: string;
      readonly assertReleaseId?: string;
    },
    signal: AbortSignal,
  ) => Promise<T>,
) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useInfiniteQuery({
    queryKey: [
      ...PNRR_LIVE_QUERY_KEY,
      "organization-collection",
      key,
      cui,
      assertReleaseId ?? null,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      run(() =>
        read(
          cui,
          {
            first: 10,
            after: pageParam,
            assertReleaseId,
          },
          signal,
        ),
      ),
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage && lastPage.pageInfo.endCursor
        ? lastPage.pageInfo.endCursor
        : undefined,
    enabled: cui.length > 0 && Boolean(assertReleaseId),
  });
}

export const usePnrrLiveOrganizationPayments = (cui: string) =>
  usePnrrLivePaginatedOrganizationCollection(
    "payments",
    cui,
    (organizationCui, input, signal) =>
      pnrrApi.organizationPayments(organizationCui, input, signal),
  );

export const usePnrrLiveOrganizationCommitments = (cui: string) =>
  usePnrrLivePaginatedOrganizationCollection(
    "commitments",
    cui,
    (organizationCui, input, signal) =>
      pnrrApi.organizationCommitments(organizationCui, input, signal),
  );

export const usePnrrLiveOrganizationProjects = (cui: string) =>
  usePnrrLivePaginatedOrganizationCollection(
    "projects",
    cui,
    (organizationCui, input, signal) =>
      pnrrApi.organizationProjects(organizationCui, input, signal),
  );

export const usePnrrLiveOrganizationProcurement = (cui: string) =>
  usePnrrLivePaginatedOrganizationCollection(
    "procurement",
    cui,
    (organizationCui, input, signal) =>
      pnrrApi.organizationProcurement(organizationCui, input, signal),
  );

export function usePnrrLiveOrganizations(input: {
  readonly filters: PnrrOrganizationListFilters;
  readonly first: number;
  readonly after?: string;
}) {
  const assertReleaseId = usePnrrFactReleaseId();
  const releaseBoundInput = { ...input, assertReleaseId };
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "organizations", releaseBoundInput],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.organizations(releaseBoundInput, signal)),
    enabled: Boolean(assertReleaseId),
  });
}

export function usePnrrLivePlace(countySiruta: string) {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [
      ...PNRR_LIVE_QUERY_KEY,
      "place",
      countySiruta,
      assertReleaseId ?? null,
    ],
    queryFn: ({ signal }) =>
      run(async () => {
        const place = await pnrrApi.place(countySiruta, assertReleaseId, signal);
        return place === null
          ? null
          : assertPnrrAnswerRelease(place, assertReleaseId);
      }),
    enabled: countySiruta.length > 0 && Boolean(assertReleaseId),
  });
}

export function usePnrrLivePlaces() {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "places", assertReleaseId ?? null],
    queryFn: ({ signal }) => run(() => pnrrApi.places(assertReleaseId, signal)),
    enabled: Boolean(assertReleaseId),
  });
}

export function usePnrrLiveVerification() {
  const assertReleaseId = usePnrrFactReleaseId();
  const run = useReleaseMismatchRecovery();
  return useQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "verification", assertReleaseId ?? null],
    queryFn: ({ signal }) =>
      run(async () =>
        assertPnrrAnswerRelease(
          await pnrrApi.verification(assertReleaseId, signal),
          assertReleaseId,
        ),
      ),
    enabled: Boolean(assertReleaseId),
  });
}
