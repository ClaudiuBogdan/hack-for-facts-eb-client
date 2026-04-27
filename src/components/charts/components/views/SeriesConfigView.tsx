import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Settings, Eye, RotateCcw, BellPlus, CircleHelp } from 'lucide-react';
import {
  CustomSeriesValueConfigurationSchema,
  Series,
  SeriesConfiguration,
  SeriesGroupConfiguration,
  StaticSeriesConfigurationSchema,
  createDefaultCommitmentsYearReportPeriod,
  type InsSeriesAggregation,
} from '@/schemas/charts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { SeriesFilter } from '../series-config/SeriesFilter';
import { useChartStore } from '../../hooks/useChartStore';
import { generateRandomColor } from '../chart-renderer/utils';
import { Slider } from '@/components/ui/slider';
import { DataLabelSelector } from '../series-config/DataLabelSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalculationConfig } from '../series-config/CalculationConfig';
import { CustomSeriesDataEditor } from '../series-config/CustomSeriesDataEditor';
import { CustomSeriesConfigurationSchema } from '@/schemas/charts';
import { CustomSeriesValueEditor } from '../series-config/CustomSeriesValueEditor';
import { UnitInput } from '../series-config/UnitInput';
import { StaticSeriesEditor } from '../series-config/StaticSeriesEditor';
import { InsSeriesEditor } from '../series-config/InsSeriesEditor';
import { useCopyPasteChart } from '../../hooks/useCopyPaste';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { buildAlertFromFilter } from '@/lib/alert-links';
import { createEmptyAlert } from '@/schemas/alerts';
import { Analytics } from '@/lib/analytics';
import { DebouncedStatusInput } from '@/components/ui/debounced-status-input';
import { InsSeriesConfigurationSchema } from '@/schemas/charts';
import { toReportTypeValue } from '@/schemas/reporting';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults';

function getInsAggregationDescription(aggregation: InsSeriesAggregation | undefined): string {
  if (aggregation === 'average') {
    return t`Use the mean value when multiple observations exist in the same period.`;
  }
  if (aggregation === 'first') {
    return t`Use only the first matching observation for each period.`;
  }
  return t`Use the total of all matching observations in each period.`;
}

const DEFAULT_EXECUTION_REPORT_TYPE = 'Executie bugetara agregata la nivel de ordonator principal' as const;

function coerceCommitmentsReportType(reportType: unknown): 'PRINCIPAL_AGGREGATED' | 'SECONDARY_AGGREGATED' | 'DETAILED' {
  const value = String(reportType ?? '').trim();
  if (
    value === 'SECONDARY_AGGREGATED' ||
    value === 'COMMITMENT_SECONDARY_AGGREGATED' ||
    value === 'Executie bugetara agregata la nivel de ordonator secundar' ||
    value === 'Angajamente bugetare agregat secundar'
  ) {
    return 'SECONDARY_AGGREGATED';
  }
  if (
    value === 'DETAILED' ||
    value === 'COMMITMENT_DETAILED' ||
    value === 'Executie bugetara detaliata' ||
    value === 'Angajamente bugetare detaliat'
  ) {
    return 'DETAILED';
  }
  return 'PRINCIPAL_AGGREGATED';
}

function coerceExecutionReportType(reportType: unknown): string {
  const commitmentsType = coerceCommitmentsReportType(reportType);
  try {
    return toReportTypeValue(commitmentsType);
  } catch {
    return DEFAULT_EXECUTION_REPORT_TYPE;
  }
}

