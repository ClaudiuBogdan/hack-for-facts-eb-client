import { useId } from 'react'
import { formatValue } from './home-refs.national-facts'

/**
 * Figures that count up to themselves, each digit smeared by its own speed.
 *
 * The blur is not a property of the number, it is a property of each digit.
 * A counter running to 1.916 turns its units column over about five thousand
 * times a second at the start and its thousands column five times — so the tail
 * of the figure is a streak while the leading digit is already legible, which is
 * how an odometer looks and is the whole reason it reads as speed rather than as
 * a number that happens to be out of focus. Blurring the figure as a whole, by
 * the value's overall velocity, smears the settled leading digits exactly as
 * hard as the spinning ones and looks like a lens problem.
 *
 * Each column's rate falls out of its place value: the digit in the 10^p column
 * changes `|dV/dt| / 10^p` times a second. Nothing here is tuned per figure,
 * which is why it holds for numbers as differently shaped as `1.916` and
 * `19,04`.
 *
 * **A fast digit gets fainter, not heavier.** An earlier pass pushed the alpha
 * back up after blurring and merged a sharp copy underneath, trying to keep
 * every digit readable; it made the smear bold and muddy and harder to read
 * than a plain blur. That was solving a problem this design does not have —
 * legibility comes from the leading digits being sharp, not from the racing ones
 * being forced to stay readable. Spreading a glyph's ink over forty pixels
 * should lighten it, so the filter now does only that.
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
export const COUNT_ATTR = 'data-count'

/**
 * Long enough to be watched, short enough not to hold up the reader. Slightly
 * longer than the 600ms fade it starts with, so the figure is still settling as
 * the cell finishes arriving rather than finishing first and waiting.
 */
const DURATION_MS = 1100

/** Matches the scramble: 25 updates a second already blur together. */
const TICK_MS = 40

/** The isotropic fallback for the variant that keeps CSS `blur()`. */
const MAX_BLUR_PX = 4.5

/**
 * The band of digit speeds the smear spreads itself across, in turnovers per
 * second: below the first a column is drawn sharp, above the second it is as
 * smeared as it will get.
 *
 * Interpolated logarithmically between the two, because the columns of a single
 * figure differ by orders of magnitude and a linear ramp cannot describe that.
 * `1.916` starts with its units column turning over 5,200 times a second and
 * its thousands column five times; on a linear scale saturating anywhere useful
 * for the thousands puts the other three columns hard against the ceiling, and
 * three digits pinned at maximum are not proportional to anything — they are
 * just a blur. On a log scale the same figure opens at levels 5, 4, 2 and 0,
 * one per column, which is what makes it read as one number moving rather than
 * as a smudge with a digit in front of it.
 */
const SHARP_BELOW_PER_SECOND = 3
const SATURATED_ABOVE_PER_SECOND = 3000

/**
 * Never a literal zero in a paired `stdDeviation`.
 *
 * WebKit regressed on exactly that (bug 315522, since fixed): a pair containing
 * a zero component failed outright and the element rendered unfiltered. The
 * reporter's own workaround was a hair above zero, and it costs nothing to keep.
 */
const EPSILON = 0.0001

/**
 * The smear steps, sharp to fastest. Level 0 carries no filter at all.
 *
 * Quantised on purpose. A continuous sigma would mean mutating a filter graph
 * per digit per tick — twenty primitives rewritten twenty-five times a second —
 * whereas a fixed ladder is a handful of filters for the whole page and a digit
 * changing speed only repoints at another one, and only when it crosses a step.
 */
const SIGMAS: readonly number[] = [0, 0.6, 1.2, 1.9, 2.7, 3.6]

/** Shared id for the filter at a given step. */
const levelId = (level: number) => `tpz-smear-${level}`

type Job = {
  readonly element: HTMLElement
  readonly target: number
  readonly digits: number
  readonly start: number
  /** The per-character slots, in document order. Empty on the CSS-blur variant. */
  readonly slots: readonly HTMLElement[]
}

const running = new Set<Job>()
let frame = 0
let lastTick = 0

