import {
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

const isReleaseMismatch = (error: unknown): boolean =>
  error instanceof GraphQLRequestError &&
  error.graphQLErrors.some(
    (entry) => entry.extensions?.["code"] === "RELEASE_MISMATCH",
  );

function useReleaseMismatchRecovery() {
  const queryClient = useQueryClient();
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (isReleaseMismatch(error)) {
        await queryClient.invalidateQueries({
          queryKey: [...PNRR_LIVE_QUERY_KEY, "status"],
        });
      }
      throw error;
    }
  };
}

export function usePnrrLiveStatus() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...PNRR_LIVE_QUERY_KEY, "status"],
    queryFn: ({ signal }) => pnrrApi.status(signal),
  });
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
    queryKey: [...PNRR_LIVE_QUERY_KEY, "overview", assertReleaseId ?? null],
    queryFn: ({ signal }) =>
      run(() => pnrrApi.overview(assertReleaseId, signal)),
    enabled: Boolean(assertReleaseId),
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

export function usePnrrLiveOrganization(cui: string) {
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
    enabled: cui.length > 0 && Boolean(assertReleaseId),
  });
}

export function usePnrrLiveOrganizationProfile(cui: string) {
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
    enabled: cui.length > 0 && Boolean(assertReleaseId),
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
      run(() => pnrrApi.place(countySiruta, assertReleaseId, signal)),
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
      run(() => pnrrApi.verification(assertReleaseId, signal)),
    enabled: Boolean(assertReleaseId),
  });
}