export function SeriesConfigView() {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const { chart, seriesId, updateSeries, deleteSeries, goToOverview, goToConfig } = useChartStore();
  const series = chart.series.find(s => s.id === seriesId);
  const seriesLabel = series?.label || '';
  const [localLabel, setLocalLabel] = useState(seriesLabel);
  const [localXAxisPrefix, setLocalXAxisPrefix] = useState(series?.config?.xAxisPrefixToRemove || '');
  // Status indicators handled in DebouncedStatusInput
  const inputRef = useRef<HTMLInputElement>(null);
  const { duplicateSeries, copySeries } = useCopyPasteChart();
  const navigate = useNavigate({ from: '/charts/$chartId' });


  useEffect(() => {
    setLocalLabel(seriesLabel);
  }, [seriesLabel]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep local x-axis prefix in sync when the series changes elsewhere
  useEffect(() => {
    setLocalXAxisPrefix(series?.config?.xAxisPrefixToRemove || '');
  }, [series?.id, series?.config?.xAxisPrefixToRemove]);

  const updateSeriesField = (field: keyof Series, value: string | object) => {
    if (!series) return;
    updateSeries(series.id, (prev) => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));
  };

  const handleSeriesTypeChange = (nextType: string) => {
    if (!series) return;
    if (nextType === 'line-items-aggregated-yearly') {
      updateSeries(series.id, (prev) => {
        const prevFilter = (prev as unknown as { filter?: Record<string, unknown> }).filter ?? {};
        return {
          ...prev,
          type: nextType,
          filter: {
            ...prevFilter,
            report_type: coerceExecutionReportType(prevFilter.report_type),
          },
          updatedAt: new Date().toISOString(),
        } as Series;
      });
      return;
    }
    if (nextType !== 'commitments-analytics') {
      updateSeriesField('type', nextType);
      return;
    }

    updateSeries(series.id, (prev) => {
      const previousSeries = prev as unknown as { filter?: Record<string, unknown>; metric?: string };
      const prevFilter = previousSeries.filter ?? {};
      const prevExclude = (prevFilter.exclude ?? {}) as Record<string, unknown>;
      const commitmentsReportType = coerceCommitmentsReportType(prevFilter.report_type);
      const previousMetric =
        typeof previousSeries.metric === 'string'
          ? previousSeries.metric
          : typeof prevFilter.metric === 'string'
            ? prevFilter.metric
            : 'CREDITE_ANGAJAMENT';

      return {
        ...prev,
        type: 'commitments-analytics',
        metric: previousMetric,
        unit: '',
        filter: {
          ...prevFilter,
          report_type: commitmentsReportType,
          report_period: prevFilter.report_period ?? createDefaultCommitmentsYearReportPeriod(),
          normalization: prevFilter.normalization ?? 'total',
          currency: prevFilter.currency ?? 'RON',
          inflation_adjusted: prevFilter.inflation_adjusted ?? false,
          exclude: {
            ...prevExclude,
            economic_prefixes:
              (prevExclude.economic_prefixes as string[] | undefined)?.length
                ? prevExclude.economic_prefixes
                : [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
          },
        },
        updatedAt: new Date().toISOString(),
      } as Series;
    });
  };

  const updateSeriesConfig = (config: Partial<SeriesConfiguration['config']>) => {
    if (!series) return;
    updateSeries(series.id, (prev) => ({
      ...prev,
      config: { ...prev.config, ...config },
      updatedAt: new Date().toISOString(),
    }));
  };

  if (!series) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground"><Trans>Series not found</Trans></p>
          <Button onClick={goToConfig} className="mt-4">
            <Trans>Back to Configuration</Trans>
          </Button>
        </div>
      </div>
    );
  }

  const handleDeleteSeries = () => {
    goToOverview();
    deleteSeries(series?.id || '');
  };

  const handleCreateAlertFromSeries = () => {
    if (!series) return;
    let alert;
    if (series.type === 'line-items-aggregated-yearly') {
      alert = buildAlertFromFilter((series as SeriesConfiguration).filter, { chartId: chart.id, chartTitle: chart.title, label: series.label });
    } else if (series.type === 'static-series') {
      // Build a static-series alert with selected datasetId
      alert = createEmptyAlert({
        title: series.label || undefined,
        description: undefined,
        seriesType: 'static',
        datasetId: (series as unknown as { seriesId?: string }).seriesId,
      });
    } else {
      return;
    }
    Analytics.capture(Analytics.EVENTS.AlertCreateStarted, {
      alert_id: alert.id!,
      source: 'chart_series',
      chart_id: chart.id,
      series_id: series.id,
    });
    navigate({
      to: '/alerts/$alertId',
      params: { alertId: alert.id! },
      search: { alert, view: 'overview', mode: 'create' },
      replace: false,
    });
  };

  const isLineItemsSeries = series.type === 'line-items-aggregated-yearly' || series.type === 'static-series';
  const isInsSeries = series.type === 'ins-series';
  const insSeries = isInsSeries
    ? (series as z.infer<typeof InsSeriesConfigurationSchema>)
    : null;
  const insAggregation = insSeries?.aggregation ?? 'sum';

  const updateInsSeries = (patch: Partial<z.infer<typeof InsSeriesConfigurationSchema>>) => {
    if (!isInsSeries) return;
    updateSeries(series.id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 w-full overflow-x-hidden">
      {/* Normal page header with breadcrumbs */}
      <header className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="#" onClick={(e) => { e.preventDefault(); goToOverview(); }}>Chart</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="#" onClick={(e) => { e.preventDefault(); goToConfig(); }}>Chart Config</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Config</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight"><Trans>Configure Series</Trans></h2>
          <div className="flex items-center gap-2">
            <Button onClick={goToOverview} className="gap-2">
              <Eye className="h-4 w-4" />
              <Trans>View Chart</Trans>
            </Button>
          </div>
        </div>
      </header>

      {/* Single-column flow with quick settings under type */}
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="series-label"><Trans>Series Label</Trans> *</Label>
              <DebouncedStatusInput
                ref={inputRef}
                id="series-label"
                value={localLabel}
                onImmediateChange={(v) => setLocalLabel(v)}
                onDebouncedChange={(v) => updateSeriesField('label', v)}
                debounceMs={600}
                placeholder={t`Enter series label...`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="series-type"><Trans>Series Type</Trans></Label>
              <Select
                value={series?.type}
                onValueChange={handleSeriesTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t`Select Series Type`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line-items-aggregated-yearly">{t`Line Items Aggregated Yearly`}</SelectItem>
                  <SelectItem value="commitments-analytics">{t`Commitments Analytics`}</SelectItem>
                  <SelectItem value="aggregated-series-calculation">{t`Aggregated Series Calculation`}</SelectItem>
                  <SelectItem value="custom-series">{t`Custom Series`}</SelectItem>
                  <SelectItem value="custom-series-value">{t`Custom Series Value`}</SelectItem>
                  <SelectItem value="static-series">{t`Static Series`}</SelectItem>
                  <SelectItem value="ins-series">{t`INS Series`}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick settings section with improved layout */}
            <div className="flex flex-col gap-4 pt-2 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
                {/* Left side: Active toggle and Color picker */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="series-enabled" className="text-sm font-medium cursor-pointer">
                      <Trans>Active</Trans>
                    </Label>
                    <Switch
                      id="series-enabled"
                      checked={!!series?.enabled}
                      onCheckedChange={(checked) => series && updateSeries(series.id, (prev) => ({ ...prev, enabled: checked, updatedAt: new Date().toISOString() }))}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="series-color" className="text-sm font-medium">
                      <Trans>Series Color</Trans>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="series-color"
                        type="color"
                        value={series?.config.color || chart.config.color}
                        onChange={(e) => updateSeriesConfig({ color: e.target.value })}
                        className="w-10 h-10 rounded-md border-2 cursor-pointer"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateSeriesConfig({ color: generateRandomColor() })}
                        title={t`Generate random color`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right side: Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {isLineItemsSeries && (
                    <Button variant="outline" size="sm" onClick={handleCreateAlertFromSeries} title={t`Create alert from this series`}>
                      <BellPlus className="h-4 w-4 mr-2" />
                      <Trans>Create Alert</Trans>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => duplicateSeries(series!.id)} title={t`Duplicate series`}>
                    <Trans>Duplicate</Trans>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copySeries(series!.id)} title={t`Copy series`}>
                    <Trans>Copy</Trans>
                  </Button>
                </div>
              </div>
            </div>

            {series.type !== 'line-items-aggregated-yearly' && series.type !== 'commitments-analytics' && (
              <UnitInput
                id="series-unit"
                value={series?.unit || ''}
                onChange={(value) => updateSeriesField('unit', value)}
                placeholder={t`e.g., RON, %, Units...`}
              />
            )}

            <div className="pt-2">
              <Button
                variant="link"
                className="p-0 h-auto text-sm font-normal text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              >
                {showAdvancedSettings ? <Trans>Hide advanced settings</Trans> : <Trans>Show advanced settings</Trans>}
              </Button>
            </div>

            {showAdvancedSettings && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="series-show-data-labels" className="flex flex-col space-y-1">
                    <span><Trans>Show Data Labels</Trans></span>
                    <span className="font-normal leading-snug text-muted-foreground">
                      <Trans>Display data labels on the chart</Trans>
                    </span>
                  </Label>
                  <Switch
                    id="series-show-data-labels"
                    checked={series?.config.showDataLabels ?? false}
                    onCheckedChange={(checked) => updateSeriesConfig({ showDataLabels: checked })}
                  />
                </div>
                <DataLabelSelector
                  selectedLabels={series.config.dataLabels || []}
                  onChange={(labels) => updateSeriesConfig({ dataLabels: labels })}
                />
                <div className="space-y-3">
                  <Label htmlFor="data-label-offset"><Trans>Data Label Offset</Trans></Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="data-label-offset"
                      min={-100}
                      max={100}
                      step={1}
                      value={[series.config.dataLabelOffset || 0]}
                      onValueChange={(value) => updateSeriesConfig({ dataLabelOffset: value[0] })}
                      className="w-full"
                    />
                    <span className="text-sm font-medium text-muted-foreground w-16 text-right">
                      {series.config.dataLabelOffset || 0}px
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-axis-prefix-to-remove" className="flex flex-col space-y-1">
                    <span><Trans>X-Axis Prefix To Remove</Trans></span>
                    <span className="font-normal leading-snug text-muted-foreground">
                      <Trans>Strip this prefix from x-axis labels for this series (e.g., 2024-). Helps align yearly and monthly data on a common axis.</Trans>
                    </span>
                  </Label>
                  <DebouncedStatusInput
                    id="x-axis-prefix-to-remove"
                    value={localXAxisPrefix}
                    onImmediateChange={(v) => setLocalXAxisPrefix(v)}
                    onDebouncedChange={(v) => updateSeriesConfig({ xAxisPrefixToRemove: v || undefined })}
                    debounceMs={700}
                    placeholder={t`Example: 2024-`}
                  />
                </div>
                {isInsSeries && (
                  <div className="space-y-4 rounded-md border px-3 py-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ins-aggregation">
                          <Trans>Aggregation</Trans>
                        </Label>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={t`Aggregation help`}
                              >
                                <CircleHelp className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm space-y-1.5">
                              <p>
                                <Trans>Use aggregation when multiple INS rows match the same period.</Trans>
                              </p>
                              <p>
                                <Trans>Total: add all matching values (best for additive breakdowns).</Trans>
                              </p>
                              <p>
                                <Trans>Average: use the mean value (best for repeated measurements).</Trans>
                              </p>
                              <p>
                                <Trans>First value only: keep one deterministic row (fallback/debug).</Trans>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={insAggregation}
                        onValueChange={(value) =>
                          updateInsSeries({ aggregation: value as InsSeriesAggregation })
                        }
                      >
                        <SelectTrigger id="ins-aggregation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sum">
                            <Trans>Total (sum all values)</Trans>
                          </SelectItem>
                          <SelectItem value="average">
                            <Trans>Average (mean value)</Trans>
                          </SelectItem>
                          <SelectItem value="first">
                            <Trans>First value only</Trans>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {getInsAggregationDescription(insAggregation)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ins-has-value" className="flex flex-col space-y-1">
                        <span><Trans>Only observations with values</Trans></span>
                        <span className="font-normal leading-snug text-muted-foreground">
                          <Trans>Filters out missing or non-numeric points before chart mapping.</Trans>
                        </span>
                      </Label>
                      <Switch
                        id="ins-has-value"
                        checked={insSeries?.hasValue ?? true}
                        onCheckedChange={(checked) => updateInsSeries({ hasValue: checked })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ================= Series Filter / Calculation ================= */}
        {(series.type === 'line-items-aggregated-yearly' || series.type === 'commitments-analytics') && (
          <SeriesFilter seriesId={seriesId} />
        )}
        {series.type === 'aggregated-series-calculation' && (
          <CalculationConfig series={series as SeriesGroupConfiguration} />
        )}
        {series.type === 'custom-series' && (
          <CustomSeriesDataEditor series={series as z.infer<typeof CustomSeriesConfigurationSchema>} />
        )}
        {series.type === 'custom-series-value' && (
          <CustomSeriesValueEditor series={series as z.infer<typeof CustomSeriesValueConfigurationSchema>} />
        )}
        {series.type === 'static-series' && (
          <StaticSeriesEditor series={series as z.infer<typeof StaticSeriesConfigurationSchema>} />
        )}
        {series.type === 'ins-series' && (
          <InsSeriesEditor series={series as z.infer<typeof InsSeriesConfigurationSchema>} />
        )}

        {/* ================= Series Delete ================= */}
        <footer className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
          <Button onClick={goToConfig} variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            <Trans>Chart Configuration</Trans>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <Trans>Delete Series</Trans>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel><Trans>Are you sure you want to delete this series?</Trans></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteSeries}
                className="text-destructive focus:bg-destructive focus:text-white"
              >
                <Trans>Delete</Trans>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Trans>Cancel</Trans>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </footer>
      </div>
    </div>
  );
}
