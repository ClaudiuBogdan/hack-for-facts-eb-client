import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pnrrReleaseSchema } from "@/schemas/pnrr-live";
import { pnrrApi } from "../api/pnrr-api";
import {
  getPnrrFactReleaseId,
  usePnrrLiveCatalogResources,
  usePnrrLiveDocumentReferences,
  usePnrrLiveFundingApplications,
  usePnrrLiveFundingCalls,
  usePnrrLiveOrganization,
  usePnrrLiveOrganizationCommitments,
  usePnrrLiveOrganizationPayments,
  usePnrrLiveOrganizationProfile,
  usePnrrLiveOrganizationProjects,
  usePnrrLiveOrganizationProcurement,
  usePnrrLiveOrganizations,
  usePnrrLiveOverview,
  usePnrrLivePlace,
  usePnrrLivePlaces,
  usePnrrLiveProgramRevisions,
  usePnrrLiveProject,
  usePnrrLiveProjectFacets,
  usePnrrLiveProjectHistory,
  usePnrrLiveProjects,
  usePnrrLiveVerification,
} from "./use-pnrr-live-data";

vi.mock("../api/pnrr-api", () => ({
  pnrrApi: {
    status: vi.fn(),
    overview: vi.fn(),
    projects: vi.fn(),
    projectFacets: vi.fn(),
    project: vi.fn(),
    projectHistory: vi.fn(),
    organizationIdentity: vi.fn(),
    organizationProfile: vi.fn(),
    organizationPayments: vi.fn(),
    organizationCommitments: vi.fn(),
    organizationProjects: vi.fn(),
    organizationProcurement: vi.fn(),
    organizations: vi.fn(),
    place: vi.fn(),
    places: vi.fn(),
    verification: vi.fn(),
    fundingCalls: vi.fn(),
    fundingApplications: vi.fn(),
    programRevisions: vi.fn(),
    catalogResources: vi.fn(),
    documentReferences: vi.fn(),
  },
}));

const release = (
  state: "served" | "degraded" | "abstained" | "legacy_unversioned",
) =>
  pnrrReleaseSchema.parse({
    releaseId: "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
    releaseKind: "operational_snapshot",
    state,
    sourceSnapshotAt: null,
    completedAt: null,
    limitation: "fixture",
    lanes: [],
  });

describe("getPnrrFactReleaseId", () => {
  it.each(["served", "degraded", "legacy_unversioned"] as const)(
    "allows %s releases to issue fact queries",
    (state) => {
      expect(getPnrrFactReleaseId(release(state))).toBe(
        "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
      );
    },
  );

  it("withholds even a normal-looking, truthy abstained release id", () => {
    expect(getPnrrFactReleaseId(release("abstained"))).toBeUndefined();
  });

  it("waits for release status before issuing fact queries", () => {
    expect(getPnrrFactReleaseId(undefined)).toBeUndefined();
    expect(getPnrrFactReleaseId(null)).toBeUndefined();
  });
});

const factMethods = [
  "overview",
  "projects",
  "projectFacets",
  "project",
  "projectHistory",
  "organizationIdentity",
  "organizationProfile",
  "organizationPayments",
  "organizationCommitments",
  "organizationProjects",
  "organizationProcurement",
  "organizations",
  "place",
  "places",
  "verification",
  "fundingCalls",
  "fundingApplications",
  "programRevisions",
  "catalogResources",
  "documentReferences",
] as const;

const statusPayload = (state: "degraded" | "abstained") => ({
  pnrrCurrentRelease: release(state),
  pnrrCapabilities: [],
});

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
};

