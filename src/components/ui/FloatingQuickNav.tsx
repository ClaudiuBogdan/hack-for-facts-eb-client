import { cn, generateHash, getNormalizationUnit } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Map, BarChart2, Table, Link2, Check, Search } from 'lucide-react';
import { AnalyticsFilterType, Chart, ChartSchema, ReportType } from '@/schemas/charts';
import { useNavigate } from '@tanstack/react-router';
import { ChartUrlState } from '@/components/charts/page-schema';
import { MapUrlState } from '@/schemas/map-filters';
import { EntityAnalyticsUrlState } from '@/routes/entity-analytics';
import { getSeriesColor } from '../charts/components/chart-renderer/utils';
import { useEntityLabel, useUatLabel } from '@/hooks/filters/useFilterLabels';
import { LabelStore } from '@/hooks/filters/interfaces';
import { t } from '@lingui/core/macro';
import { toast } from 'sonner';
import { ensureShortRedirectUrl } from '@/lib/api/shortLinks';
import { getSiteUrl } from '@/config/env';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { FloatingEntitySearch } from '@/components/entities/FloatingEntitySearch';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQueryClient } from '@tanstack/react-query';

type ActionKey = 'map' | 'table' | 'chart' | 'share' | 'search';

type Action = {
    key: ActionKey;
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
    active?: boolean;
}

interface FloatingQuickNavProps {
    className?: string;
    mapViewType: 'UAT' | 'County';
    mapActive?: boolean;
    tableActive?: boolean;
    chartActive?: boolean;
    filterInput: AnalyticsFilterType;
}

export function FloatingQuickNav({ className, mapViewType, mapActive, tableActive, chartActive, filterInput }: FloatingQuickNavProps) {

    const uatLabelMap = useUatLabel((filterInput.uat_ids ?? []).map(String));
    const entityLabelMap = useEntityLabel((filterInput.entity_cuis ?? []) as string[]);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isSignedIn } = useAuth();
    const [shareCopied, setShareCopied] = useState(false);
    const [showEntitySearch, setShowEntitySearch] = useState(false);

    const handleMapNavigate = () => {
        const next = convertFilterInputToMapState(filterInput, mapViewType)
        navigate({ to: '/map', search: next });
    }

    const handleTableNavigate = () => {
        const next = convertFilterInputToEntityTableState(filterInput, mapViewType)
        navigate({ to: '/entity-analytics', search: next });
    }

    const handleChartNavigate = () => {
        const next = convertFilterInputToChartState(filterInput, { uatLabelMap, entityLabelMap })
        navigate({ to: '/charts/$chartId', params: { chartId: next.chart.id }, search: next });
    }

    const handleShare = async () => {
        try {
            const url = window.location.href;
            let linkToCopy = url;
            if (isSignedIn) {
                try {
                    linkToCopy = await ensureShortRedirectUrl(url, getSiteUrl(), queryClient);
                } catch (e) {
                    console.error('Failed to generate short link, falling back to full URL', e);
                }
            }
            await navigator.clipboard.writeText(linkToCopy);
            toast.success(t`Link copied to clipboard`);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
            toast.error(t`Failed to copy link`);
        }
    }

    // Hotkeys for quick navigation
    useHotkeys('ctrl+k, cmd+k', () => setShowEntitySearch(true), { preventDefault: true });
    useHotkeys('ctrl+m, cmd+m', handleMapNavigate, { preventDefault: true });
    useHotkeys('ctrl+t, cmd+t', handleTableNavigate, { preventDefault: true });
    useHotkeys('ctrl+h, cmd+h', handleChartNavigate, { preventDefault: true });
    useHotkeys('ctrl+s, cmd+s, mod+s', handleShare, { preventDefault: true });

    const actions: Action[] = [
        { key: 'search', label: t`Search Entities`, onClick: () => setShowEntitySearch(true), icon: <Search className="h-5 w-5" />, active: true },
        { key: 'map', label: t`Go to Map`, onClick: handleMapNavigate, icon: <Map className="h-5 w-5" />, active: mapActive },
        { key: 'table', label: t`Go to Entity Table`, onClick: handleTableNavigate, icon: <Table className="h-5 w-5" />, active: tableActive },
        { key: 'chart', label: t`Go to Chart View`, onClick: handleChartNavigate, icon: <BarChart2 className="h-5 w-5" />, active: chartActive },
        { key: 'share', label: t`Copy Share Link`, onClick: handleShare, icon: shareCopied ? <Check className="h-5 w-5 text-green-600" /> : <Link2 className="h-5 w-5" />, active: true },
    ]

    const visibleActions = actions.filter(a => a.active);

    return (
        <>
            <div
                className={cn(
                    'hidden sm:flex fixed top-10 right-4 z-40 flex-col gap-2',
                    className,
                )}
            >
                {visibleActions.map(action => (
                    <Button
                        key={action.key}
                        aria-label={action.label}
                        title={action.label}
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-lg border border-border hover:bg-secondary/50 transition-colors"
                        onClick={action.onClick}
                    >
                        {action.icon}
                    </Button>
                ))}
            </div>
            {showEntitySearch && (
                <FloatingEntitySearch
                    externalOpen={showEntitySearch}
                    onOpenChange={setShowEntitySearch}
                />
            )}
        </>
    );
}

