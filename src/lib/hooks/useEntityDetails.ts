import { useQuery, queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  getEntityDetails,
  getEntityExecutionLineItems,
  getEntityProfile,
  getEntityRelationships,
  getEntityRoutingSummary,
  getReportsConnection,
  ReportsFilterInput,
  ReportConnection,
  EntityDetailsData,
} from '@/lib/api/entities';
import type { NormalizationOptions } from '@/lib/normalization';
import { ReportPeriodInput, GqlReportType } from '@/schemas/reporting';
import { generateHash } from '../utils';

type EntityDetailsQueryParams = {
  cui: string
  reportPeriod: ReportPeriodInput
  reportType?: GqlReportType
  trendPeriod?: ReportPeriodInput
  mainCreditorCui?: string
} & NormalizationOptions

const ENTITY_DETAILS_STALE_TIME = 5 * 60 * 1000;

type EntityDetailsSource<T> = { readonly data: T; readonly fetchedAt: number };

async function readEntityDetailsSource<T>(
  client: QueryClient,
  queryKey: readonly unknown[],
  load: (signal?: AbortSignal) => Promise<T>,
  signal: AbortSignal,
): Promise<EntityDetailsSource<T>> {
  const fetchSource = async (sourceSignal: AbortSignal): Promise<EntityDetailsSource<T>> => {
    const data = await load(sourceSignal);
    sourceSignal.throwIfAborted();
    return { data, fetchedAt: Date.now() };
  };

  signal.throwIfAborted();
  if (typeof window !== 'undefined') {
    // Other projections may still need this source if this one is cancelled.
    const source = await client.fetchQuery({
      queryKey,
      queryFn: ({ signal: sourceSignal }) => fetchSource(sourceSignal),
      staleTime: ENTITY_DETAILS_STALE_TIME,
      retry: false,
    });
    signal.throwIfAborted();
    return source;
  }

  const state = client.getQueryState<EntityDetailsSource<T>>(queryKey);
  if (state?.data && !state.isInvalidated &&
      Date.now() - state.data.fetchedAt < ENTITY_DETAILS_STALE_TIME) {
    return state.data;
  }
  // SSR's deadline owns the transport signal. Seed successful sources only,
  // so hydration cannot pick up a separate pending query after the deadline.
  const source = await fetchSource(signal);
  signal.throwIfAborted();
  client.setQueryData(queryKey, source, { updatedAt: source.fetchedAt });
  return source;
}

function normalizeEntityDetailsQueryParams(
  params: EntityDetailsQueryParams,
): EntityDetailsQueryParams {
  const normalizedTrendPeriod = params.trendPeriod ?? params.reportPeriod

  return {
    cui: params.cui,
    normalization: params.normalization,
    currency: params.currency,
    inflation_adjusted: params.inflation_adjusted,
    show_period_growth: params.show_period_growth,
    reportPeriod: params.reportPeriod,
    reportType: params.reportType,
    trendPeriod: normalizedTrendPeriod,
    mainCreditorCui: params.mainCreditorCui,
  };
}

export const entityDetailsQueryOptions = (
  params: EntityDetailsQueryParams,
) => {
  // Keep the hash stable even when callers construct equivalent params with a
  // different top-level property order (for example SSR vs. client hydration).
  const normalizedParams = normalizeEntityDetailsQueryParams(params);

  const payloadString = JSON.stringify(normalizedParams);
  const hash = generateHash(payloadString);

  return queryOptions({
    queryKey: ['entityDetails', hash],
    queryFn: async ({ client, signal }): Promise<EntityDetailsData | null> => {
      let sourceExpiresAt = Infinity;
      const details = await getEntityDetails(normalizedParams, {
        signal,
        readSource: async (queryKey, load) => {
          const source = await readEntityDetailsSource(client, queryKey, load, signal);
          sourceExpiresAt = Math.min(sourceExpiresAt, source.fetchedAt + ENTITY_DETAILS_STALE_TIME);
          return source.data;
        },
      });
      signal.throwIfAborted();
      return details && { ...details, sourceExpiresAt };
    },
    staleTime: ({ state }) => {
      // A missing entity has no projection timestamp. Its metadata still
      // caches the lookup and controls when the transport runs again.
      if (state.data === null) return 0;
      return state.data?.sourceExpiresAt === undefined
        ? ENTITY_DETAILS_STALE_TIME
        : Math.max(0, state.data.sourceExpiresAt - state.dataUpdatedAt);
    },
    enabled: !!normalizedParams.cui,
  });

}
interface UseEntityDetailsProps {
  cui: string;
  reportPeriod: ReportPeriodInput;
  reportType?: GqlReportType;
  trendPeriod?: ReportPeriodInput;
  mainCreditorCui?: string;
}

