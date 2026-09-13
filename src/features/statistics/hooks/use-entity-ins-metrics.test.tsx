import { inspectSourceSeries } from "@/lib/ins/source-series";
import type { ReportPeriodInput } from "@/schemas/reporting";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntityInsMetrics } from "./use-entity-ins-metrics";
import { useEntityInsSource } from "./use-entity-ins-source";
import { fetchInsEntityContext } from "../api/graphql/ins-entity-context";
import { fetchEntityInsMetricDefaults } from "../api/graphql/ins-entity-metrics";
import { fetchEntityInsHistory } from "../api/native-entity-ins-api";
import {
  mapDatasetDetails,
  mapLatestValue,
} from "../api/graphql/statistics-mappers";
import {
  insDetailedDatasetRawSchema,
  insLatestValueNodeRawSchema,
} from "../api/graphql/statistics-raw-schemas";
import { insEntityContextFixture } from "../test/ins-entity-context-fixtures";
import { observation, source } from "../test/native-landing-fixtures";
vi.mock("../api/graphql/ins-entity-context", async (original) => ({
  ...(await original<typeof import("../api/graphql/ins-entity-context")>()),
  fetchInsEntityContext: vi.fn(),
}));
vi.mock("../api/graphql/ins-entity-metrics", () => ({
  fetchEntityInsMetricDefaults: vi.fn(),
}));
vi.mock("../api/native-entity-ins-api", async (original) => ({
  ...(await original<typeof import("../api/native-entity-ins-api")>()),
  fetchEntityInsHistory: vi.fn(),
}));
const input = {
  cui: "123",
  metadataReady: true,
  metadata: { cui: "123", uat: { id: 1 } },
  enabled: true,
  search: { insDataset: "POP107D" },
};
const report: ReportPeriodInput = {
  type: "YEAR" as const,
  selection: { dates: ["2025"] },
};
let member = "0";
function bootstrap() {
  const raw = {
    ...source().descriptor,
    id: "POP107D",
    data_status: "AVAILABLE",
    periodicity: ["ANNUAL", "MONTHLY"],
  };
  const row = observation("54975", 2025);
  row.classifications[0] = {
    id: `D0:${member}`,
    type_code: "D0",
    code: member,
  };
  return {
    dataset: mapDatasetDetails(insDetailedDatasetRawSchema.parse(raw)),
    latest: mapLatestValue(
      insLatestValueNodeRawSchema.parse({
        dataset: raw,
        hasData: true,
        matchStrategy: "TOTAL_FALLBACK",
        observation: row,
        geographicWitnesses: [],
        latestPeriod: "2025",
      }),
    ),
  };
}
function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  member = "0";
  vi.mocked(fetchInsEntityContext).mockResolvedValue(insEntityContextFixture());
  vi.mocked(fetchEntityInsMetricDefaults).mockImplementation(async () => [
    bootstrap(),
  ]);
  vi.mocked(fetchEntityInsHistory).mockImplementation(async (prepared) => {
    const annual = observation("54975", 2025);
    annual.classifications[0] = {
      id: `D0:${member}`,
      type_code: "D0",
      code: member,
    };
    const monthly = {
      ...annual,
      id: "month",
      value: "5",
      time_period: {
        iso_period: "2025-01",
        year: 2025,
        month: 1,
        periodicity: "MONTHLY" as const,
      },
    };
    const inspected = inspectSourceSeries({
      descriptor: prepared.descriptor,
      observations: [annual, monthly],
    });
    if (inspected.status === "INVALID") throw new Error("Invalid test vector");
    return {
      descriptor: prepared.descriptor,
      observations: [annual, monthly],
      inspected,
      mode: "complete",
      truncated: false,
    };
  });
});
describe("native entity metric dashboard", () => {
  it("uses one batch default read and projects selected cadence without filtering history", async () => {
    const { result, rerender } = renderHook(
      ({ period }) => useEntityInsMetrics(input, period),
      {
        ...harness(),
        initialProps: {
          period: report as import("@/schemas/reporting").ReportPeriodInput,
        },
      },
    );
    await waitFor(() =>
      expect(result.current.metrics[0]?.projection?.status).toBe("SERIES"),
    );
    expect(fetchEntityInsMetricDefaults).toHaveBeenCalledTimes(1);
    expect(result.current.metrics[0].projection).toMatchObject({
      selected: [{ period: "2025", observation: { value: "100" } }],
    });
    rerender({ period: { type: "MONTH", selection: { dates: ["2025-01"] } } });
    await waitFor(() =>
      expect(result.current.metrics[0].projection).toMatchObject({
        selected: [{ period: "2025-01", observation: { value: "5" } }],
      }),
    );
    expect(fetchEntityInsHistory).toHaveBeenCalledTimes(1);
  });
  it("shows omitted requested defaults as verification errors", async () => {
    const { result } = renderHook(
      () => useEntityInsMetrics(input, report),
      harness(),
    );
    await waitFor(() =>
      expect(
        result.current.metrics.find((item) => item.code === "FOM104D")?.error,
      ).toBeInstanceOf(Error),
    );
    expect(result.current.error).toBeInstanceOf(Error);
  });
  it("refreshes changed default pins within the same publication for cards and selected detail", async () => {
    const { result } = renderHook(() => {
      const metrics = useEntityInsMetrics(input, report);
      const selected = useEntityInsSource({
        ...input,
        bootstrap: metrics.defaults[0],
        waitForBootstrap: metrics.isBootstrapLoading,
      });
      return { metrics, selected };
    }, harness());
    await waitFor(() =>
      expect(
        result.current.selected.history?.observations[0].classifications[0]
          .code,
      ).toBe("0"),
    );
    member = "2";
    await act(() => result.current.metrics.refresh());
    await waitFor(() =>
      expect(
        result.current.selected.history?.observations[0].classifications[0]
          .code,
      ).toBe("2"),
    );
    expect(
      result.current.selected.prepared?.resolved.scope.classifications.get(
        "D0",
      ),
    ).toBe("2");
  });
});