function useEveryPnrrFactHook() {
  usePnrrLiveOverview();
  usePnrrLiveProjects({ filters: {}, first: 10 });
  usePnrrLiveProjectFacets({});
  usePnrrLiveProject("project-1");
  usePnrrLiveProjectHistory("project-1");
  usePnrrLiveOrganization("123");
  usePnrrLiveOrganizationProfile("123");
  usePnrrLiveOrganizationPayments("123");
  usePnrrLiveOrganizationCommitments("123");
  usePnrrLiveOrganizationProjects("123");
  usePnrrLiveOrganizationProcurement("123");
  usePnrrLiveOrganizations({ filters: {}, first: 10 });
  usePnrrLivePlace("40");
  usePnrrLivePlaces();
  usePnrrLiveVerification();
  usePnrrLiveFundingCalls();
  usePnrrLiveFundingApplications();
  usePnrrLiveProgramRevisions();
  usePnrrLiveCatalogResources();
  usePnrrLiveDocumentReferences();
}

describe("PNRR fact query gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of factMethods) {
      vi.mocked(pnrrApi[method]).mockResolvedValue({} as never);
    }
  });

  it("allows status but starts no fact API under a truthy abstained release", async () => {
    vi.mocked(pnrrApi.status).mockResolvedValue(statusPayload("abstained"));

    renderHook(() => useEveryPnrrFactHook(), { wrapper: makeWrapper() });

    await waitFor(() => expect(pnrrApi.status).toHaveBeenCalled());
    for (const method of factMethods) {
      expect(pnrrApi[method]).not.toHaveBeenCalled();
    }
  });

  it("passes the exact observed degraded release to enabled fact queries", async () => {
    vi.mocked(pnrrApi.status).mockResolvedValue(statusPayload("degraded"));

    renderHook(() => usePnrrLiveOverview(), { wrapper: makeWrapper() });

    await waitFor(() =>
      expect(pnrrApi.overview).toHaveBeenCalledWith(
        "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
        expect.any(AbortSignal),
      ),
    );
  });

  it("loads source collections by stable server cursor without a silent cap", async () => {
    vi.mocked(pnrrApi.status).mockResolvedValue(statusPayload("degraded"));
    vi.mocked(pnrrApi.fundingCalls)
      .mockResolvedValueOnce({
        edges: [],
        pageInfo: { hasNextPage: true, endCursor: "call-cursor-24" },
      })
      .mockResolvedValueOnce({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      });

    const { result } = renderHook(() => usePnrrLiveFundingCalls(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(pnrrApi.fundingCalls).toHaveBeenCalledTimes(1));
    expect(pnrrApi.fundingCalls).toHaveBeenNthCalledWith(
      1,
      {
        first: 24,
        after: undefined,
        assertReleaseId: "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
      },
      expect.any(AbortSignal),
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(pnrrApi.fundingCalls).toHaveBeenNthCalledWith(
      2,
      {
        first: 24,
        after: "call-cursor-24",
        assertReleaseId: "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
      },
      expect.any(AbortSignal),
    );
  });

  it("loads organization evidence independently by stable cursor", async () => {
    vi.mocked(pnrrApi.status).mockResolvedValue(statusPayload("degraded"));
    vi.mocked(pnrrApi.organizationPayments)
      .mockResolvedValueOnce({
        edges: [],
        pageInfo: { hasNextPage: true, endCursor: "payment-cursor-10" },
      })
      .mockResolvedValueOnce({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      });

    const { result } = renderHook(
      () => usePnrrLiveOrganizationPayments("4499621"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() =>
      expect(pnrrApi.organizationPayments).toHaveBeenCalledTimes(1),
    );
    expect(pnrrApi.organizationPayments).toHaveBeenNthCalledWith(
      1,
      "4499621",
      {
        first: 10,
        after: undefined,
        assertReleaseId: "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
      },
      expect.any(AbortSignal),
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(pnrrApi.organizationPayments).toHaveBeenNthCalledWith(
      2,
      "4499621",
      {
        first: 10,
        after: "payment-cursor-10",
        assertReleaseId: "pnrr-release-v1:pnrr-v2-20260726T150000Z-test",
      },
      expect.any(AbortSignal),
    );
  });
});
