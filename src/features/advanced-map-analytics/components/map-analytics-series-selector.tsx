import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import {
  applySetActiveSeries,
  resolveSeriesDisplayLabel,
  SERIES_TYPE_ICONS,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-utils';
import { cn } from '@/lib/utils';
import type {
  AdvancedMapAnalyticsUrlState,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import { t } from '@lingui/core/macro';

const INITIAL_VISIBLE_COUNT = 5;

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
 * Public-grade selector that shows all enabled series as a clean vertical list.
 * Each row shows a type icon, the series label, and a checkmark when active.
 * Clicking any row sets it as the active series.
 * When there are more than 5 series a "Show more / Show less" toggle appears.
 */
export function MapAnalyticsSeriesSelector({
  mapState,
  setMapState,
  className,
  readOnly = false,
  secondaryLabel,
}: Readonly<MapAnalyticsSeriesSelectorProps>) {
  const [showAll, setShowAll] = useState(false);

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
          'flex w-full items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground',
          className
        )}
        data-testid="map-analytics-series-selector-empty"
      >
        <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t`No active series`}</span>
      </div>
    );
  }

  const hasMultipleSeries = enabledSeries.length > 1;
  const isInteractive = hasMultipleSeries && !readOnly;
  const initialVisibleSeries = enabledSeries.slice(0, INITIAL_VISIBLE_COUNT);
  const initialVisibleSeriesIncludesActive = initialVisibleSeries.some(
    (series) => series.id === activeSeries.id
  );
  const visibleSeries = showAll
    ? enabledSeries
    : initialVisibleSeriesIncludesActive
      ? initialVisibleSeries
      : [...initialVisibleSeries.slice(0, INITIAL_VISIBLE_COUNT - 1), activeSeries];
  const hasHidden = enabledSeries.length > INITIAL_VISIBLE_COUNT;

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)} role="radiogroup" aria-label={t`Data series`}>
      {visibleSeries.map((series) => {
        const isActive = series.id === activeSeries.id;
        const label = resolveSeriesDisplayLabel(series);
        const TypeIcon = SERIES_TYPE_ICONS[series.type];

        return (
          <button
            key={series.id}
            type="button"
            disabled={!isInteractive}
            onClick={() => {
              if (isActive) return;
              setMapState((previous) => applySetActiveSeries(previous, series.id));
            }}
            className={cn(
              'group flex w-full min-w-0 max-w-full items-start gap-2.5 overflow-hidden rounded-lg px-2.5 py-1.5 text-left transition-colors',
              isActive
                ? 'bg-primary/10'
                : 'hover:bg-muted/50',
              !isInteractive && 'cursor-default'
            )}
            role="radio"
            aria-checked={isActive}
            title={label}
            data-testid={isActive ? 'map-analytics-active-series' : undefined}
          >
            <TypeIcon
              className={cn(
                'h-4 w-4 shrink-0',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'min-w-0 flex-1 break-words text-sm leading-snug [overflow-wrap:anywhere]',
                isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {isActive ? (
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <span className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
          </button>
        );
      })}

      {hasHidden ? (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex w-fit items-center gap-1 rounded text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-expanded={showAll}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t`Show less`}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {t`Show ${enabledSeries.length - INITIAL_VISIBLE_COUNT} more`}
            </>
          )}
        </button>
      ) : null}

      {secondaryLabel && !hasMultipleSeries ? (
        <span className="mt-1 truncate text-[10px] text-muted-foreground" title={secondaryLabel}>
          {secondaryLabel}
        </span>
      ) : null}
    </div>
  );
}
