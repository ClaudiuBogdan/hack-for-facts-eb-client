import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { EntityFinancialSummarySkeleton } from './EntityFinancialSummarySkeleton';
import { t } from '@lingui/core/macro';
import type { NormalizationOptions } from '@/lib/normalization';
import { normalizeNormalizationOptions } from '@/lib/normalization';
import { Badge } from '@/components/ui/badge';

interface EntityFinancialSummaryCardProps {
  title: string;
  value: number | null | undefined;
  icon?: React.ElementType;
  periodLabel: string;
  color: string;
  format: 'currency' | 'percent';
  currency: 'RON' | 'EUR' | 'USD';
  isPerCapita?: boolean;
  trend?: EntityFinancialSummaryTrend;
  trendLabel?: string;
  density?: EntityFinancialSummaryDensity;
  metricKind: EntityFinancialSummaryMetricKind;
}

export type EntityFinancialSummaryTrend = {
  readonly currentValue: number | null | undefined;
  readonly previousValue: number | null | undefined;
}

export type EntityFinancialSummaryDensity = 'default' | 'compact-desktop';
export type EntityFinancialSummaryMetricKind = 'income' | 'expenses' | 'balance'

type TrendIndicator = {
  readonly direction: 'up' | 'down' | 'flat';
  readonly percentage: number | null;
}

function resolveTrendIndicator(
  trend: EntityFinancialSummaryTrend | undefined,
): TrendIndicator | null {
  if (!trend) return null;

  const currentValue = Number(trend.currentValue);
  const previousValue = Number(trend.previousValue);

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return null;
  }

  const difference = currentValue - previousValue;
  const direction =
    difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat';

  if (previousValue === 0) {
    return {
      direction,
      percentage: null,
    };
  }

  return {
    direction,
    percentage: Math.abs((difference / previousValue) * 100),
  };
}

function TrendBadge({
  trend,
  trendLabel,
  metricKind,
  className,
}: {
  readonly trend?: EntityFinancialSummaryTrend
  readonly trendLabel?: string
  readonly metricKind: EntityFinancialSummaryMetricKind
  readonly className?: string
}) {
  const indicator = resolveTrendIndicator(trend);

  if (!indicator || indicator.percentage === null) {
    return null;
  }

  const Icon =
    indicator.direction === 'up'
      ? ArrowUpRight
      : indicator.direction === 'down'
        ? ArrowDownRight
        : Minus;
  const usesPositiveTone =
    indicator.direction === 'flat'
      ? false
      : metricKind === 'expenses'
        ? indicator.direction === 'down'
        : indicator.direction === 'up'
  const badgeClassName =
    indicator.direction === 'flat'
      ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
      : usesPositiveTone
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
      : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300';
  const prefix =
    indicator.direction === 'up'
      ? '+'
      : indicator.direction === 'down'
        ? '-'
        : '';

  return (
    <Badge variant="outline" className={cn(badgeClassName, className)}>
      <Icon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      {prefix}
      {formatNumber(indicator.percentage, 'standard')}% {trendLabel ?? t`YoY`}
    </Badge>
  );
}

const formatDisplayValue = (
  value: number | null | undefined,
  notation: 'compact' | 'standard',
  format: 'currency' | 'percent',
  currency: 'RON' | 'EUR' | 'USD'
): string => {
  if (value === null || value === undefined) return 'N/A';
  if (format === 'percent') return `${formatNumber(value, notation)}%`;
  return formatCurrency(value, notation, currency);
};

const iconColorMap: Record<string, string> = {
  green: 'text-green-500 dark:text-green-400',
  red: 'text-red-500 dark:text-red-400',
  blue: 'text-blue-500 dark:text-blue-400',
};

function toCompactDesktopTitle(title: string): string {
  return title
    .replace(/^Total\s+/i, '')
    .replace(/^Totalul\s+/i, '')
    .trim()
}

