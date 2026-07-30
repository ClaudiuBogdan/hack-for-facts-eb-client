import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ParliamentSearch } from "@/schemas/parliament";
import { buildWindowGrid, type RollingWindow } from "../lib/vote-activity-grid";

/**
 * GOV.UK blue ramp (#1d70b8) for buckets 1–4 — the same intensity scale the
 * member and stenograme heatmaps use, so a square means the same thing on
 * every parliamentary surface.
 */
const GOVUK_BLUE_RAMP = ["#d2e2f1", "#a3c6e3", "#5e94c9", "#1d70b8"] as const;

/**
 * Smallest a square may get. Below `sm` a year of them is wider than the card,
 * so the grid keeps this floor and the strip scrolls instead of shrinking into
 * a row of unclickable dots.
 */
const MIN_CELL_PX = 12;

/**
 * "We never watched this day." Deliberately NOT a lighter blue — it is not a
 * smaller amount of the thing being measured, it is the absence of a
 * measurement, so it reads as hatching rather than as a value on the ramp.
 */
const UNCAPTURED_FILL = {
  backgroundImage:
    "repeating-linear-gradient(45deg, #d8d8d4 0, #d8d8d4 1px, transparent 1px, transparent 4px)",
} as const;

/** One counted day. Days absent from the map are drawn as empty squares. */
export interface ActivityHeatmapDay {
  readonly total: number;
  /** Accessible name + native title, e.g. "20 martie 2026 — 42 voturi". */
  readonly label: string;
  /** Tooltip body; the caller owns the wording and the pluralisation. */
  readonly tooltip: ReactNode;
  /**
   * Search params the square links to on `/parlament`. OMIT to draw the day as
   * a static square: a surface whose list cannot be narrowed to one day must
   * not offer a link that would silently answer a wider question.
   */
  readonly search?: ParliamentSearch;
  /**
   * Fired alongside the navigation. For the heatmap that sits UNDER a list, the
   * link changes results the reader has already scrolled past, so the surface
   * uses this to bring them back to what just changed.
   */
  readonly onSelect?: () => void;
}

type Props = {
  /** Accessible name for the whole grid — it carries no visible heading. */
  readonly ariaLabel: string;
  readonly window: RollingWindow;
  readonly days: ReadonlyMap<string, ActivityHeatmapDay>;
  readonly status: "loading" | "error" | "ready";
  /** What went wrong, in the surface's own words. */
  readonly errorLead: ReactNode;
  /** The server's message, printed verbatim under the lead. */
  readonly errorDetail?: string;
  /** Shown when the window is genuinely empty — a counted zero, not a gap. */
  readonly emptyLabel: ReactNode;
  readonly bucketOf: (total: number) => 0 | 1 | 2 | 3 | 4;
  /**
   * Was this day inside what the crawl actually covers? OMIT on a surface with
   * no coverage record — the grid then keeps its old two-state reading rather
   * than inventing a third it cannot support.
   */
  readonly isCovered?: (isoDate: string) => boolean;
  /** Wording for an uncaptured square; the surface owns its own language. */
  readonly uncapturedLabel?: (isoDate: string) => string;
  /** Honest wording for an accounted zero (quiet day / no sitting). */
  readonly coveredEmptyLabel?: (isoDate: string) => string;
  /** The way into the full list. Always rendered, in every state. */
  readonly cta: ReactNode;
  /** Source scope and as-of provenance for the coverage verdicts. */
  readonly coverageNote?: ReactNode;
};

/**
 * A GitHub-style calendar heatmap over a rolling window, plus the link out —
 * the shared footer of the hub's cards.
 *
 * It carries NO heading. The card it closes is already titled, the month labels
 * say which months these are, and a second title inside a card is a fact said
 * twice; the accessible name lives on the section element instead.
 *
 * Every state ends with the CTA, including the failure — when the counts cannot
 * be drawn, the way into the list is the one thing that still works.
 */
