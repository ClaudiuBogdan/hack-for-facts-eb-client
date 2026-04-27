import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import { yValueFormatter } from '../charts/components/chart-renderer/utils';
import { EntityFinancialTrendsSkeleton } from './EntityFinancialTrendsSkeleton';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { buildEntityIncomeExpenseChartLink } from '@/lib/chart-links';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { AnalyticsSeries } from '@/schemas/charts';
import type { ReportPeriodType } from '@/schemas/reporting';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { NormalizationOptions } from '@/lib/normalization';
import { normalizeNormalizationOptions } from '@/lib/normalization';
import { formatNumber, getNormalizationUnit } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { NormalizationModeSelect } from '@/components/normalization/normalization-mode-select';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';

/**
 * Given the merged chart data and the currently-selected year, return the Set
 * of data-point indices that should display a bar / line label.
 *
 * Rules:
 *  - ≤ 5 points  → label every point
 *  - ≤ 10 points → first, last, current year
 *  - > 10 points → current year only
 */
function selectLabelIndices(
  data: readonly { label: string }[],
  currentYear: number,
): Set<number> {
  const count = data.length
  if (count === 0) return new Set()

  if (count <= 5) {
    return new Set(data.map((_, i) => i))
  }

  const indices = new Set<number>()

  if (count <= 10) {
    indices.add(0)
    indices.add(count - 1)
  }

  const currentYearStr = String(currentYear)
  for (let i = 0; i < count; i++) {
    if (data[i].label.startsWith(currentYearStr)) {
      indices.add(i)
      break
    }
  }

  return indices
}

function MultiLineYAxisTick(props: {
  x?: number
  y?: number
  payload?: { value: number }
  unit: string
  mirror?: boolean
}) {
  const { x = 0, y = 0, payload, unit, mirror } = props
  return (
    <text
      x={mirror ? x + 4 : x}
      y={y}
      textAnchor={mirror ? 'start' : 'end'}
      fontSize={mirror ? 10 : 12}
      fill="currentColor"
      opacity={mirror ? 0.7 : 1}
    >
      <tspan x={mirror ? x + 4 : x} dy={-6}>{formatNumber(payload?.value, 'compact')}</tspan>
      <tspan x={mirror ? x + 4 : x} dy={mirror ? 12 : 14} fontSize={mirror ? 8 : 10} opacity={0.6}>{unit}</tspan>
    </text>
  )
}

interface EntityFinancialTrendsProps {
  entityCui?: string;
  incomeTrend?: AnalyticsSeries | null;
  expenseTrend?: AnalyticsSeries | null;
  balanceTrend?: AnalyticsSeries | null;
  currentYear: number;
  entityName: string;
  normalizationOptions: NormalizationOptions;
  onNormalizationChange?: (next: NormalizationOptions) => void;
  allowPerCapita?: boolean;
  onYearChange?: (year: number) => void;
  isLoading?: boolean;
  periodType?: ReportPeriodType;
  onSelectPeriod?: (label: string) => void;
  selectedQuarter?: string;
  selectedMonth?: string;
  onPrefetchPeriod?: (label: string) => void;
  showControls?: boolean;
  showChartEditorLink?: boolean;
}

