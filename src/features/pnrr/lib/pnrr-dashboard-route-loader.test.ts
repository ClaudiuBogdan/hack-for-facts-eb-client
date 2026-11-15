import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import type { PnrrServerOverview } from "../workers/pnrr-worker-types";
import { FIXTURE_RELEASE_ID, makeFixtureRelease } from "./pnrr-api-snapshot.fixture";
import { loadPnrrDashboardRoute } from "./pnrr-dashboard-route-loader";
import {
  buildPnrrOverviewSearchKey,
  pnrrOverviewQueryKey,
} from "./pnrr-overview-request";

vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => {
    const fn = async () => null;
    return Object.assign(fn, {
      client: () => Object.assign(fn, { server: () => fn }),
    });
  },
}));

vi.mock("@/lib/graphql/graphql-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/graphql/graphql-client")>()),
  graphqlQuery: vi.fn(),
}));

// The route must never fall back to the frozen file set or its SEO snapshot.
vi.mock("@/server/handlers/pnrr-data-proxy", () => {
  throw new Error("the PNRR route must not load the raw S3 data proxy");
});
vi.mock("../seo/pnrr-seo-loader", () => {
  throw new Error("the PNRR route must not load the legacy SEO loader");
});
vi.mock("../workers/pnrr-worker-client", () => {
  throw new Error("the PNRR route must not start the raw-data worker");
});

const release = makeFixtureRelease(FIXTURE_RELEASE_ID);
const money = (amount: string | null) => ({
  factType: "fixture",
  amount,
  currency: "EUR",
  aggregationState: "reported",
  coveredCount: 1,
  totalCount: 1,
});
const liveOverview = {
  meta: {
    state: "degraded",
    reasonCodes: [],
    caveats: [],
    provenance: [],
    coverage: [],
    release,
  },
  program: {
    snapshotDate: "2026-10-15",
    projectCount: 21710,
    allocationEur: money("21410527592.99"),
    receivedEur: money("10100000000.00"),
    paidEur: money(null),
  },
  beneficiaryPayments: {
    count: null,
    netRon: { ...money(null), currency: "RON" },
    grossRon: { ...money(null), currency: "RON" },
    reversalRon: { ...money(null), currency: "RON" },
    firstDate: null,
    lastDate: null,
  },
  commitments: {
    count: null,
    additiveCount: null,
    unresolvedCount: null,
    additiveRon: { ...money(null), currency: "RON" },
  },
  delivery: {
    observedCount: 24891,
    completedCount: 3000,
    overHundredCount: 12,
    missingFinancialProgressCount: 40,
    missingPhysicalProgressCount: 41,
  },
};

const serverOverview = (fileSetId: string) =>
  ({ fileSetId, overview: {}, meta: {}, labels: { uats: [], beneficiaries: [] } }) as unknown as PnrrServerOverview;

const readCurrency = async () => "EUR" as const;

beforeEach(() => {
  vi.mocked(graphqlQuery).mockReset();
  vi.mocked(graphqlQuery).mockImplementation((async (
    _query: string,
    _variables?: Record<string, unknown>,
    options?: { readonly operationName?: string },
  ) => {
    switch (options?.operationName) {
      case "PnrrRelease":
        return { pnrrCurrentRelease: release };
      case "PnrrCapabilities":
        return { pnrrCapabilities: [] };
      case "PnrrOverview":
        return { pnrrOverview: liveOverview };
      default:
        throw new Error(`unexpected operation ${options?.operationName}`);
    }
  }) as typeof graphqlQuery);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("the route loader must not fetch any file");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadPnrrDashboardRoute", () => {
  it("seeds the server-built overview under the release it was built from", async () => {
    const queryClient = new QueryClient();
    const search = { counties: ["Cluj"] };
    const readOverview = vi.fn(async () => serverOverview(FIXTURE_RELEASE_ID));

    const data = await loadPnrrDashboardRoute({
      queryClient,
      search,
      includeOverview: true,
      blockForSsr: true,
      readOverview,
      readCurrency,
    });

    expect(readOverview).toHaveBeenCalledWith({
      search,
      releaseId: FIXTURE_RELEASE_ID,
    });
    expect(data).toMatchObject({
      seeded: true,
      initialCurrency: "EUR",
      head: { releaseId: FIXTURE_RELEASE_ID, reportedProjectCount: 21710 },
    });
    expect(
      queryClient.getQueryData(
        pnrrOverviewQueryKey(FIXTURE_RELEASE_ID, buildPnrrOverviewSearchKey(search)),
      ),
    ).toEqual(serverOverview(FIXTURE_RELEASE_ID));
    // Release metadata and publisher totals only: no project page, no file.
    expect(
      vi.mocked(graphqlQuery).mock.calls.map(([, , options]) => options?.operationName),
    ).toEqual(["PnrrRelease", "PnrrCapabilities", "PnrrOverview"]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("renders uncached, and leaves the overview to the page, when the model is not in memory", async () => {
    const queryClient = new QueryClient();

    const data = await loadPnrrDashboardRoute({
      queryClient,
      search: {},
      includeOverview: true,
      blockForSsr: true,
      readOverview: async () => null,
      readCurrency,
    });

    expect(data.seeded).toBe(false);
    expect(
      queryClient.getQueryData(pnrrOverviewQueryKey(FIXTURE_RELEASE_ID, "{}")),
    ).toBeUndefined();
  });

  it("never seeds an overview built from another release", async () => {
    const queryClient = new QueryClient();

    const data = await loadPnrrDashboardRoute({
      queryClient,
      search: {},
      includeOverview: true,
      blockForSsr: true,
      readOverview: async () => serverOverview("another-release"),
      readCurrency,
    });

    expect(data.seeded).toBe(false);
    expect(queryClient.getQueryCache().findAll({ queryKey: ["pnrr-overview"] })).toHaveLength(0);
  });

  it("reads no overview for another tab or on a client navigation", async () => {
    const readOverview = vi.fn(async () => serverOverview(FIXTURE_RELEASE_ID));

    await loadPnrrDashboardRoute({
      queryClient: new QueryClient(),
      search: {},
      includeOverview: false,
      blockForSsr: true,
      readOverview,
      readCurrency,
    });
    await loadPnrrDashboardRoute({
      queryClient: new QueryClient(),
      search: {},
      includeOverview: true,
      blockForSsr: false,
      readOverview,
      readCurrency,
    });

    expect(readOverview).not.toHaveBeenCalled();
  });
});
