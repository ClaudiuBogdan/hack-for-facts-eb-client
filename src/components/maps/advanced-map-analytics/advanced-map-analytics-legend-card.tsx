import { getHeatmapColor } from '@/components/maps/utils';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import { cn } from '@/lib/utils';

interface AdvancedMapAnalyticsLegendCardProps {
  min: number;
  max: number;
  unit?: string;
  title: string;
  startColor?: string;
  endColor?: string;
  /**
   * Visual treatment for the legend container.
   * - `floating` (default): rounded card with backdrop blur and shadow,
   *   suitable as a map overlay.
   * - `inline`: minimal container with subtle border and no shadow, for
   *   embedding inside a page section (e.g. the public sidebar).
   */
  variant?: 'floating' | 'inline';
}

/**
 * Continuous gradient legend card. When `startColor` and `endColor` are
 * omitted, falls back to the default heatmap palette.
 */
export function AdvancedMapAnalyticsLegendCard({
  min,
  max,
  unit,
  title,
  startColor,
  endColor,
  variant = 'floating',
}: Readonly<AdvancedMapAnalyticsLegendCardProps>) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  const gradient =
    startColor && endColor
      ? `linear-gradient(to right, ${startColor}, ${endColor})`
      : `linear-gradient(to right, ${Array.from({ length: 100 }, (_, index) =>
          getHeatmapColor(index / 99)
        ).join(', ')})`;

  const isFloating = variant === 'floating';

  return (
    <div
      className={cn(
        isFloating
          ? 'w-[280px] rounded-md border border-border bg-card/90 p-3 shadow-sm backdrop-blur-sm'
          : 'w-full overflow-hidden rounded-2xl bg-muted/30 p-3'
      )}
    >
      <h4
        className={cn(
          'mb-2 font-medium leading-snug break-words',
          isFloating
            ? 'text-xs'
            : 'truncate text-[10px] uppercase tracking-wide text-muted-foreground'
        )}
      >
        {title}
      </h4>
      <div
        className={cn('h-3 w-full', isFloating ? 'rounded-sm border border-border/50' : 'rounded-full')}
        style={{ background: gradient }}
      />
      <div className="mt-1.5 flex justify-between text-xs tabular-nums text-foreground">
        <span>{formatAdvancedMapAnalyticsSeriesValue(min, unit)}</span>
        <span>{formatAdvancedMapAnalyticsSeriesValue(max, unit)}</span>
      </div>
    </div>
  );
}
