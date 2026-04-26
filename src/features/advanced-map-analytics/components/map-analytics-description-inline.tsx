import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MapDescriptionRenderer } from '@/components/maps/advanced-map-analytics/map-description-renderer';
import { cn } from '@/lib/utils';
import { t } from '@lingui/core/macro';

const COLLAPSED_THRESHOLD_LENGTH = 180;

interface MapAnalyticsDescriptionInlineProps {
  description: string;
  defaultExpanded?: boolean;
  className?: string;
  /**
   * Background color (Tailwind class) used by the fade overlay when the
   * description is collapsed. Should match the surface the description is
   * rendered on so the fade blends seamlessly. Defaults to `from-card`
   * which fits the public sidebar.
   */
  fadeFromClassName?: string;
  /**
   * Maximum height (Tailwind class) used for the expanded scrollable
   * container. Defaults to `max-h-[60vh]` which works well for both the
   * desktop sidebar and the mobile description block.
   */
  expandedMaxHeightClassName?: string;
}

/**
 * Inline expandable Markdown description for the public map view.
 * - When collapsed, the content is clipped to a small height with a fade
 *   so the rest of the layout doesn't get pushed down by long copy.
 * - When expanded, the content is contained inside a scrollable region so
 *   very long descriptions don't blow out the sidebar / page height.
 */
export function MapAnalyticsDescriptionInline({
  description,
  defaultExpanded = false,
  className,
  fadeFromClassName = 'from-card',
  expandedMaxHeightClassName = 'max-h-[60vh]',
}: Readonly<MapAnalyticsDescriptionInlineProps>) {
  const trimmedDescription = description.trim();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (trimmedDescription.length === 0) {
    return null;
  }

  const isCollapsible = trimmedDescription.length > COLLAPSED_THRESHOLD_LENGTH;
  const showCollapsed = isCollapsible && !isExpanded;

  return (
    <section
      className={cn('flex flex-col gap-2', className)}
      data-testid="map-analytics-public-description"
    >
      <div
        className={cn(
          'relative',
          showCollapsed && 'max-h-44 overflow-hidden',
          !showCollapsed && isCollapsible && [expandedMaxHeightClassName, 'overflow-y-auto']
        )}
      >
        <MapDescriptionRenderer description={trimmedDescription} />
        {showCollapsed ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t via-50% to-transparent',
              fadeFromClassName
            )}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {isCollapsible ? (
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1 rounded text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setIsExpanded((previous) => !previous)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t`Show less`}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {t`Read more`}
            </>
          )}
        </button>
      ) : null}
    </section>
  );
}
