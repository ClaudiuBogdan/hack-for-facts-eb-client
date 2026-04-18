import { useQuery, queryOptions } from '@tanstack/react-query';
import {
  getEntityDetails,
  getEntityExecutionLineItems,
  getEntityProfile,
  getEntityRelationships,
  getEntityReports,
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
    queryFn: () => getEntityDetails(normalizedParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
  ssrPlaceholder?: EntityDetailsData;
}

export function useEntityDetails(
  params: UseEntityDetailsProps & NormalizationOptions,
  options?: UseEntityDetailsOptions
) {
  const queryOpts = entityDetailsQueryOptions(params);

  return useQuery({
    ...queryOpts,
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
} & NormalizationOptions) {
  const queryOpts = entityExecutionLineItemsQueryOptions(params);
  const { enabled = true } = params;

  return useQuery({
    ...queryOpts,
    enabled: queryOpts.enabled && enabled,
    placeholderData: (previousData) => previousData,
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

export function useEntityReports(params: { cui: string; limit?: number; offset?: number; year?: number; period?: string; type?: GqlReportType; sort?: { by: string; order: 'ASC' | 'DESC' }; enabled?: boolean }) {
  const { cui, limit, offset, year, period, type, sort, enabled = true } = params;
  return useQuery({
    queryKey: ['entityReports', cui, limit, offset, year, period, type, sort],
    queryFn: () => getEntityReports(cui, { limit, offset, year, period, type, sort }),
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
    queryFn: () => getEntityExecutionLineItems({ cui, reportPeriod, reportType, mainCreditorCui, normalization, currency, inflation_adjusted }),
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
