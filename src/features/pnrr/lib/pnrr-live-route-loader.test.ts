import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { graphqlQuery } from "@/lib/graphql/graphql-client";
import { pnrrLiveQueryKeys } from "../hooks/use-pnrr-live-data";
import { loadPnrrLiveOverviewRoute } from "./pnrr-live-route-loader";

vi.mock("@/lib/graphql/graphql-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/graphql/graphql-client")>()),
  graphqlQuery: vi.fn(),
}));

// The live read path must never reach the frozen file set or its proxy.
vi.mock("@/server/handlers/pnrr-data-proxy", () => {
  throw new Error("The live PNRR route must not load the legacy data proxy");
});
vi.mock("@/server/handlers/pnrr-overview", () => {
  throw new Error("The live PNRR route must not load the legacy overview");
});
vi.mock("../workers/pnrr-worker-client", () => {
  throw new Error("The live PNRR route must not load the raw-data worker");
});

const RELEASE_ID = "pnrr-release-v1:mipe-20261015T000000Z";

const release = (
  releaseId = RELEASE_ID,
  state: "served" | "degraded" | "abstained" = "degraded",
) => ({
  releaseId,
  releaseKind: "mipe_scoped",
  state,
  sourceSnapshotAt: "2026-10-15T00:00:00Z",
  completedAt: "2026-11-14T11:00:00Z",
  limitation: "ORDS payment facts are withheld in this release.",
  lanes: [
    {
      lane: "mipe_projects",
      state: "served",
      asOf: "2026-10-15T00:00:00Z",
      suspended: false,
      reasonCodes: [],
    },
    {
      lane: "mipe_indicators",
      state: "served",
      asOf: "2026-10-15T00:00:00Z",
      suspended: false,
      reasonCodes: [],
    },
    {
      lane: "ords_payments_capture",
      state: "abstained",
      asOf: "2026-11-13T06:17:28Z",
      suspended: false,
      reasonCodes: ["payment_policy_pending"],
    },
  ],
});

const money = (amount: string | null, currency: "RON" | "EUR") => ({
  factType: "fixture",
  amount,
  currency,
  aggregationState: amount === null ? "withheld" : "additive",
  coveredCount: 0,
  totalCount: 0,
});

/** A MIPE-scoped overview: publisher totals served, ORDS facts withheld. */
const overviewAnswer = (releaseId = RELEASE_ID) => ({
  pnrrOverview: {
    meta: {
      state: "degraded",
      reasonCodes: [],
      caveats: [],
      provenance: ["mipe"],
      coverage: [],
      release: release(releaseId),
    },
    program: {
      snapshotDate: "2026-10-15",
      projectCount: 21710,
      allocationEur: money("21410000000.00", "EUR"),
      receivedEur: money("10100000000.00", "EUR"),
      paidEur: money("9000000000.00", "EUR"),
    },
    beneficiaryPayments: {
      count: null,
      firstDate: null,
      lastDate: null,
      netRon: money(null, "RON"),
      grossRon: money(null, "RON"),
      reversalRon: money(null, "RON"),
    },
    commitments: {
      count: null,
      additiveCount: null,
      unresolvedCount: null,
      additiveRon: money(null, "RON"),
    },
    delivery: {
      observedCount: 24891,
      completedCount: 3000,
      overHundredCount: 12,
      missingFinancialProgressCount: 40,
      missingPhysicalProgressCount: 41,
    },
  },
});

type Answers = {
  readonly status?: () => unknown;
  readonly overview?: () => unknown;
};

function answerGraphql({
  status = () => ({ pnrrCurrentRelease: release() }),
  overview = () => overviewAnswer(),
}: Answers = {}) {
  vi.mocked(graphqlQuery).mockImplementation((async (
    _query: string,
    variables?: Record<string, unknown>,
    options?: { readonly operationName?: string },
  ) => {
      switch (options?.operationName) {
        case "PnrrRelease":
          return status();
        case "PnrrCapabilities":
          return {
            pnrrCapabilities: [
              {
                id: "payments",
                releaseId: (variables as { assertReleaseId: string })
                  .assertReleaseId,
                state: "abstained",
                reasonCodes: ["payment_policy_pending"],
                limitation: "Withheld",
              },
            ],
          };
        case "PnrrOverview":
          return overview();
        default:
          throw new Error(`Unexpected PNRR read ${options?.operationName}`);
      }
  }) as typeof graphqlQuery);
}