function toCompactDesktopYear(periodLabel: string): string {
  const yearMatch = periodLabel.match(/\b(\d{4})\b/)
  return yearMatch?.[1] ?? periodLabel
}

function splitCompactCurrencyValue(
  displayValue: string,
  currency: 'RON' | 'EUR' | 'USD',
): { amountLabel: string; currencyLabel: string } | null {
  const compactCurrencyMatch = displayValue.match(
    new RegExp(`^(.*?)(?:\\s+)(${currency})$`),
  )

  if (!compactCurrencyMatch) {
    return null
  }

  return {
    amountLabel: compactCurrencyMatch[1]!,
    currencyLabel: compactCurrencyMatch[2]!,
  }
}

export const EntityFinancialSummaryCard: React.FC<EntityFinancialSummaryCardProps> = ({ title, value, icon: Icon, color, periodLabel, currency, format, isPerCapita = false, trend, trendLabel, density = 'default', metricKind }) => {
  const displayValueCompact = formatDisplayValue(value, 'compact', format, currency);
  const displayValueStandard = formatDisplayValue(value, 'standard', format, currency);
  const iconColor = iconColorMap[color] ?? 'text-slate-500 dark:text-slate-400';
  const isCompactDesktop = density === 'compact-desktop';
  const shouldShowPerCapitaSuffix = isPerCapita && Number.isFinite(value);
  const compactDesktopTitle = toCompactDesktopTitle(title);
  const compactDesktopYear = toCompactDesktopYear(periodLabel);
  const compactCurrencyValueParts =
    isCompactDesktop && format === 'currency'
      ? splitCompactCurrencyValue(displayValueCompact, currency)
      : null

  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center rounded-[28px] border-border/50 shadow-sm transition-shadow duration-200 hover:shadow-md',
        isCompactDesktop && 'items-stretch justify-start lg:h-full',
      )}
    >
      <CardHeader
        className={cn(
          'flex flex-row items-start justify-center gap-4 px-6 pt-6 pb-3',
          isCompactDesktop &&
            'relative justify-start gap-0 space-y-0 px-2 pt-2 pb-0 sm:px-3 sm:pt-3 lg:w-full lg:px-5 lg:pt-4',
        )}
      >
        {isCompactDesktop ? (
          <div className="w-full">
            <div className="flex flex-col items-start gap-0 text-left sm:gap-0.5 lg:flex-1">
              <CardTitle className="text-balance text-left text-[10px] font-medium leading-tight text-muted-foreground sm:text-sm">
                {compactDesktopTitle}
              </CardTitle>
              <p className="text-left text-[9px] font-medium tracking-wide text-muted-foreground/70 tabular-nums sm:text-xs">
                {compactDesktopYear}
              </p>
            </div>
          </div>
        ) : (
          <>
            <CardTitle
              className="text-balance text-center text-sm font-medium leading-snug text-slate-700 dark:text-slate-300"
            >
              {title} ({periodLabel})
            </CardTitle>
            {Icon && (
              <Icon
                className={`h-5 w-5 shrink-0 ${iconColor}`}
              />
            )}
          </>
        )}
      </CardHeader>
      <CardContent
        className={cn(
          'flex flex-col items-center justify-center px-6 pb-6',
          isCompactDesktop &&
            'items-stretch justify-between px-2 pt-1 pb-2 sm:px-3 sm:pt-2 sm:pb-3 lg:flex lg:w-full lg:flex-1 lg:flex-col lg:px-5 lg:pt-3 lg:pb-4',
        )}
      >
        <div className={cn(isCompactDesktop && 'flex w-full min-w-0 items-baseline lg:min-h-[3rem]')}>
          {compactCurrencyValueParts ? (
            <p
              className={cn(
                'text-center text-3xl font-bold leading-none text-foreground sm:text-3xl',
                'flex max-w-full flex-col items-center',
                isCompactDesktop &&
                  'min-w-0 w-full items-start text-left leading-tight tabular-nums text-base sm:text-2xl lg:text-2xl xl:text-[1.75rem]',
              )}
            >
              <span className="min-w-0">{compactCurrencyValueParts.amountLabel}</span>
              <span className={cn(
                'mt-1 whitespace-nowrap text-sm font-semibold text-muted-foreground',
                isCompactDesktop && 'mt-0.5 text-[10px] sm:mt-1 sm:text-sm',
              )}>
                {compactCurrencyValueParts.currencyLabel}{shouldShowPerCapitaSuffix ? '/capita' : ''}
              </span>
            </p>
          ) : (
            <p
              className={cn(
                'text-center text-3xl font-bold leading-none text-foreground sm:text-3xl',
                isCompactDesktop &&
                  'min-w-0 w-full text-left leading-tight tabular-nums text-base sm:text-2xl lg:text-2xl xl:text-[1.75rem]',
              )}
            >
              {displayValueCompact}
            </p>
          )}
        </div>
        {isCompactDesktop ? null : (
          <p className="mt-2 flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              {displayValueStandard}{shouldShowPerCapitaSuffix ? '/capita' : ''}
            </span>
          </p>
        )}
        <div
          className={cn(
            'mt-3 min-h-6',
            isCompactDesktop && 'mt-1.5 self-start min-h-[1.25rem] sm:mt-2.5 sm:min-h-[1.5rem]',
          )}
        >
          <TrendBadge
            trend={trend}
            trendLabel={trendLabel}
            metricKind={metricKind}
            className={isCompactDesktop ? 'text-[9px] px-1 py-0 sm:text-xs sm:px-2 sm:py-0.5' : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
};