const EntityFinancialTrendsComponent: React.FC<EntityFinancialTrendsProps> = ({
  entityCui,
  incomeTrend,
  expenseTrend,
  balanceTrend,
  currentYear,
  entityName,
  normalizationOptions,
  onNormalizationChange,
  allowPerCapita = false,
  onYearChange,
  isLoading,
  periodType = 'YEAR',
  onSelectPeriod,
  selectedQuarter,
  selectedMonth,
  onPrefetchPeriod,
  showControls = true,
  showChartEditorLink = true,
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const normalized = normalizeNormalizationOptions(normalizationOptions)
  const unit = getNormalizationUnit({ normalization: normalized.normalization, currency: normalized.currency, show_period_growth: normalized.show_period_growth })
  const showPeriodGrowth = normalized.show_period_growth

  const trendsAvailable = incomeTrend?.data.length || expenseTrend?.data.length || balanceTrend?.data.length;

  const mergedData = useMemo(() => {
    const baseSeries = (incomeTrend?.data?.length ? incomeTrend : (expenseTrend?.data?.length ? expenseTrend : balanceTrend))?.data ?? [];
    const labels = baseSeries.map(p => String(p.x));
    const getValue = (series: AnalyticsSeries | null | undefined, label: string): number => {
      const point = series?.data.find(p => String(p.x) === label);
      return point?.y ?? 0;
    };
    return labels.map(label => ({
      label,
      expense: getValue(expenseTrend, label),
      income: getValue(incomeTrend, label),
      balance: getValue(balanceTrend, label),
    }));
  }, [incomeTrend, expenseTrend, balanceTrend]);

  const yAxisWidth = useMemo(() => {
    if (!mergedData.length) return 40
    const allValues = mergedData.flatMap((d) => [d.income, d.expense, d.balance])
    const maxAbsValue = Math.max(...allValues.map(Math.abs))
    const longestLabel = formatNumber(maxAbsValue, 'compact')
    const charCount = Math.max(longestLabel.length, unit.length)
    // ~7px per character at fontSize 12, plus 6px padding
    return charCount * 7 + 6
  }, [mergedData, unit])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; stroke?: string; dataKey: string; }[]; label?: string }) => {
    if (active && payload?.length) {
      const monthNames: Record<string, string> = {
        '01': t`January`, '02': t`February`, '03': t`March`, '04': t`April`, '05': t`May`, '06': t`June`,
        '07': t`July`, '08': t`August`, '09': t`September`, '10': t`October`, '11': t`November`, '12': t`December`,
      }
      const heading = periodType === 'YEAR' ? t`Year` : periodType === 'QUARTER' ? t`Quarter` : t`Month`
      const prettyLabel = periodType === 'MONTH' ? (monthNames[label ?? ''] ?? String(label)) : String(label)
      return (
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="label font-bold mb-2">{heading}: {prettyLabel}</p>
          <div className="flex flex-col gap-2">
            {payload.map((pld) => (
              <div key={pld.dataKey} style={{ color: pld.stroke || pld.color }} className="flex flex-row gap-4 justify-between items-center text-sm">
                <p>{pld.name}</p>
                <p className="font-mono text-md font-bold text-slate-800 dark:text-slate-400">{yValueFormatter(pld.value, unit)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (e: { activeLabel?: string | number }) => {
    if (!e || !e.activeLabel) return;
    const raw = String(e.activeLabel);
    if (periodType === 'YEAR') {
      const match = raw.match(/^(\d{4})/);
      const year = match ? Number(match[1]) : Number(raw);
      if (onYearChange && Number.isFinite(year)) onYearChange(year);
      return;
    }
    if (periodType === 'MONTH') {
      const m = raw.match(/^\d{4}-(0[1-9]|1[0-2])$/) || raw.match(/^(0[1-9]|1[0-2])$/);
      if (m) onSelectPeriod?.(m[1]);
      return;
    }
    if (periodType === 'QUARTER') {
      const m = raw.match(/^\d{4}-(Q[1-4])$/) || raw.match(/^(Q[1-4])$/);
      if (m) onSelectPeriod?.(m[1]);
      return;
    }
  };

  const lastPrefetchLabelRef = React.useRef<string | null>(null);
  const lastPrefetchTsRef = React.useRef<number>(0);
  const handleChartHover = (e: { activeLabel?: string | number }) => {
    if (!onPrefetchPeriod) return;
    if (!e || !e.activeLabel) return;
    const raw = String(e.activeLabel);
    let label = raw;
    if (periodType === 'MONTH') {
      const m = raw.match(/^\d{4}-(0[1-9]|1[0-2])$/) || raw.match(/^(0[1-9]|1[0-2])$/);
      if (m) label = m[1];
    } else if (periodType === 'QUARTER') {
      const m = raw.match(/^\d{4}-(Q[1-4])$/) || raw.match(/^(Q[1-4])$/);
      if (m) label = m[1];
    } else if (periodType === 'YEAR') {
      const match = raw.match(/^(\d{4})/);
      if (match) label = match[1];
    }
    const now = Date.now();
    if (label === lastPrefetchLabelRef.current && now - lastPrefetchTsRef.current < 400) return;
    lastPrefetchLabelRef.current = label;
    lastPrefetchTsRef.current = now;
    onPrefetchPeriod(label);
  };

  const incomeExpenseChartLink = useMemo(
    () =>
      entityCui
        ? buildEntityIncomeExpenseChartLink(entityCui, entityName, normalizationOptions)
        : null,
    [entityCui, entityName, normalizationOptions],
  );

  // Avoid restarting animations when data hasn't changed
  const dataSignature = useMemo(() => {
    const parts = (mergedData || []).map(d => `${d.label}|${d.income}|${d.expense}|${d.balance}`)
    return parts.join(';')
  }, [mergedData])
  const prevSignatureRef = useRef<string | null>(null)
  const shouldAnimate = prevSignatureRef.current !== dataSignature
  useEffect(() => {
    prevSignatureRef.current = dataSignature
  }, [dataSignature])

  const labelIndices = useMemo(
    () => selectLabelIndices(mergedData, currentYear),
    [mergedData, currentYear],
  )

  const makeSelectiveLabelContent = useCallback(
    (
      baseAngle: number,
      baseOffset: number,
      showUnit: boolean,
    ) => {
      return function SelectiveLabel(props: { x?: number | string; y?: number | string; index?: number; value?: number | string; [key: string]: unknown }) {
        const x = Number(props.x ?? 0)
        const y = Number(props.y ?? 0)
        const index = Number(props.index ?? 0)
        const value = props.value ?? 0

        if (!showUnit && !labelIndices.has(index)) return null

        const text = showUnit
          ? yValueFormatter(Number(value), unit, 'compact')
          : formatNumber(Number(value), 'compact')
        const transform = baseAngle
          ? `rotate(${baseAngle}, ${x}, ${y - baseOffset})`
          : undefined

        return (
          <text
            x={x}
            y={y - baseOffset}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
            className="text-foreground"
            transform={transform}
          >
            {text}
          </text>
        )
      }
    },
    [labelIndices, unit],
  )

  if (isLoading) {
    return <EntityFinancialTrendsSkeleton />;
  }

  return (
    <Card className="rounded-[28px] border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full">
          <CardTitle className="flex items-center gap-2">
            <span><Trans>Financial Trends</Trans></span>
            {showChartEditorLink && incomeExpenseChartLink ? (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1" aria-label={t`Open in chart editor`}>
                <Link to={incomeExpenseChartLink.to} params={incomeExpenseChartLink.params as unknown as { chartId: string }} search={incomeExpenseChartLink.search as unknown as Record<string, string>} preload="intent">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </CardTitle>
          {showControls ? (
            <div className="flex items-center gap-3">
              <Checkbox
                id="entity-growth-toggle"
                checked={showPeriodGrowth}
                onCheckedChange={(checked) => {
                  onNormalizationChange?.({
                    ...normalizationOptions,
                    show_period_growth: Boolean(checked),
                  })
                }}
              />
              <Label htmlFor="entity-growth-toggle" className="text-xs text-muted-foreground cursor-pointer">
                <Trans>Show growth (%)</Trans>
              </Label>

              <NormalizationModeSelect
                value={normalized.normalization as 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro'}
                allowPerCapita={allowPerCapita}
                onChange={(nextNormalization) => {
                  onNormalizationChange?.({
                    ...normalizationOptions,
                    normalization: nextNormalization,
                    inflation_adjusted: nextNormalization === 'percent_gdp' ? false : normalizationOptions.inflation_adjusted,
                  })
                }}
                triggerClassName="h-8 text-xs"
                className="w-[180px]"
              />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!trendsAvailable ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4"><Trans>No data available to display financial evolution.</Trans></p>
        ) : (
          <SafeResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={mergedData}
              margin={isMobile
                ? { top: 30, right: 8, left: 0, bottom: 5 }
                : { top: 30, right: 40, left: 4, bottom: 5 }
              }
              onClick={handleChartClick}
              onMouseMove={handleChartHover}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={<MultiLineYAxisTick unit={unit} mirror={isMobile} />}
                tickLine={false}
                axisLine={false}
                mirror={isMobile}
                width={isMobile ? 0 : yAxisWidth}
              />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="2 4" />

              {periodType === 'YEAR' && (
                <ReferenceLine x={String(currentYear)} stroke="gray" strokeDasharray="6 3" strokeWidth={1} />
              )}
              {periodType === 'QUARTER' && selectedQuarter && (
                <ReferenceLine x={`${currentYear}-${selectedQuarter}`} stroke="gray" strokeDasharray="6 3" strokeWidth={1} />
              )}
              {periodType === 'MONTH' && selectedMonth && (
                <ReferenceLine x={`${currentYear}-${selectedMonth}`} stroke="gray" strokeDasharray="6 3" strokeWidth={1} />
              )}

              <Bar
                dataKey="income"
                name={t`Income`}
                fill="#10b981"
                fillOpacity={0.2}
                stroke="#0f766e"
                strokeWidth={2}
                radius={[3, 3, 0, 0]}
                isAnimationActive={shouldAnimate}
                animationEasing='ease-in-out'
                animationBegin={shouldAnimate ? 300 : 0}
              >
                {!isMobile && <LabelList dataKey="income" content={makeSelectiveLabelContent(periodType === 'QUARTER' ? 0 : -45, 24, false) as unknown as React.ReactElement} />}
              </Bar>
              <Bar
                dataKey="expense"
                name={t`Expenses`}
                fill="#f43f5e"
                fillOpacity={0.2}
                stroke="#be123c"
                strokeWidth={2}
                radius={[3, 3, 0, 0]}
                isAnimationActive={shouldAnimate}
                animationEasing='ease-in-out'
                animationBegin={shouldAnimate ? 300 : 0}
              >
                {!isMobile && <LabelList dataKey="expense" content={makeSelectiveLabelContent(periodType === 'QUARTER' ? 0 : -45, 24, true) as unknown as React.ReactElement} />}
              </Bar>

              <Line
                type="monotone"
                dataKey="balance"
                name={t`Balance`}
                stroke="#6366f1"
                isAnimationActive={shouldAnimate}
                animationBegin={shouldAnimate ? 900 : 0}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#f8fafc' }}
                activeDot={{ r: 6 }}
              >
                {!isMobile && <LabelList dataKey="balance" content={makeSelectiveLabelContent(0, 12, false) as unknown as React.ReactElement} />}
              </Line>
            </ComposedChart>
          </SafeResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

function areSeriesEqual(a?: AnalyticsSeries | null, b?: AnalyticsSeries | null): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  const ad = a.data || []
  const bd = b.data || []
  if (ad.length !== bd.length) return false
  for (let i = 0; i < ad.length; i++) {
      const ap = ad[i] as { x: string | number; y: number | null }
      const bp = bd[i] as { x: string | number; y: number | null }
    if (String(ap.x) !== String(bp.x) || Number(ap.y) !== Number(bp.y)) return false
  }
  return true
}

function arePropsEqual(prev: EntityFinancialTrendsProps, next: EntityFinancialTrendsProps): boolean {
  return (
    areSeriesEqual(prev.incomeTrend, next.incomeTrend) &&
    areSeriesEqual(prev.expenseTrend, next.expenseTrend) &&
    areSeriesEqual(prev.balanceTrend, next.balanceTrend) &&
    prev.currentYear === next.currentYear &&
    prev.entityCui === next.entityCui &&
    prev.entityName === next.entityName &&
    prev.normalizationOptions.normalization === next.normalizationOptions.normalization &&
    prev.normalizationOptions.currency === next.normalizationOptions.currency &&
    prev.normalizationOptions.inflation_adjusted === next.normalizationOptions.inflation_adjusted &&
    prev.normalizationOptions.show_period_growth === next.normalizationOptions.show_period_growth &&
    (prev.periodType ?? 'YEAR') === (next.periodType ?? 'YEAR') &&
    prev.selectedQuarter === next.selectedQuarter &&
    prev.selectedMonth === next.selectedMonth &&
    prev.showControls === next.showControls &&
    prev.showChartEditorLink === next.showChartEditorLink &&
    !!prev.isLoading === !!next.isLoading
  )
}

export const EntityFinancialTrends = React.memo(EntityFinancialTrendsComponent, arePropsEqual);