const operations = () =>
  vi.mocked(graphqlQuery).mock.calls.map(([, , options]) => options?.operationName);

describe("loadPnrrLiveOverviewRoute (SSR)", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds the active release and its publisher-reported overview under the release id", async () => {
    answerGraphql();
    const queryClient = new QueryClient();

    const result = await loadPnrrLiveOverviewRoute({
      queryClient,
      blockForSsr: true,
    });

    expect(result).toEqual({
      seeded: true,
      head: {
        releaseId: RELEASE_ID,
        releaseState: "degraded",
        mipeProjectsAsOf: "2026-10-15T00:00:00Z",
        ordsPaymentsCaptureAsOf: "2026-11-13T06:17:28Z",
        reportedProjectCount: 21710,
      },
    });
    const overview = queryClient.getQueryData(
      pnrrLiveQueryKeys.overview(RELEASE_ID),
    ) as ReturnType<typeof overviewAnswer>["pnrrOverview"];
    // Withheld ORDS counts and amounts stay null: no zero fallback.
    expect(overview.beneficiaryPayments.count).toBeNull();
    expect(overview.beneficiaryPayments.netRon.amount).toBeNull();
    expect(overview.commitments.count).toBeNull();
    expect(
      vi.mocked(graphqlQuery).mock.calls.find(
        ([, , options]) => options?.operationName === "PnrrOverview",
      )?.[1],
    ).toEqual({ assertReleaseId: RELEASE_ID });
  });

  it("issues only release and overview reads: no project page, no raw file fetch", async () => {
    answerGraphql();

    await loadPnrrLiveOverviewRoute({
      queryClient: new QueryClient(),
      blockForSsr: true,
    });

    expect(operations()).toEqual([
      "PnrrRelease",
      "PnrrCapabilities",
      "PnrrOverview",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses an overview from a divergent snapshot and renders uncached", async () => {
    answerGraphql({ overview: () => overviewAnswer("pnrr-release-v1:other") });
    const queryClient = new QueryClient();

    const result = await loadPnrrLiveOverviewRoute({
      queryClient,
      blockForSsr: true,
    });

    expect(result.seeded).toBe(false);
    expect(result.head?.reportedProjectCount).toBeNull();
    expect(
      queryClient.getQueryState(pnrrLiveQueryKeys.overview(RELEASE_ID)),
    ).toBeUndefined();
    // The release itself was read correctly and stays for hydration.
    expect(queryClient.getQueryData(pnrrLiveQueryKeys.status())).toBeDefined();
  });

  it("leaves a failed release read to the browser instead of caching an error", async () => {
    answerGraphql({
      status: () => {
        throw new Error("API down");
      },
    });
    const queryClient = new QueryClient();

    const result = await loadPnrrLiveOverviewRoute({
      queryClient,
      blockForSsr: true,
    });

    expect(result).toEqual({ seeded: false, head: null });
    expect(
      queryClient.getQueryState(pnrrLiveQueryKeys.status()),
    ).toBeUndefined();
    expect(operations()).toEqual(["PnrrRelease"]);
  });

  it("reads no facts under an abstained release", async () => {
    answerGraphql({
      status: () => ({
        pnrrCurrentRelease: release(RELEASE_ID, "abstained"),
      }),
    });

    const result = await loadPnrrLiveOverviewRoute({
      queryClient: new QueryClient(),
      blockForSsr: true,
    });

    expect(result.seeded).toBe(true);
    expect(result.head?.releaseState).toBe("abstained");
    expect(operations()).not.toContain("PnrrOverview");
  });

  it("does not block a client navigation on the release read", async () => {
    answerGraphql();
    const queryClient = new QueryClient();

    const result = await loadPnrrLiveOverviewRoute({
      queryClient,
      blockForSsr: false,
    });

    expect(result).toEqual({ seeded: true, head: null });
    // The release read still starts, so the page's hooks find it in flight.
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(pnrrLiveQueryKeys.status())).toBeDefined(),
    );
    expect(operations()).not.toContain("PnrrOverview");
  });
});
