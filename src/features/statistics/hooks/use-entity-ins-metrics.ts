import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  INS_DERIVED_INDICATOR_BASE_CODES,
  INS_TOP_METRICS_BY_LEVEL,
} from "@/lib/ins/ins-metric-registry";
import type { ReportPeriodInput } from "@/schemas/reporting";
import {
  entityInsContextOptions,
  entityInsHistoryOptions,
  type EntityInsSourceInput,
} from "./use-entity-ins-source";
import { fetchEntityInsMetricDefaults } from "../api/graphql/ins-entity-metrics";
import { prepareEntityInsBootstrap } from "../api/native-entity-ins-api";
import { projectEntityInsHistory } from "../lib/entity-ins-history";
/** Small fixed dashboard: one default read, shared complete-vector cache, local period projection. */
export function useEntityInsMetrics(
  input: EntityInsSourceInput,
  reportPeriod: ReportPeriodInput,
) {
  const client = useQueryClient();
  const contextOptions = entityInsContextOptions(input);
  const contextQuery = useQuery(contextOptions);
  const context =
    contextOptions.enabled && contextQuery.isSuccess ? contextQuery.data : null;
  const topMetrics =
    INS_TOP_METRICS_BY_LEVEL[
      context?.territoryLevel === "NUTS3" ? "county" : "uat"
    ];
  const codes = [
    ...new Set([
      ...topMetrics.map((metric) => metric.code),
      ...INS_DERIVED_INDICATOR_BASE_CODES,
    ]),
  ];
  const defaultsOptions = {
    queryKey: [
      "statistics",
      "native-entity-metrics",
      input.cui,
      context,
      codes,
    ],
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      if (!context) throw new Error("Missing INS metric territory");
      return fetchEntityInsMetricDefaults(context, codes, signal);
    },
    enabled: context !== null,
    staleTime: 300_000,
    retry: false as const,
  };
  const defaults = useQuery(defaultsOptions);
  const prepared =
    context && defaults.isSuccess
      ? defaults.data.map((bootstrap) => {
          try {
            return {
              code: bootstrap.dataset.code,
              prepared: prepareEntityInsBootstrap(
                context,
                { insDataset: bootstrap.dataset.code },
                bootstrap,
              ),
              error: null,
            };
          } catch (error) {
            return { code: bootstrap.dataset.code, prepared: null, error };
          }
        })
      : [];
  const missing = defaults.isSuccess
    ? codes
        .filter(
          (code) => !defaults.data.some((item) => item.dataset.code === code),
        )
        .map((code) => ({
          code,
          prepared: null,
          projection: null,
          error: new Error("INS metric default was not returned"),
        }))
    : [];
  const histories = useQueries({
    queries: prepared.map((item) =>
      entityInsHistoryOptions(input.cui, item.prepared),
    ),
  });
  const metrics = prepared.map((item, index) => {
    const history = histories[index];
    try {
      return {
        ...item,
        projection:
          item.prepared && history.isSuccess
            ? projectEntityInsHistory(
                {
                  ...item.prepared,
                  resolved: {
                    ...item.prepared.resolved,
                    scope: {
                      ...item.prepared.resolved.scope,
                      periodicity:
                        reportPeriod.type === "YEAR"
                          ? "ANNUAL"
                          : reportPeriod.type === "QUARTER"
                            ? "QUARTERLY"
                            : "MONTHLY",
                    },
                  },
                },
                history.data,
                reportPeriod,
              )
            : null,
        error: item.error ?? history.error,
      };
    } catch (error) {
      return { ...item, projection: null, error };
    }
  });
  return {
    context,
    topMetrics,
    metrics: [...metrics, ...missing],
    isBootstrapLoading: defaults.isFetching || contextQuery.isFetching,
    defaults: defaults.isSuccess ? defaults.data : [],
    isLoading:
      contextQuery.isFetching ||
      defaults.isFetching ||
      histories.some((query) => query.isFetching),
    error:
      contextQuery.error ??
      defaults.error ??
      metrics.find((item) => item.error)?.error ??
      missing[0]?.error,
    async refresh() {
      await client.invalidateQueries({ queryKey: contextOptions.queryKey });
      await client.invalidateQueries({
        queryKey: ["statistics", "native-entity-metrics", input.cui],
      });
      await client.invalidateQueries({
        queryKey: ["statistics", "native-entity-ins-v1", input.cui, "history"],
      });
    },
  };
}