interface UseEntityDetailsOptions {
  enabled?: boolean;
  ssrPlaceholder?: EntityDetailsData;
}

export function useEntityDetails(
  params: UseEntityDetailsProps & NormalizationOptions,
  options?: UseEntityDetailsOptions
) {
  const queryOpts = entityDetailsQueryOptions(params);

  return useQuery({
    ...queryOpts,
    enabled: queryOpts.enabled && options?.enabled !== false,
    // Use function to preserve keepPreviousData behavior
    // Priority: previous data > SSR placeholder > undefined
    placeholderData: (previousData) => previousData ?? options?.ssrPlaceholder,
  });
}

// Lazy hooks for heavy data

export function useEntityExecutionLineItems(params: {
  cui: string;
  reportPeriod: ReportPeriodInput;
  reportType?: GqlReportType;
  enabled?: boolean;
  mainCreditorCui?: string;
} & NormalizationOptions, options?: {
  ssrPlaceholder?: Awaited<ReturnType<typeof getEntityExecutionLineItems>>;
}) {
  const queryOpts = entityExecutionLineItemsQueryOptions(params);
  const { enabled = true } = params;

  return useQuery({
    ...queryOpts,
    enabled: queryOpts.enabled && enabled,
    placeholderData: (previousData) => previousData ?? options?.ssrPlaceholder,
  });
}

export function entityProfileQueryOptions(params: { cui?: string }) {
  const { cui } = params;
  const queryKey = ['entityProfile', cui] as const;

  return queryOptions({
    queryKey,
    queryFn: async () => (cui ? getEntityProfile(cui) : null),
    enabled: !!cui,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEntityProfile(cui?: string) {
  return useQuery(entityProfileQueryOptions({ cui }));
}

export function useEntityRelationships(params: { cui: string; enabled?: boolean }) {
  const { cui, enabled = true } = params;
  return useQuery({
    queryKey: ['entityRelationships', cui],
    queryFn: () => getEntityRelationships(cui),
    enabled: !!cui && enabled,
    staleTime: 1000 * 60 * 10,
  });
}

export function useReportsConnection(params: { filter: ReportsFilterInput; limit?: number; offset?: number; enabled?: boolean }) {
  const queryOpts = reportsConnectionQueryOptions(params);
  const { enabled = true } = params;

  return useQuery<ReportConnection>({
    ...queryOpts,
    enabled: queryOpts.enabled && enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function entityExecutionLineItemsQueryOptions(params: {
  cui: string;
  reportPeriod: ReportPeriodInput;
  reportType?: GqlReportType;
  enabled?: boolean;
  mainCreditorCui?: string;
} & NormalizationOptions) {
  const { cui, reportPeriod, reportType, enabled = true, mainCreditorCui, normalization, currency, inflation_adjusted } = params;

  return queryOptions({
    queryKey: ['entityLineItems', cui, normalization, currency, inflation_adjusted, reportPeriod, reportType, mainCreditorCui],
    queryFn: ({ signal }) => getEntityExecutionLineItems({ cui, reportPeriod, reportType, mainCreditorCui, normalization, currency, inflation_adjusted }, { signal }),
    enabled: !!cui && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function reportsConnectionQueryOptions(params: { filter: ReportsFilterInput; limit?: number; offset?: number; enabled?: boolean }) {
  const { filter, limit = 10, offset = 0, enabled = true } = params;

  return queryOptions<ReportConnection>({
    queryKey: ['reportsConnection', filter, limit, offset],
    queryFn: () => getReportsConnection(filter, limit, offset),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function entityRoutingSummaryQueryOptions(params: {
  cui: string;
  enabled?: boolean;
}) {
  const { cui, enabled = true } = params;

  return queryOptions({
    queryKey: ['entityRoutingSummary', cui],
    queryFn: () => getEntityRoutingSummary(cui),
    enabled: !!cui && enabled,
    staleTime: 1000 * 60 * 5,
  });
}