/**
 * Ease-out cubic. Fast at the start and settling at the end, which is the shape
 * a counter needs — the interesting part is the arrival, not the departure.
 */
function eased(progress: number) {
  return 1 - (1 - progress) ** 3
}

/** How fast the value itself is moving, in units per second. */
function unitsPerSecond(target: number, progress: number) {
  // d/dt of `target * (1 - (1 - t)^3)`, with t in seconds rather than progress.
  return (target * 3 * (1 - progress) ** 2) / (DURATION_MS / 1000)
}

/**
 * The 10^p column each character of a formatted figure sits in.
 *
 * Walks from the right so a separator can borrow the place of the digit to its
 * right — a thousands dot belongs with the hundreds beside it, and giving it a
 * column of its own would leave it sharp in the middle of a smeared run.
 */
function placesOf(text: string, decimals: number): readonly number[] {
  const places: number[] = []
  let seen = 0
  for (let i = text.length - 1; i >= 0; i -= 1) {
    places[i] = seen - decimals
    if (text[i] >= '0' && text[i] <= '9') seen += 1
  }
  return places
}

/** Which step of the ladder a column turning over this fast belongs on. */
function levelFor(turnoversPerSecond: number) {
  if (turnoversPerSecond <= SHARP_BELOW_PER_SECOND) return 0
  const span = Math.log10(SATURATED_ABOVE_PER_SECOND / SHARP_BELOW_PER_SECOND)
  const share = Math.log10(turnoversPerSecond / SHARP_BELOW_PER_SECOND) / span
  return Math.round(Math.min(1, share) * (SIGMAS.length - 1))
}

function paintSlots(job: Job, text: string, rate: number) {
  const places = placesOf(text, job.digits)
  const slots = job.slots
  // Right-aligned: the figure grows leftward, so character j from the right of
  // the current text belongs in slot j from the right, and the leading slots
  // stand empty until the number is long enough to need them.
  for (let j = 0; j < slots.length; j += 1) {
    const slot = slots[slots.length - 1 - j]
    const index = text.length - 1 - j
    const character = index >= 0 ? text[index] : ''
    if (slot.textContent !== character) slot.textContent = character

    const level =
      character === '' ? 0 : levelFor(rate / 10 ** Math.max(0, places[index]))
    if (slot.dataset.level !== String(level)) {
      slot.dataset.level = String(level)
      slot.style.filter = level === 0 ? '' : `url(#${levelId(level)})`
    }
  }
}

function tick(now: number) {
  frame = 0
  if (now - lastTick >= TICK_MS) {
    lastTick = now
    for (const job of running) {
      const progress = (now - job.start) / DURATION_MS
      // Waiting out the stagger. The real figure is already on screen and stays
      // there, so a queued cell reads as untouched rather than as a zero.
      if (progress < 0) continue
      if (progress >= 1) {
        settle(job)
        running.delete(job)
        continue
      }
      const text = formatValue(job.target * eased(progress), job.digits)
      if (job.slots.length > 0) {
        paintSlots(job, text, unitsPerSecond(job.target, progress))
      } else {
        // No slots: the variant that keeps CSS `blur()`, which has no
        // directional form and no way to differ per digit.
        job.element.textContent = text
        job.element.style.filter = `blur(${(MAX_BLUR_PX * (1 - progress) ** 2).toFixed(2)}px)`
      }
    }
  }
  if (running.size > 0) frame = requestAnimationFrame(tick)
}

/**
 * Puts a figure back the way it should end: true text, no filter, no pinned box.
 *
 * Filters are removed outright rather than left at a sigma of nothing. Filtered
 * text is rasterised through the filter graph, so leaving them attached would
 * cost the crispness of the final figure for the rest of the page's life, in
 * exchange for a blur too small to see.
 */
function settle(job: Job) {
  const text = formatValue(job.target, job.digits)
  if (job.slots.length > 0) {
    for (let j = 0; j < job.slots.length; j += 1) {
      const slot = job.slots[job.slots.length - 1 - j]
      const index = text.length - 1 - j
      slot.textContent = index >= 0 ? text[index] : ''
      slot.style.removeProperty('filter')
      delete slot.dataset.level
    }
  } else {
    job.element.textContent = text
  }
  job.element.style.removeProperty('filter')
  job.element.style.removeProperty('min-width')
  job.element.style.removeProperty('display')
  job.element.style.removeProperty('text-align')
}

