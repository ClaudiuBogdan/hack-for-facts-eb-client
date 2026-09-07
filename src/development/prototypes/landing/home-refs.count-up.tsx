import { useId } from "react";
import { formatValue } from "./home-refs.national-facts";

/**
 * Figures that count up to themselves, blurring while they move fast.
 *
 * The blur is the point rather than decoration: it is tied to the *speed* of the
 * count, not to elapsed time, so the figure is smeared while the digits are
 * racing and razor sharp the instant it lands. A blur that simply fades out over
 * the same duration reads as an out-of-focus image coming good; one driven by
 * the derivative reads as something moving.
 *
 * The same two rules as everything else on this landing:
 *
 * 1. **The server renders the real figure**, twice — once for reading and once
 *    for looking at — and only the copy already hidden from assistive
 *    technology is ever rewritten. No JavaScript means the true number, not a
 *    zero. This matters more here than anywhere else on the page: a public-money
 *    figure that renders as `0` to a reader whose script failed is not a missing
 *    flourish, it is a wrong number.
 * 2. **Screen readers get the final figure and nothing else.** A `dd` read
 *    halfway through would announce "1.203 mld. lei", which is a number this
 *    country's statistics office never published.
 */

/** Marks the copy that may be rewritten. Only ever on an `aria-hidden` span. */
export const COUNT_ATTR = "data-count";

/**
 * Long enough to be watched, short enough not to hold up the reader. Slightly
 * longer than the 600ms fade it starts with, so the figure is still settling as
 * the cell finishes arriving rather than finishing first and waiting.
 */
const DURATION_MS = 1100;

/** Matches the scramble: 25 updates a second already blur together. */
const TICK_MS = 40;

/**
 * Horizontal smear at full speed, as a Gaussian sigma. Enough to streak the
 * digits, not enough to lose them.
 */
const MAX_SIGMA = 7;

/**
 * The isotropic fallback, in pixels, for the variant that keeps CSS `blur()`.
 *
 * Smaller than the directional sigma on purpose: a round blur spreads the same
 * energy over both axes, so matching numbers would leave the figure a fog.
 */
const MAX_BLUR_PX = 4.5;

/**
 * Never a literal zero in a paired `stdDeviation`.
 *
 * WebKit regressed on exactly that (bug 315522, since fixed): a pair containing
 * a zero component failed outright and the element rendered unfiltered. The
 * reporter's own workaround was a hair above zero, and it costs nothing to keep.
 */
const EPSILON = 0.0001;

type Job = {
  readonly element: HTMLElement;
  readonly target: number;
  readonly digits: number;
  readonly start: number;
  /** The blur primitive belonging to this figure, or null if it is missing. */
  readonly blur: SVGFEGaussianBlurElement | null;
};

const running = new Set<Job>();
let frame = 0;
let lastTick = 0;

/**
 * Ease-out cubic. Fast at the start and settling at the end, which is the shape
 * a counter needs — the interesting part is the arrival, not the departure.
 */
function eased(progress: number) {
  return 1 - (1 - progress) ** 3;
}

/**
 * How fast the count is moving, normalised to 1 at the start and 0 at the end.
 *
 * The derivative of the easing above is `3(1 - t)^2`; dropping the constant
 * leaves a value that is already 0 to 1, which is exactly what the blur wants.
 */
function speed(progress: number) {
  return (1 - progress) ** 2;
}

function tick(now: number) {
  frame = 0;
  if (now - lastTick >= TICK_MS) {
    lastTick = now;
    for (const job of running) {
      const progress = (now - job.start) / DURATION_MS;
      // Waiting out the stagger. The real figure is already on screen and stays
      // there, so a queued cell reads as untouched rather than as a zero.
      if (progress < 0) continue;
      if (progress >= 1) {
        settle(job);
        running.delete(job);
        continue;
      }
      job.element.textContent = formatValue(
        job.target * eased(progress),
        job.digits,
      );
      // Horizontal only: the figure grows leftward, so the smear runs along the
      // axis it is travelling. A round blur reads as an out-of-focus photograph;
      // this reads as something moving.
      if (job.blur) {
        job.blur.setStdDeviation(
          Math.max(EPSILON, MAX_SIGMA * speed(progress)),
          EPSILON,
        );
      } else {
        // No filter node: this figure is on the variant that keeps CSS `blur()`,
        // which has no directional form and so smears in every direction.
        job.element.style.filter = `blur(${(MAX_BLUR_PX * speed(progress)).toFixed(2)}px)`;
      }
    }
  }
  if (running.size > 0) frame = requestAnimationFrame(tick);
}

