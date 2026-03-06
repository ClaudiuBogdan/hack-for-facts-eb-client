import React, { useMemo, useRef, useEffect } from 'react';
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
import { TrendingUp, ExternalLink } from 'lucide-react';
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
import { getNormalizationUnit } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { NormalizationModeSelect } from '@/components/normalization/normalization-mode-select';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';

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

  const handleChartClick = (e: any) => {
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
  const handleChartHover = (e: any) => {
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

  if (isLoading) {
    return <EntityFinancialTrendsSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            <span><Trans>Financial Trends</Trans></span>
            {showChartEditorLink && incomeExpenseChartLink ? (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1" aria-label={t`Open in chart editor`}>
                <Link to={incomeExpenseChartLink.to} params={incomeExpenseChartLink.params as any} search={incomeExpenseChartLink.search as any} preload="intent">
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
                value={normalized.normalization as any}
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
              margin={{ top: 30, right: 40, left: unit.length * 5 + 30, bottom: 5 }}
              onClick={handleChartClick}
              onMouseMove={handleChartHover}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(val) => yValueFormatter(val, unit)}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
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
                {!isMobile && <LabelList dataKey="income" position="top" angle={periodType === 'QUARTER' ? 0 : -45} offset={24} fontSize={11} formatter={(v: unknown) => yValueFormatter(Number(v), unit, 'compact')} />}
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
                {!isMobile && <LabelList dataKey="expense" position="top" angle={periodType === 'QUARTER' ? 0 : -45} offset={24} fontSize={11} formatter={(v: unknown) => yValueFormatter(Number(v), unit, 'compact')} />}
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
                {!isMobile && <LabelList dataKey="balance" position="top" offset={8} fontSize={11} formatter={(v: unknown) => yValueFormatter(Number(v), unit, 'compact')} />}
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
    const ap = ad[i] as any
    const bp = bd[i] as any
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
