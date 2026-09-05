import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/config/env", () => ({
  getApiBaseUrl: () => "https://api.example.com",
}));
vi.mock("@/lib/auth", () => ({ getAuthToken: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
import { getAuthToken } from "@/lib/auth";
import { AnalyticsFilterSchema } from "@/schemas/charts";
import {
  fetchEntityAnalytics,
  fetchCompleteAggregatedLineItems,
  entityRankingFilter,
} from "./entity-analytics";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const filter = AnalyticsFilterSchema.parse({
  account_category: "ch",
  report_period: { type: "YEAR", selection: { dates: ["2024"] } },
  is_territorial_executive: false,
});
const pageInfo = { totalCount: 1, hasNextPage: false, hasPreviousPage: false };

it("uses public native transport with cancellation and preserves unavailable auxiliary amounts", async () => {
  const page = {
    nodes: [
      {
        entity_cui: "777",
        entity_name: "777",
        total_amount: 12,
        amount: 12,
        population: null,
        per_capita_amount: null,
      },
    ],
    pageInfo,
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { entityAnalytics: page } })),
    );
  vi.stubGlobal("fetch", fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchEntityAnalytics({ filter, signal })).toEqual(page);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.example.com/api/v1/graphql",
    expect.objectContaining({ signal }),
  );
  const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));
  expect(request.variables.filter.is_territorial_executive).toBe(false);
  expect(getAuthToken).not.toHaveBeenCalled();
});

it("does not return a partial classification vector to a treemap", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { aggregatedLineItems: { nodes: [], pageInfo } },
          }),
        ),
      ),
  );
  await expect(fetchCompleteAggregatedLineItems(filter)).rejects.toThrow(
    "incomplete",
  );
});

it("defaults per-capita rankings to executives while preserving an explicit selection", () => {
  const { is_territorial_executive: _, ...unspecified } = filter;
  expect(
    entityRankingFilter({ ...unspecified, normalization: "per_capita" })
      .is_territorial_executive,
  ).toBe(true);
  expect(
    entityRankingFilter({ ...filter, normalization: "per_capita" })
      .is_territorial_executive,
  ).toBe(false);
  expect(
    entityRankingFilter(unspecified).is_territorial_executive,
  ).toBeUndefined();
});