function coerceReportType(filter: AnalyticsFilterType): ReportType | undefined {
    const reportTypes = (filter as Record<string, unknown>).report_types
    const fromReportTypes = (Array.isArray(reportTypes) ? reportTypes[0] : undefined) as ReportType | undefined
    return fromReportTypes ?? filter.report_type ?? undefined
}

function convertFilterInputToChartState(
    filterInput: AnalyticsFilterType,
    labelMaps: { uatLabelMap: LabelStore; entityLabelMap: LabelStore }
): ChartUrlState {
    const accountCategory = (filterInput.account_category ?? 'ch') as 'ch' | 'vn'
    const reportType = coerceReportType(filterInput) ?? 'Executie bugetara agregata la nivel de ordonator principal'
    const series: Chart['series'] = []

    // Edge cases:
    // - If County view and entity_cuis contains a county entity (admin_county_council), keep CUI as-is
    // - If County view and no entities selected but county_codes present, create one series per county
    // - If UAT view and entity_cuis provided, create one series per entity

    if (filterInput.entity_cuis && filterInput.entity_cuis.length > 0) {
        // One series per selected entity CUI
        filterInput.entity_cuis.forEach((cui, index) => {
            series.push({
                id: crypto.randomUUID(),
                type: 'line-items-aggregated-yearly',
                enabled: true,
                label: labelMaps.entityLabelMap.map(cui),
                unit: getNormalizationUnit({ normalization: filterInput.normalization, currency: filterInput.currency, show_period_growth: filterInput.show_period_growth }),
                filter: {
                    ...filterInput,
                    account_category: accountCategory,
                    report_type: reportType,
                    entity_cuis: [cui],
                },
                config: {
                    showDataLabels: false,
                    color: getSeriesColor(index),
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
        })
    } else if (filterInput.uat_ids && filterInput.uat_ids.length > 0) {
        // One series per selected entity (assumed county councils)
        filterInput.uat_ids.forEach((uatId, index) => {
            series.push({
                id: crypto.randomUUID(),
                type: 'line-items-aggregated-yearly',
                enabled: true,
                label: labelMaps.uatLabelMap.map(uatId),
                unit: getNormalizationUnit({ normalization: filterInput.normalization as 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro', currency: filterInput.currency as 'RON' | 'EUR' | 'USD', show_period_growth: filterInput.show_period_growth }),
                filter: {
                    ...filterInput,
                    account_category: accountCategory,
                    report_type: reportType,
                    uat_ids: [uatId],
                },
                config: {
                    showDataLabels: false,
                    color: getSeriesColor(index),
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
        })
    } else if (filterInput.county_codes && filterInput.county_codes.length > 0) {
        filterInput.county_codes.forEach((cc, index) => {
            series.push({
                id: crypto.randomUUID(),
                type: 'line-items-aggregated-yearly',
                enabled: true,
                label: `County ${cc}`,
                unit: getNormalizationUnit({ normalization: filterInput.normalization as 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro', currency: filterInput.currency as 'RON' | 'EUR' | 'USD', show_period_growth: filterInput.show_period_growth }),
                filter: {
                    ...filterInput,
                    account_category: accountCategory,
                    report_type: reportType,
                    county_codes: [cc],
                },
                config: {
                    showDataLabels: false,
                    color: getSeriesColor(index),
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
        })
    }

    if (series.length === 0) {
        // Default: one series with provided filter
        series.push({
            id: crypto.randomUUID(),
            type: 'line-items-aggregated-yearly',
            enabled: true,
            label: "Series",
            unit: getNormalizationUnit({ normalization: filterInput.normalization as 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro', currency: filterInput.currency as 'RON' | 'EUR' | 'USD', show_period_growth: filterInput.show_period_growth }),
            filter: {
                ...filterInput,
                account_category: accountCategory,
                report_type: reportType,
            },
            config: {
                showDataLabels: false,
                color: getSeriesColor(0),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
    }

    const chartId = generateHash(JSON.stringify(filterInput))
    const chartState: ChartUrlState = {
        chart: ChartSchema.parse({
            id: chartId,
            title: t`Analytics`,
            config: {
                chartType: 'bar',
            },
            series,
            annotations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }),
        view: 'overview',
    }
    return chartState
}

function convertFilterInputToEntityTableState(filterInput: AnalyticsFilterType, mapViewType: 'UAT' | 'County'): EntityAnalyticsUrlState {
    const accountCategory = filterInput.account_category ?? 'ch'
    const reportType = coerceReportType(filterInput) ?? 'Executie bugetara agregata la nivel de ordonator principal'
    const sanitized = stripGlobalCurrencyAndInflation(filterInput)
    const base: EntityAnalyticsUrlState = {
        view: 'table',
        sortOrder: 'desc',
        page: 1,
        pageSize: 25,
        filter: { ...sanitized, account_category: accountCategory, report_type: reportType },
    }

    // Edge cases for uat table:
    // - If switching from County with no uat_ids, aggregate at county level: use entity_types admin_county_council
    // - If County and uat_ids selected -> prefer uat_ids
    // - If UAT view and uat_ids selected, keep is_uat true
    if (mapViewType === 'County') {
        if (filterInput.uat_ids && filterInput.uat_ids.length > 0) {
            base.filter = { ...base.filter, uat_ids: filterInput.uat_ids, entity_types: undefined, is_uat: undefined }
        } else {
            base.filter = { ...base.filter, entity_types: ['admin_county_council'], is_uat: undefined }
        }
    } else {
        if (filterInput.county_codes && filterInput.county_codes.length > 0) {
            base.filter = { ...base.filter, is_uat: undefined }
        } else {
            base.filter = { ...base.filter, is_uat: true }
        }
    }

    return base
}

function convertFilterInputToMapState(filterInput: AnalyticsFilterType, mapViewType: 'UAT' | 'County'): MapUrlState {
    const accountCategory = filterInput.account_category ?? 'ch'
    const reportType = coerceReportType(filterInput) ?? 'Executie bugetara agregata la nivel de ordonator principal'
    const sanitized = stripGlobalCurrencyAndInflation(filterInput)
    return {
        filters: { ...sanitized, account_category: accountCategory, report_type: reportType },
        mapViewType: mapViewType,
        activeView: 'map',
    }
}

function stripGlobalCurrencyAndInflation(filterInput: AnalyticsFilterType): AnalyticsFilterType {
    return {
        ...filterInput,
        currency: undefined,
        inflation_adjusted: undefined,
    }
}
