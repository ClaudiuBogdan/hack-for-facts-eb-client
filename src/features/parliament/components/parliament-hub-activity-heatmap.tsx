import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParliamentSearch } from "@/schemas/parliament";
import { appendDayToHref } from "../lib/activity-heatmap-href";
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

/** How long a pointer must rest on a square before its tooltip opens. */
const TOOLTIP_OPEN_DELAY_MS = 100;
/** Time to cross the gap from a square to its tooltip without losing it. */
const TOOLTIP_CLOSE_DELAY_MS = 150;
/** Gap between a square and its tooltip, and the tooltip's margin to the viewport edge. */
const TOOLTIP_OFFSET_PX = 4;
const TOOLTIP_VIEWPORT_MARGIN_PX = 8;

const EMPTY_CELL_CLASS_NAME =
  "aspect-square border border-[#e5e5e0] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-map-empty)]";

/** One counted day. Days absent from the map are drawn as empty squares. */
export interface ActivityHeatmapDay {
  readonly total: number;
  /** Accessible name + native title, e.g. "20 martie 2026 — 42 voturi". */
  readonly label: string;
  /** Tooltip body; the caller owns the wording and the pluralisation. */
  readonly tooltip: ReactNode;
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
   * The `/parlament` search a counted square opens, with the day added as
   * `from`/`to`. OMIT to draw the days as static squares: a surface whose list
   * cannot be narrowed to one day must not offer a link that would silently
   * answer a wider question.
   */
  readonly daySearch?: ParliamentSearch;
  /**
   * Fired alongside a day's navigation. For the heatmap that sits UNDER a list,
   * the link changes results the reader has already scrolled past, so the
   * surface uses this to bring them back to what just changed.
   */
  readonly onSelectDay?: () => void;
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

const defaultUncapturedLabel = (isoDate: string): string =>
  `${isoDate} — nu am colectat această zi`;

type DaySquare =
  | { readonly kind: "counted"; readonly day: ActivityHeatmapDay }
  | { readonly kind: "uncaptured" | "covered-empty"; readonly label: string }
  | { readonly kind: "empty" };

/**
 * What a square says about itself: its accessible name, and what its tooltip
 * shows. THREE states for an empty day, not two. A day we never watched and a
 * day the chamber sat without dividing are different facts, and painting them
 * the same pixel is how a crawl gap becomes a claim that nothing happened.
 */
function describeDay({
  isoDate,
  days,
  isCovered,
  uncapturedLabel,
  coveredEmptyLabel,
}: {
  readonly isoDate: string;
  readonly days: ReadonlyMap<string, ActivityHeatmapDay>;
  readonly isCovered?: (isoDate: string) => boolean;
  readonly uncapturedLabel: (isoDate: string) => string;
  readonly coveredEmptyLabel?: (isoDate: string) => string;
}): DaySquare {
  const day = days.get(isoDate);
  if (day && day.total > 0) return { kind: "counted", day };
  if (isCovered !== undefined && !isCovered(isoDate)) {
    return { kind: "uncaptured", label: uncapturedLabel(isoDate) };
  }
  if (isCovered?.(isoDate) === true && coveredEmptyLabel !== undefined) {
    return { kind: "covered-empty", label: coveredEmptyLabel(isoDate) };
  }
  return { kind: "empty" };
}

/** The square under an event, if the event happened on one that has a tooltip. */
function dayCellOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-day]")
    : null;
}

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
 *
 * A year of squares is ~370 elements, so each one is plain: an `<a>` with a
 * precomputed address or a `<div>`, and ONE tooltip for the whole grid that
 * follows the pointer and the keyboard focus. A router `<Link>` and a Radix
 * tooltip per square cost about a second of a phone's main thread for the two
 * hub heatmaps.
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
  daySearch,
  onSelectDay,
  isCovered,
  uncapturedLabel = defaultUncapturedLabel,
  coveredEmptyLabel,
  coverageNote,
  cta,
}: Props) {
  const router = useRouter();
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

  /** The surface's address without a day, serialised once for every square. */
  const baseHref = useMemo(() => {
    if (daySearch === undefined) return undefined;
    const { from: _from, to: _to, ...search } = daySearch;
    const location = router.buildLocation({ to: "/parlament", search });
    return router.history.createHref(location.publicHref);
  }, [router, daySearch]);

  const describe = (isoDate: string): DaySquare =>
    describeDay({ isoDate, days, isCovered, uncapturedLabel, coveredEmptyLabel });

  // ── the one tooltip ─────────────────────────────────────────────────────
  const tooltipId = useId();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);
  const show = useCallback(
    (cell: HTMLElement) => {
      clearTimer();
      anchorRef.current?.removeAttribute("aria-describedby");
      anchorRef.current = cell;
      // What Radix did for the trigger it opened: the tooltip describes the
      // square that has the focus, so a screen reader reads both.
      cell.setAttribute("aria-describedby", tooltipId);
      setActiveDay(cell.dataset.day ?? null);
    },
    [clearTimer, tooltipId],
  );
  const hide = useCallback(() => {
    clearTimer();
    anchorRef.current?.removeAttribute("aria-describedby");
    anchorRef.current = null;
    setActiveDay(null);
  }, [clearTimer]);
  const scheduleHide = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(hide, TOOLTIP_CLOSE_DELAY_MS);
  }, [clearTimer, hide]);

  const onPointerOver = (event: PointerEvent<HTMLDivElement>) => {
    // As Radix did: a touch opens no tooltip, it follows the link.
    if (event.pointerType === "touch") return;
    const cell = dayCellOf(event.target);
    if (!cell || cell === anchorRef.current) {
      if (cell) clearTimer();
      return;
    }
    clearTimer();
    // Moving between squares swaps the tooltip at once; the first one waits.
    if (activeDay !== null) {
      show(cell);
      return;
    }
    timerRef.current = setTimeout(
      () => show(cell),
      TOOLTIP_OPEN_DELAY_MS,
    );
  };
  const onPointerOut = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    if (dayCellOf(event.relatedTarget) !== null) return;
    if (activeDay === null) clearTimer();
    else scheduleHide();
  };
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const cell = dayCellOf(event.target);
    if (cell) show(cell);
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (dayCellOf(event.relatedTarget) === null) hide();
  };
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const cell = dayCellOf(event.target);
    if (!(cell instanceof HTMLAnchorElement) || daySearch === undefined) return;
    hide();
    // What a router <Link> does: a plain left click navigates in the app, any
    // modified click is the browser's (a new tab, a download, a copy).
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      (cell.target !== "" && cell.target !== "_self")
    ) {
      return;
    }
    const isoDate = cell.dataset.day;
    if (!isoDate) return;
    event.preventDefault();
    onSelectDay?.();
    void router.navigate({
      to: "/parlament",
      search: { ...daySearch, from: isoDate, to: isoDate },
    });
  };

  // Escape, a scroll or a resize closes it, as they closed the Radix tooltip:
  // a tooltip left behind a moved square would describe the wrong day.
  const isOpen = activeDay !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    globalThis.addEventListener("keydown", onKeyDown);
    globalThis.addEventListener("scroll", hide, { capture: true, passive: true });
    globalThis.addEventListener("resize", hide);
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown);
      globalThis.removeEventListener("scroll", hide, { capture: true });
      globalThis.removeEventListener("resize", hide);
    };
  }, [isOpen, hide]);
  useEffect(() => clearTimer, [clearTimer]);

  // Placed above its square, centred, kept inside the viewport; below the
  // square when there is no room above. Fixed, so no card's overflow clips it.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const anchor = anchorRef.current;
    if (activeDay === null || !tooltip || !anchor) return;
    const cell = anchor.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = tooltip;
    const viewportWidth = document.documentElement.clientWidth;
    const left = Math.min(
      Math.max(cell.left + cell.width / 2 - width / 2, TOOLTIP_VIEWPORT_MARGIN_PX),
      Math.max(TOOLTIP_VIEWPORT_MARGIN_PX, viewportWidth - width - TOOLTIP_VIEWPORT_MARGIN_PX),
    );
    const above = cell.top - TOOLTIP_OFFSET_PX - height;
    const top =
      above >= TOOLTIP_VIEWPORT_MARGIN_PX
        ? above
        : cell.bottom + TOOLTIP_OFFSET_PX;
    tooltip.style.left = `${String(Math.round(left))}px`;
    tooltip.style.top = `${String(Math.round(top))}px`;
    tooltip.style.visibility = "visible";
  }, [activeDay]);

  const active = activeDay === null ? null : describe(activeDay);

  /**
   * One track per week, stretching to fill the card and never dropping below
   * `MIN_CELL_PX`. `aspect-square` on the cells turns that width into the row
   * height, so the squares stay square at every size.
   */
  const columns = {
    gridTemplateColumns: `repeat(${String(grid.weeks.length)}, minmax(${String(MIN_CELL_PX)}px, 1fr))`,
  };

  // The squares do not depend on the tooltip: a hover re-renders the tooltip,
  // never the ~370 elements of the grid.
  const cells = useMemo(
    () =>
      grid.weeks.flatMap((week) =>
        week.days.map((cell) => {
          if (!cell.inYear) {
            return <div key={cell.isoDate} className="aspect-square" />;
          }
          const square = describeDay({
            isoDate: cell.isoDate,
            days,
            isCovered,
            uncapturedLabel,
            coveredEmptyLabel,
          });
          switch (square.kind) {
            case "empty":
              return (
                <div key={cell.isoDate} className={EMPTY_CELL_CLASS_NAME} />
              );
            case "uncaptured":
            case "covered-empty":
              return (
                <div
                  key={cell.isoDate}
                  data-day={cell.isoDate}
                  role="img"
                  aria-label={square.label}
                  title={square.label}
                  className={
                    square.kind === "uncaptured"
                      ? "aspect-square border border-[#e5e5e0] dark:border-[var(--pnrr-border)]"
                      : EMPTY_CELL_CLASS_NAME
                  }
                  style={square.kind === "uncaptured" ? UNCAPTURED_FILL : undefined}
                />
              );
            case "counted": {
              const fill = {
                backgroundColor:
                  GOVUK_BLUE_RAMP[bucketOf(square.day.total) - 1],
              };
              return baseHref !== undefined ? (
                // A LINK, not a button: the square's whole job is to open that
                // day in the list, and a link can be opened in a new tab or
                // copied.
                <a
                  key={cell.isoDate}
                  data-day={cell.isoDate}
                  href={appendDayToHref(baseHref, cell.isoDate)}
                  aria-label={square.day.label}
                  title={square.day.label}
                  className="block aspect-square rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                  style={fill}
                />
              ) : (
                // Not navigable, but still readable: `role="img"` is what gets
                // the label announced on a bare div.
                <div
                  key={cell.isoDate}
                  data-day={cell.isoDate}
                  role="img"
                  aria-label={square.day.label}
                  title={square.day.label}
                  className="aspect-square"
                  style={fill}
                />
              );
            }
          }
        }),
      ),
    [grid, days, isCovered, uncapturedLabel, coveredEmptyLabel, bucketOf, baseHref],
  );

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
        <>
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
                which is the order `grid.weeks` already walks. The listeners
                serve every square: one tooltip, one navigation. */}
            <div
              className="mt-1 grid grid-flow-col grid-rows-7 gap-[3px]"
              style={columns}
              onPointerOver={onPointerOver}
              onPointerOut={onPointerOut}
              onFocus={onFocus}
              onBlur={onBlur}
              onClick={onClick}
            >
              {cells}
            </div>
          </div>

          {active !== null && active.kind !== "empty" ? (
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              onPointerEnter={clearTimer}
              onPointerLeave={scheduleHide}
              // Measured before it is shown: placed by the layout effect above.
              style={{ position: "fixed", left: 0, top: 0, visibility: "hidden" }}
              className="z-50 max-w-xs overflow-hidden rounded-none bg-[#0b0c0c] px-3 py-1.5 text-xs text-white"
            >
              {active.kind === "counted" ? active.day.tooltip : active.label}
            </div>
          ) : null}

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
        </>
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