interface EntityFinancialSummaryProps {
  totalIncome: number | null | undefined;
  totalExpenses: number | null | undefined;
  budgetBalance: number | null | undefined;
  periodLabel: string;
  isLoading?: boolean;
  normalizationOptions: NormalizationOptions;
  trends?: {
    readonly income?: EntityFinancialSummaryTrend;
    readonly expenses?: EntityFinancialSummaryTrend;
    readonly balance?: EntityFinancialSummaryTrend;
  };
  trendLabel?: string;
  density?: EntityFinancialSummaryDensity;
}

export const EntityFinancialSummary: React.FC<EntityFinancialSummaryProps> = (
  { totalIncome, totalExpenses, budgetBalance, periodLabel, isLoading, normalizationOptions, trends, trendLabel, density = 'default' }
) => {
  if (isLoading) {
    return <EntityFinancialSummarySkeleton />;
  }

  const normalized = normalizeNormalizationOptions(normalizationOptions)
  const format: 'currency' | 'percent' = normalized.normalization === 'percent_gdp' ? 'percent' : 'currency'
  const isPerCapita = normalized.normalization === 'per_capita'

  return (
    <section
      className={cn(
        'mb-8 grid grid-cols-1 gap-6 md:grid-cols-3',
        density === 'compact-desktop' && 'grid-cols-3 gap-1.5 sm:gap-3 lg:mb-5 lg:gap-4',
      )}
    >
      <EntityFinancialSummaryCard title={t`Total Income`} value={totalIncome} icon={TrendingUp} color="green" periodLabel={periodLabel} currency={normalized.currency} format={format} isPerCapita={isPerCapita} trend={trends?.income} trendLabel={trendLabel} density={density} metricKind="income" />
      <EntityFinancialSummaryCard title={t`Total Expenses`} value={totalExpenses} icon={TrendingDown} color="red" periodLabel={periodLabel} currency={normalized.currency} format={format} isPerCapita={isPerCapita} trend={trends?.expenses} trendLabel={trendLabel} density={density} metricKind="expenses" />
      <EntityFinancialSummaryCard title={t`Income - Expenses`} value={budgetBalance} icon={Scale} color="blue" periodLabel={periodLabel} currency={normalized.currency} format={format} isPerCapita={isPerCapita} trend={trends?.balance} trendLabel={trendLabel} density={density} metricKind="balance" />
    </section>
  );
}; 