/** Stops everything and leaves every figure reading true. */
export function stopCounting() {
  if (frame !== 0) cancelAnimationFrame(frame)
  frame = 0
  for (const job of running) settle(job)
  running.clear()
}

/**
 * Starts every figure inside `block` counting, `delay` milliseconds from now.
 *
 * The width is pinned first, measured while the element still holds the real
 * figure — which it does, because that is what the server rendered. `1.916` is
 * five characters and `0` is one, and `tabular-nums` only fixes the width of a
 * digit, not how many there are, so without this the unit beside it would walk
 * left and right for the whole second.
 */
export function countUpWithin(block: Element, delay: number) {
  if (typeof window === 'undefined') return
  // Checked here as well as by the caller, so the module is honest on its own
  // rather than inheriting a promise from whatever happens to trigger it.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const now = performance.now()
  for (const element of block.querySelectorAll<HTMLElement>(`[${COUNT_ATTR}]`)) {
    if (element.dataset.countDone === 'true') continue
    const target = Number(element.dataset.countValue)
    const digits = Number(element.dataset.countDigits)
    if (!Number.isFinite(target) || !Number.isFinite(digits)) continue

    element.dataset.countDone = 'true'
    element.style.minWidth = `${element.getBoundingClientRect().width}px`
    element.style.display = 'inline-block'
    // Anchored right, so the figure grows leftward into the cell and its last
    // digit stays welded to the unit beside it. Left-anchored, `1.916` reaches
    // its final width by pushing rightward, which reads as the layout settling
    // rather than as a number arriving.
    element.style.textAlign = 'right'

    running.add({
      element,
      target,
      digits,
      start: now + delay,
      slots: Array.from(element.querySelectorAll<HTMLElement>('[data-slot]')),
    })
  }
  if (running.size > 0 && frame === 0) frame = requestAnimationFrame(tick)
}

/**
 * The smear ladder, rendered once for the page.
 *
 * One filter per step rather than per figure: the steps are fixed, so twenty
 * digits across four cells share five filters, and a digit changing speed is a
 * style change rather than a filter-graph mutation.
 */
export function SmearFilters() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        {SIGMAS.map((sigma, index) =>
          index === 0 ? null : (
            <filter
              key={index}
              id={levelId(index)}
              /*
               * Well past the default `-10% … 120%`, which would clip a
               * horizontal smear at exactly the point it becomes visible — and
               * these are single characters, so the smear is wide relative to
               * the box it comes from. `sRGB` rather than the `linearRGB` these
               * primitives default to, which lightens dark text unevenly as it
               * blurs.
               */
              x="-300%"
              y="-25%"
              width="700%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              {/* Nothing but the blur. A digit moving too fast to read should
                  be faint and wide, which is what spreading its ink does on its
                  own; putting the alpha back afterwards made it bold and muddy
                  and harder to read than no effect at all. */}
              <feGaussianBlur in="SourceGraphic" stdDeviation={`${sigma} ${EPSILON}`} />
            </filter>
          ),
        )}
      </defs>
    </svg>
  )
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
  readonly value: number
  readonly digits: number
  /**
   * Smear each digit by its own rate of change, rather than the whole figure by
   * CSS `blur()`, which has no directional form and cannot differ per digit.
   */
  readonly smear?: boolean
}) {
  const text = formatValue(value, digits)
  const key = useId()
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" data-count="" data-count-value={value} data-count-digits={digits}>
        {/*
         * Split into slots on the server, holding the real figure, so the split
         * costs nothing at trigger time and a reader without JavaScript sees
         * exactly the same number — just spelled one span per character.
         */}
        {smear
          ? Array.from(text).map((character, index) => (
              <span data-slot="" key={`${key}-${index}`}>
                {character}
              </span>
            ))
          : text}
      </span>
    </>
  )
}