/**
 * Starts every figure inside `block` counting, `delay` milliseconds from now.
 *
 * The width is pinned first, measured while the element still holds the real
 * figure — which it does, because that is what the server rendered. `1.916` is
 * five characters and `0` is one, and `tabular-nums` only fixes the width of a
 * digit, not how many there are, so without this the unit beside it would walk
 * left and right for the whole second. Safe to pin here in a way it was not for
 * the scramble: this is a single line with no `overflow` set, and inside a flex
 * row the span is blockified anyway, so nothing moves off its baseline.
 */
export function countUpWithin(block: Element, delay: number) {
  if (typeof window === "undefined") return;
  // Checked here as well as by the caller, so the module is honest on its own
  // rather than inheriting a promise from whatever happens to trigger it.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const now = performance.now();
  for (const element of block.querySelectorAll<HTMLElement>(
    `[${COUNT_ATTR}]`,
  )) {
    if (element.dataset.countDone === "true") continue;
    const target = Number(element.dataset.countValue);
    const digits = Number(element.dataset.countDigits);
    if (!Number.isFinite(target) || !Number.isFinite(digits)) continue;

    element.dataset.countDone = "true";
    element.style.minWidth = `${element.getBoundingClientRect().width}px`;
    element.style.display = "inline-block";
    // Anchored right, so the figure grows leftward into the cell and its last
    // digit stays welded to the unit beside it. Left-anchored, `1.916` reaches
    // its final width by pushing rightward, which reads as the layout settling
    // rather than as a number arriving.
    element.style.textAlign = "right";

    const filterId = element.dataset.countFilter;
    const blur = filterId
      ? document.querySelector<SVGFEGaussianBlurElement>(
          `#${filterId} feGaussianBlur`,
        )
      : null;
    if (blur) {
      blur.setStdDeviation(EPSILON, EPSILON);
      element.style.filter = `url(#${filterId})`;
    }
    running.add({ element, target, digits, start: now + delay, blur });
  }
  if (running.size > 0 && frame === 0) frame = requestAnimationFrame(tick);
}

/**
 * Puts a figure back the way it should end: true text, no filter, no pinned box.
 *
 * The filter is removed outright rather than left at a sigma of nothing.
 * Filtered text is rasterised through the filter graph, so leaving it attached
 * would cost the crispness of the final figure for the rest of the page's life,
 * in exchange for a blur too small to see.
 */
function settle(job: Job) {
  job.element.textContent = formatValue(job.target, job.digits);
  job.element.style.removeProperty("filter");
  job.element.style.removeProperty("min-width");
  job.element.style.removeProperty("display");
  job.element.style.removeProperty("text-align");
}

/** Stops everything and leaves every figure reading true. */
export function stopCounting() {
  if (frame !== 0) cancelAnimationFrame(frame);
  frame = 0;
  for (const job of running) settle(job);
  running.clear();
}

/**
 * A figure that can count up to itself: the real number twice, once for reading
 * and once for looking at.
 *
 * The target is carried in data attributes rather than parsed back out of the
 * rendered text, which would mean unpicking `ro-RO` separators to recover a
 * number this component was handed in the first place.
 */
export function CountUpValue({
  value,
  digits,
  smear = false,
}: {
  readonly value: number;
  readonly digits: number;
  /**
   * Directional smear along the axis the figure travels, rather than CSS
   * `blur()`, which has no directional form. Off keeps the round blur, so the
   * two can be compared side by side.
   */
  readonly smear?: boolean;
}) {
  const text = formatValue(value, digits);
  // `useId` is stable across server and client, which matters because the
  // filter is referenced by id from a style attribute. Colons are legal in an
  // id but awkward in a selector, and this element is found with one.
  const filterId = `tpz-smear-${useId().replace(/:/g, "")}`;
  return (
    <>
      <span className="sr-only">{text}</span>
      {/*
       * One filter per figure, because each carries its own sigma: the four
       * cells are staggered, so at any instant they are travelling at different
       * speeds and a shared filter would smear them all by the slowest.
       *
       * The region is widened well past the default `-10% … 120%`, which would
       * clip a horizontal smear at exactly the point it becomes visible. And
       * `sRGB` rather than the `linearRGB` these primitives default to, which
       * lightens dark text as it blurs and reads as the number greying out.
       */}
      {smear ? (
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <defs>
            <filter
              id={filterId}
              x="-60%"
              y="-25%"
              width="220%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.0001 0.0001" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <span
        aria-hidden="true"
        data-count=""
        data-count-value={value}
        data-count-digits={digits}
        data-count-filter={smear ? filterId : undefined}
      >
        {text}
      </span>
    </>
  );
}
