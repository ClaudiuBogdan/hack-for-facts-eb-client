import { createFileRoute } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { ViewLoading } from '@/components/ui/ViewLoading';
import { z } from 'zod';
import { entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails';
import { entitySearchSchema } from '@/components/entities/validation';
import { AnalyticsFilterType, AnalyticsInput, DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts';
import { geoJsonQueryOptions } from '@/hooks/useGeoJson';
import { heatmapJudetQueryOptions, heatmapUATQueryOptions } from '@/hooks/useHeatmapData';
import { getTopFunctionalGroupCodes } from '@/lib/analytics-utils';
import { getChartAnalytics } from '@/lib/api/charts';
import { generateHash } from '@/lib/utils';
import { GqlReportType, TMonth, TQuarter, toExecutionReportType, toReportTypeValue } from '@/schemas/reporting';
import { getInitialFilterState, makeTrendPeriod } from '@/schemas/reporting';
import { prepareFilterForServer, withDefaultExcludes } from '@/lib/filterUtils';
// NOTE: We intentionally do NOT read cookies during SSR for data fetching.
// CDN caches based on URL only - reading cookies would cause cache pollution
// (same URL with different cookies = same cache entry = wrong data).
// However, during client-side navigation/prefetch, we CAN read cookies since
// there's no CDN concern - this ensures prefetch uses correct user preference.
import { parseCurrencyParam, parseBooleanParam, DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED, resolveNormalizationSettings, type NormalizationInput } from '@/lib/globalSettings/params';
import { readClientCurrencyPreference, readClientInflationAdjustedPreference } from '@/lib/user-preferences';
import type { EntityDetailsData } from '@/lib/api/entities';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults';
import { createPublicPageCacheHeaders } from '@/lib/http-cache';
import { buildEntityRouteHead, type EntitySeoSnapshot } from '@/features/entities/seo/entity-share-seo';
import type { EntityPageExecutionContext } from '@/features/entities/page-core/types';
import {
    resolveEntityPagePublicSettings,
} from '@/features/entities/page-core/request/entity-page-public-settings';
import {
    resolveEntityPageQueryInputs,
} from '@/features/entities/page-core/request/entity-page-query-inputs';

export type EntitySearchSchema = z.infer<typeof entitySearchSchema>;

const readRequestOrigin = createIsomorphicFn()
    .client(() => {
        if (typeof window === 'undefined') return undefined;
        return window.location.origin;
    })
    .server(async (): Promise<string | undefined> => {
        const { getRequestUrl } = await import('@tanstack/react-start/server');
        return getRequestUrl().origin;
    });

export const Route = createFileRoute('/entities/$cui')({
    headers: () => createPublicPageCacheHeaders({
        sharedMaxAgeSeconds: 300,
        staleWhileRevalidateSeconds: 86400,
    }),
    validateSearch: entitySearchSchema,
    head: ({ params, match }: any) => buildEntityRouteHead({
        routeId: 'entities',
        cui: params.cui,
        snapshot: match.loaderData?.entitySeoSnapshot,
        searchLang: (match.search as EntitySearchSchema | undefined)?.lang,
        siteUrl: match.loaderData?.requestSiteUrl,
    }),
    loader: (async ({ context, params, location }: any) => {
        const { queryClient } = context;
        const requestSiteUrl = await readRequestOrigin();

        const search = entitySearchSchema.parse(location.search);
        const START_YEAR = defaultYearRange.start;
        const END_YEAR = defaultYearRange.end;
        const desiredView = (search?.view as string | undefined) ?? 'overview';
        const year = (search?.year as number | undefined) ?? DEFAULT_SELECTED_YEAR;
        const period = search.period ?? 'YEAR';
        const month = period === 'MONTH' ? ((search.month ?? '01') as TMonth) : undefined;
        const quarter = period === 'QUARTER' ? ((search.quarter ?? 'Q1') as TQuarter) : undefined;
        const reportTypeRaw = (search?.report_type as GqlReportType | undefined);
        const reportType = toExecutionReportType(reportTypeRaw);
        const mainCreditorCui = (search?.main_creditor_cui as string | undefined);

        const normalizationRaw = (search?.normalization as NormalizationInput | undefined) ?? 'total';
        const urlPublicSettings = resolveEntityPagePublicSettings({
            normalizationRaw,
            currencyParam: search?.currency,
            inflationAdjustedParam: (search as { inflation_adjusted?: unknown })?.inflation_adjusted,
            showPeriodGrowthParam: (search as { show_period_growth?: unknown })?.show_period_growth,
        });
        const {
            forcedOverrides: {
                currency: forcedCurrency,
                inflationAdjusted: forcedInflation,
            },
        } = resolveNormalizationSettings(normalizationRaw);
        const isClient = typeof globalThis.window !== 'undefined';
        const clientCurrency = isClient ? readClientCurrencyPreference() : null;
        const clientInflation = isClient ? readClientInflationAdjustedPreference() : null;
        const effectivePublicSettings = {
            normalization: urlPublicSettings.normalization,
            currency: forcedCurrency
                ?? parseCurrencyParam(search?.currency)
                ?? clientCurrency
                ?? DEFAULT_CURRENCY,
            inflationAdjusted: forcedInflation
                ?? parseBooleanParam((search as { inflation_adjusted?: unknown })?.inflation_adjusted)
                ?? clientInflation
                ?? DEFAULT_INFLATION_ADJUSTED,
            showPeriodGrowth: urlPublicSettings.showPeriodGrowth,
        } as const;

        const executionContext: EntityPageExecutionContext = {
            routeId: 'entities',
            cui: params.cui,
            lang: search.lang,
            period,
            year,
            month,
            quarter,
            reportType: reportTypeRaw,
            effectiveReportType: reportType,
            mainCreditorCui,
            activeView: desiredView,
            publicSettings: effectivePublicSettings,
        };
        const exactQueryInputs = resolveEntityPageQueryInputs({
            context: executionContext,
        });

        const entitySeoSnapshotBase: EntitySeoSnapshot = {
            cui: params.cui,
            filterContext: {
                year,
                period,
                month,
                quarter,
                reportType: reportTypeRaw,
                mainCreditorCui,
                normalization: effectivePublicSettings.normalization,
                currency: effectivePublicSettings.currency,
                inflationAdjusted: effectivePublicSettings.inflationAdjusted,
                showPeriodGrowth: effectivePublicSettings.showPeriodGrowth,
                lang: search.lang,
            },
        };

        const ssrParams = exactQueryInputs.entityDetails;

        // SSR settings for useGlobalSettings hook
        // Must match the actual currency used for data fetching so display label matches data values
        const ssrSettings = {
            currency: effectivePublicSettings.currency,
            inflationAdjusted: effectivePublicSettings.inflationAdjusted,
        };

        // Forced overrides for useGlobalSettings hook
        const forcedOverrides = {
            currency: forcedCurrency,
            inflationAdjusted: forcedInflation,
        };

        const detailsOptions = entityDetailsQueryOptions(ssrParams);

        try {
            await queryClient.ensureQueryData(detailsOptions);
        } catch (error) {
            if (!import.meta.env.DEV) {
                throw error;
            }

            console.warn('[entities/$cui] SSR entity prefetch failed', {
                cui: params.cui,
                error,
            });

            return {
                ssrParams,
                ssrSettings,
                forcedOverrides,
                entitySeoSnapshot: entitySeoSnapshotBase,
                requestSiteUrl,
            };
        }

        const entity = queryClient.getQueryData(detailsOptions.queryKey) as EntityDetailsData | undefined;

        if (!entity) {
            return {
                ssrParams,
                ssrSettings,
                forcedOverrides,
                entitySeoSnapshot: entitySeoSnapshotBase,
                requestSiteUrl,
            };
        }

        const entitySeoSnapshot: EntitySeoSnapshot = {
            ...entitySeoSnapshotBase,
            name: entity.name,
            entityType: entity.entity_type,
            defaultReportType: entity.default_report_type,
            countyName: entity.uat?.county_name,
            population: entity.uat?.population,
            totalIncome: entity.totalIncome,
            totalExpenses: entity.totalExpenses,
            budgetBalance: entity.budgetBalance,
        };

        if (desiredView === 'map' && entity.is_uat) {
            const mapViewType = entity.entity_type === 'admin_county_council' || entity.cui === '4267117' ? 'County' : 'UAT';
            // GeoJSON uses relative URLs that don't work during SSR, prefetch only on client
            if (typeof window !== 'undefined') {
                void queryClient.prefetchQuery(geoJsonQueryOptions(mapViewType));
            }
                const filters = (search?.mapFilters as AnalyticsFilterType) || withDefaultExcludes({
                    account_category: 'ch',
                    normalization: 'per_capita',
                    currency: effectivePublicSettings.currency,
                    inflation_adjusted: effectivePublicSettings.inflationAdjusted,
                    report_period: getInitialFilterState('YEAR', year, '12', 'Q4'),
                });
            if (mapViewType === 'UAT') {
                void queryClient.prefetchQuery(heatmapUATQueryOptions(filters));
            } else {
                void queryClient.prefetchQuery(heatmapJudetQueryOptions(filters));
            }
        }

        if (desiredView === 'income-trends' || desiredView === 'expense-trends') {
            const accountCategory: 'vn' | 'ch' = desiredView === 'income-trends' ? 'vn' : 'ch';
            const lineItems = entity.executionLineItems?.nodes ?? [];
            type MinimalLineItem = { account_category: 'vn' | 'ch'; amount: number; functionalClassification?: { functional_code?: string | null } };
            const filtered = (lineItems as MinimalLineItem[]).filter((li) => li.account_category === accountCategory);
            const topGroups: string[] = getTopFunctionalGroupCodes(filtered as unknown as import('@/lib/api/entities').ExecutionLineItem[], 10);
            if (topGroups.length > 0) {
                const defaultExclude = accountCategory === 'ch'
                    ? { economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES] }
                    : { functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES] };
                const baseInputs: AnalyticsInput[] = topGroups.map((prefix: string) => ({
                    seriesId: `${prefix}${params.cui}-${desiredView === 'income-trends' ? 'income' : 'expense'}`,
                    filter: {
                        entity_cuis: [params.cui],
                        functional_prefixes: [prefix],
                        account_category: accountCategory,
                        report_type: toReportTypeValue(toExecutionReportType(entity.default_report_type) ?? 'PRINCIPAL_AGGREGATED'),
                        normalization: effectivePublicSettings.normalization,
                        currency: effectivePublicSettings.currency,
                        inflation_adjusted: effectivePublicSettings.inflationAdjusted,
                        show_period_growth: effectivePublicSettings.showPeriodGrowth,
                        exclude: defaultExclude,
                    },
                }));
                const fallbackPeriod = makeTrendPeriod('YEAR', year, START_YEAR, END_YEAR);
                const inputs: AnalyticsInput[] = baseInputs.map((i) => ({
                    ...i,
                    filter: prepareFilterForServer(i.filter as unknown as AnalyticsFilterType, { period: fallbackPeriod }),
                }));
                const payloadHash = inputs
                    .slice()
                    .sort((a, b) => a.seriesId.localeCompare(b.seriesId))
                    .reduce((acc, input) => acc + input.seriesId + '::' + JSON.stringify(input.filter), '');
                const hash = generateHash(payloadHash);
                void queryClient.prefetchQuery({
                    queryKey: ['chart-data', hash],
                    queryFn: () => getChartAnalytics(inputs),
                    staleTime: 1000 * 60 * 60 * 24,
                    gcTime: 1000 * 60 * 60 * 24 * 3,
                } as Parameters<typeof queryClient.prefetchQuery>[0]);
            }
        }

        return {
            ssrParams,
            ssrSettings,
            forcedOverrides,
            entitySeoSnapshot,
            requestSiteUrl,
        };
    }) as any,
    pendingComponent: ViewLoading,
    component: () => null,
});