export function ParliamentHubActivityHeatmap({
  ariaLabel,
  window,
  days,
  status,
  errorLead,
  errorDetail,
  emptyLabel,
  bucketOf,
  isCovered,
  uncapturedLabel = (iso) => `${iso} — nu am colectat această zi`,
  coveredEmptyLabel,
  coverageNote,
  cta,
}: Props) {
  const grid = useMemo(
    () => buildWindowGrid({ startIso: window.startIso, endIso: window.endIso }),
    [window],
  );

  // Open on the RECENT end. When the grid does fall back to scrolling, the left
  // edge is twelve months ago — the part of the window a hub reader is least
  // likely to have come for.
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasDays = days.size > 0;
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [hasDays]);

  /**
   * One track per week, stretching to fill the card and never dropping below
   * `MIN_CELL_PX`. `aspect-square` on the cells turns that width into the row
   * height, so the squares stay square at every size.
   */
  const columns = {
    gridTemplateColumns: `repeat(${String(grid.weeks.length)}, minmax(${String(MIN_CELL_PX)}px, 1fr))`,
  };

  return (
    <section aria-label={ariaLabel}>
      {status === "loading" ? (
        <Skeleton className="h-32 w-full rounded-none" />
      ) : status === "error" ? (
        // The aggregate is not served. Say that, and say it as a failure — an
        // empty grid here would read as "Parliament did nothing".
        <div
          role="status"
          className="border-2 border-[#b1b4b6] bg-[#f3f2f1] p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)]"
        >
          <p className="text-base leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {errorLead}
          </p>
          {errorDetail ? (
            <p className="mt-2 break-words text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {errorDetail}
            </p>
          ) : null}
        </div>
      ) : !hasDays && isCovered === undefined ? (
        // "Nothing happened" is only sayable when we know we were watching.
        // WITH coverage the grid still draws: a window that is half uncaptured
        // must show its hatching rather than collapse into a sentence claiming
        // the chambers never voted. Without coverage this stays exactly as it
        // was — the honest two-state reading.
        <p className="text-base leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {emptyLabel}
        </p>
      ) : (
        <TooltipProvider delayDuration={100}>
          <div ref={scrollRef} className="overflow-x-auto">
            {/* Month labels, each anchored to the column its month starts in. */}
            <div className="grid gap-[3px]" style={columns}>
              {grid.monthLabels.map((label) => (
                <span
                  key={`${String(label.columnIndex)}-${String(label.month)}`}
                  style={{ gridColumnStart: label.columnIndex + 1 }}
                  className="whitespace-nowrap text-[11px] leading-4 text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  {label.label}
                </span>
              ))}
            </div>

            {/* 7 rows, one column per week, filled top-to-bottom then across —
                which is the order `grid.weeks` already walks. */}
            <div
              className="mt-1 grid grid-flow-col grid-rows-7 gap-[3px]"
              style={columns}
            >
              {grid.weeks.flatMap((week) =>
                week.days.map((cell) => {
                  if (!cell.inYear) {
                    return <div key={cell.isoDate} className="aspect-square" />;
                  }

                  const day = days.get(cell.isoDate);
                  if (!day || day.total === 0) {
                    // THREE states, not two. A day we never watched and a day
                    // the chamber sat without dividing are different facts, and
                    // painting them the same pixel is how a crawl gap becomes a
                    // claim that nothing happened.
                    if (isCovered !== undefined && !isCovered(cell.isoDate)) {
                      const label = uncapturedLabel(cell.isoDate);
                      return (
                        <Tooltip key={cell.isoDate}>
                          <TooltipTrigger asChild>
                            <div
                              role="img"
                              aria-label={label}
                              title={label}
                              className="aspect-square border border-[#e5e5e0] dark:border-[var(--pnrr-border)]"
                              style={UNCAPTURED_FILL}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="rounded-none bg-[#0b0c0c] text-white">
                            {label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    if (
                      isCovered?.(cell.isoDate) === true &&
                      coveredEmptyLabel !== undefined
                    ) {
                      const label = coveredEmptyLabel(cell.isoDate);
                      return (
                        <Tooltip key={cell.isoDate}>
                          <TooltipTrigger asChild>
                            <div
                              role="img"
                              aria-label={label}
                              title={label}
                              className="aspect-square border border-[#e5e5e0] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-map-empty)]"
                            />
                          </TooltipTrigger>
                          <TooltipContent className="rounded-none bg-[#0b0c0c] text-white">
                            {label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return (
                      <div
                        key={cell.isoDate}
                        className="aspect-square border border-[#e5e5e0] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-map-empty)]"
                      />
                    );
                  }

                  const fill = {
                    backgroundColor: GOVUK_BLUE_RAMP[bucketOf(day.total) - 1],
                  };
                  return (
                    <Tooltip key={cell.isoDate}>
                      <TooltipTrigger asChild>
                        {day.search ? (
                          // A LINK, not a button: the square's whole job is to
                          // open that day in the list, and a link can be opened
                          // in a new tab or copied.
                          <Link
                            to="/parlament"
                            search={day.search}
                            onClick={day.onSelect}
                            aria-label={day.label}
                            title={day.label}
                            className="block aspect-square rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                            style={fill}
                          />
                        ) : (
                          // Not navigable, but still readable: `role="img"` is
                          // what gets the label announced on a bare div.
                          <div
                            role="img"
                            aria-label={day.label}
                            title={day.label}
                            className="aspect-square"
                            style={fill}
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent className="rounded-none bg-[#0b0c0c] text-white">
                        {day.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  );
                }),
              )}
            </div>
          </div>

          {/* Legend: Mai puține [5 squares] Mai multe. */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <span>
              <Trans>Mai puține</Trans>
            </span>
            <span className="inline-block h-3 w-3 border border-[#e5e5e0] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-map-empty)]" />
            {GOVUK_BLUE_RAMP.map((color) => (
              <span
                key={color}
                className="inline-block h-3 w-3"
                style={{ backgroundColor: color }}
              />
            ))}
            <span>
              <Trans>Mai multe</Trans>
            </span>
          </div>
        </TooltipProvider>
      )}

      {coverageNote ? (
        <div className="mt-3 text-xs leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {coverageNote}
        </div>
      ) : null}

      {cta}
    </section>
  );
}
