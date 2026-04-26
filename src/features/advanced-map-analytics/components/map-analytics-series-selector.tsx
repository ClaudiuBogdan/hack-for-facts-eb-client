import { useMemo } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import {
  applySetActiveSeries,
  resolveSeriesDisplayLabel,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type {
  AdvancedMapAnalyticsUrlState,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import { t } from '@lingui/core/macro';

interface MapAnalyticsSeriesSelectorProps {
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previous: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
  className?: string;
  readOnly?: boolean;
  /**
   * Optional secondary line shown under the active series label (e.g. unit
   * or context like "RON · 3.182 UATs"). When omitted the selector renders
   * a single-line layout.
   */
  secondaryLabel?: string;
}

/**
 * Public-grade selector that surfaces the currently active series and lets
 * the viewer switch the active series via a dropdown when more than one
 * series is enabled. Renders as a full-width card-button so it can sit
 * comfortably inside the sidebar's "Active series" section.
 */
export function MapAnalyticsSeriesSelector({
  mapState,
  setMapState,
  className,
  readOnly = false,
  secondaryLabel,
}: Readonly<MapAnalyticsSeriesSelectorProps>) {
  const enabledSeries = useMemo<MapSupportedSeries[]>(
    () => mapState.series.filter((series) => series.enabled),
    [mapState.series]
  );

  const activeSeries = useMemo<MapSupportedSeries | undefined>(() => {
    if (mapState.activeSeriesId) {
      const matchedSeries = enabledSeries.find(
        (series) => series.id === mapState.activeSeriesId
      );
      if (matchedSeries) {
        return matchedSeries;
      }
    }
    return enabledSeries[0];
  }, [enabledSeries, mapState.activeSeriesId]);

  if (!activeSeries) {
    return (
      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-2xl bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground',
          className
        )}
        data-testid="map-analytics-series-selector-empty"
      >
        <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t`No active series`}</span>
      </div>
    );
  }

  const activeLabel = resolveSeriesDisplayLabel(activeSeries);
  const activeColor = activeSeries.config.color;
  const hasMultipleSeries = enabledSeries.length > 1;
  const isInteractive = hasMultipleSeries && !readOnly;
  const eyebrow = hasMultipleSeries
    ? t`${enabledSeries.length} available · click to switch`
    : t`Active series`;

  const cardContent = (
    <span
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl bg-muted/40 px-3.5 py-2.5 text-left transition-colors',
        isInteractive && 'cursor-pointer hover:bg-muted/70',
        !isInteractive && 'cursor-default'
      )}
    >
      <span
        className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: activeColor }}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </span>
        <span
          className="truncate text-sm font-semibold leading-tight text-foreground"
          title={activeLabel}
        >
          {activeLabel}
        </span>
        {secondaryLabel ? (
          <span className="truncate text-xs text-muted-foreground" title={secondaryLabel}>
            {secondaryLabel}
          </span>
        ) : null}
      </span>
      {isInteractive ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </span>
  );

  if (!isInteractive) {
    return (
      <div
        className={cn('w-full', className)}
        data-testid="map-analytics-series-selector"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className
          )}
          aria-label={t`Switch active series`}
          data-testid="map-analytics-series-selector"
        >
          {cardContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[280px] rounded-2xl">
        <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t`Active series`}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {enabledSeries.map((series) => {
          const isActive = series.id === activeSeries.id;
          const label = resolveSeriesDisplayLabel(series);
          return (
            <DropdownMenuItem
              key={series.id}
              onSelect={() => {
                if (isActive) return;
                setMapState((previous) => applySetActiveSeries(previous, series.id));
              }}
              className="flex items-center gap-2"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: series.config.color }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate" title={label}>
                {label}
              </span>
              {isActive ? (
                <Check className="h-4 w-4 text-foreground" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
