import { Fragment } from 'react';
import { cn } from '@/lib/utils';

interface AdvancedMapAnalyticsDiscreteLegendEntry {
  groupId: string;
  label: string;
  color: string;
}

interface AdvancedMapAnalyticsDiscreteLegendProps {
  title: string;
  entries: AdvancedMapAnalyticsDiscreteLegendEntry[];
  /**
   * Visual treatment for the legend container.
   * - `floating` (default): rounded card with backdrop blur and shadow,
   *   suitable as a map overlay.
   * - `inline`: minimal container with subtle border and no shadow, for
   *   embedding inside a page section (e.g. the public sidebar).
   */
  variant?: 'floating' | 'inline';
}

function parseLegendLabel(label: string): {
  labelText: string;
  intervalText?: string;
} {
  const separator = ' — ';
  const separatorIndex = label.indexOf(separator);

  if (separatorIndex < 0) {
    return {
      labelText: label.trim(),
    };
  }

  const labelText = label.slice(0, separatorIndex).trim();
  const intervalText = label.slice(separatorIndex + separator.length).trim();

  return {
    labelText,
    intervalText: intervalText.length > 0 ? intervalText : undefined,
  };
}

export function AdvancedMapAnalyticsDiscreteLegend({
  title,
  entries,
  variant = 'floating',
}: Readonly<AdvancedMapAnalyticsDiscreteLegendProps>) {
  if (entries.length === 0) {
    return null;
  }

  const isFloating = variant === 'floating';

  return (
    <div
      className={cn(
        isFloating
          ? 'w-fit min-w-[260px] max-w-[calc(100vw-2.5rem)] rounded-md border border-border bg-card/90 p-3 shadow-sm backdrop-blur-sm'
          : 'w-full rounded-2xl bg-muted/30 p-3.5'
      )}
    >
      <h4
        className={cn(
          'mb-2 font-semibold',
          isFloating
            ? 'text-xs'
            : 'text-[11px] uppercase tracking-wide text-muted-foreground'
        )}
      >
        {title}
      </h4>
      <div className="overflow-x-auto">
        <div className="grid min-w-max grid-cols-[14px_auto_auto] items-center gap-x-2 gap-y-1.5">
          {entries.map((entry) => {
            const { labelText, intervalText } = parseLegendLabel(entry.label);
            return (
              <Fragment key={entry.groupId}>
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                <span className="text-xs text-foreground whitespace-nowrap">{labelText}</span>
                <span className="text-xs tabular-nums text-foreground whitespace-nowrap">{intervalText ?? ''}</span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
