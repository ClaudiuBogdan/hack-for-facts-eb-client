import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Section text that arrives as you reach it.
 *
 * Modelled on mega.dev, measured rather than guessed: `Element.animate` there
 * runs `opacity: [0, 1]` over 550–700ms on `cubic-bezier(0.23, 1, 0.32, 1)`,
 * from a hidden state that also carries a 10–18px rise, staggered 60–80ms
 * between siblings. One trigger per element — the inline style is gone once it
 * has run — and under `prefers-reduced-motion: reduce` their page issues zero
 * animate calls at all. The numbers below are theirs, rounded to one value each.
 *
 * Two deliberate departures:
 *
 * 1. **The hidden state never reaches the server.** mega.dev ships
 *    `style="opacity:0"` in its HTML — 114 elements of it — so a reader whose
 *    JavaScript fails or is blocked gets a blank page where the argument should
 *    be. On a public-money site the text *is* the product, so here the server
 *    renders it plainly visible and the hidden state is applied by the observer,
 *    client-side, only to what is off screen at the time. No JavaScript means no
 *    animation and all of the words, which is the correct way round.
 *
 * 2. **CSS transitions, not a library.** The whole effect is opacity and a
 *    translate, both compositor properties. `motion` is a dependency but nothing
 *    on this route loads it, and pulling it in to interpolate two values the
 *    compositor already interpolates would buy nothing. Measured, not assumed —
 *    see docs/design/landing-reveal.md.
 */

/**
 * Marks a block that should arrive. Inert until the observer arms it.
 *
 * The element must not be `display: inline`. `translate`, like `transform`, has
 * no effect on a non-replaced inline box, so an inline block still fades but
 * never rises — silently, and only that one element, which reads as a bug in the
 * stagger rather than a missing utility class. `MonoLabel` renders a bare
 * `span`, so the two eyebrow labels carry `block` for exactly this reason.
 */
export const REVEAL_ATTR = 'data-reveal'

/** Marks the ancestor whose entry reveals every block inside it, together. */
export const REVEAL_GROUP_ATTR = 'data-reveal-group'

const DURATION_MS = 600
const STAGGER_MS = 70

/**
 * The longest the whole stagger may run, however many blocks a group holds.
 *
 * Four blocks at 70ms is 210ms and the group has finished arriving in 810ms.
 * Twenty blocks at a flat 70ms would run to 1930ms, which stops reading as one
 * group arriving and starts reading as a queue. Four blocks is today's maximum,
 * so this changes nothing now and is here for whoever marks up a list.
 */
const STAGGER_WINDOW_MS = 280
const RISE_PX = 12
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

/**
 * The trigger line sits exactly on the viewport edge, so that "visible" and
 * "revealed" are the same question and there is no band between them.
 *
 * This was `0px 0px -12% 0px`, to hold the start back until a group was properly
 * on screen. That margin shrinks the observer's viewport, and `isIntersecting`
 * is reported against the shrunk one — so a group in the bottom 12% was both
 * plainly visible and formally "not intersecting", and stayed hidden with no
 * further callback to correct it. Parked there it never arrived: 42px of the
 * first statement band at y=100, 13px of the second at y=2200. Pulling the line
 * back to the edge removes the band rather than papering over it.
 *
 * The original worry — that a 600ms arrival starting at the edge would be over
 * before it could be read — does not survive arithmetic. At a normal 1000px/s
 * scroll the block travels some 700px during those 600ms, so it finishes near
 * the middle of the screen. Measured against the reference, mega.dev starts its
 * own reveals about as early, and many of its blocks animate while still below
 * the fold because their group has already triggered.
 */
const ROOT_MARGIN = '0px'

const CSS = `
[${REVEAL_ATTR}='pending'] {
  opacity: 0;
  translate: 0 ${RISE_PX}px;
}

[${REVEAL_ATTR}='shown'] {
  opacity: 1;
  translate: none;
  /* The transition lives on the destination state, so applying 'pending' is an
     instant hide and only the arrival is animated. Nothing ever fades *out*.

     'translate' and not 'transform': the rise above sets the independent
     'translate' property, and a transition naming 'transform' would silently
     animate opacity alone. */
  transition:
    opacity ${DURATION_MS}ms ${EASE} var(--tpz-reveal-delay, 0ms),
    translate ${DURATION_MS}ms ${EASE} var(--tpz-reveal-delay, 0ms);
}

/* The arrival is a flourish; the text is the point. Reduced motion keeps the
   text and drops the flourish — and the hook never arms, so nothing is hidden
   even for an instant. */
@media (prefers-reduced-motion: reduce) {
  [${REVEAL_ATTR}='pending'],
  [${REVEAL_ATTR}='shown'] {
    opacity: 1;
    translate: none;
    transition: none;
  }
}
`

/**
 * Injected as a plain style element rather than added to `src/index.css`, which
 * a prototype may not touch. Rendered on the server too, so the first paint
 * already has it.
 */
export function RevealStyles() {
  return <style>{CSS}</style>
}

/**
 * The blocks a group is responsible for — its own, not its descendants'.
 *
 * `querySelectorAll` reaches through nested groups, so without this filter an
 * outer group's arrival would mark an inner group's blocks `shown` (including
 * ones still below the fold) and hand them delays counted from the outer
 * group's sequence, only for the inner group's own off-screen entry to hide
 * them again. Nothing nests today; this makes "a group owns its blocks" true by
 * construction rather than by the current markup happening to be flat.
 */
function ownBlocks(group: Element) {
  return Array.from(group.querySelectorAll<HTMLElement>(`[${REVEAL_ATTR}]`)).filter(
    (block) => block.closest(`[${REVEAL_GROUP_ATTR}]`) === group,
  )
}

/** Reveals every block in a group, staggered in document order. */
function show(group: Element) {
  const blocks = ownBlocks(group)
  /*
   * The step shrinks so that a long group still finishes within one window.
   * At the current maximum of four blocks this is exactly STAGGER_MS and
   * changes nothing; the `min` is what guarantees the step can only ever get
   * smaller, so a short group never slows down to fill the window.
   */
  const step = blocks.length > 1 ? Math.min(STAGGER_MS, STAGGER_WINDOW_MS / (blocks.length - 1)) : 0
  blocks.forEach((block, index) => {
    block.style.setProperty('--tpz-reveal-delay', `${Math.round(index * step)}ms`)
    block.setAttribute(REVEAL_ATTR, 'shown')
  })
}

/**
 * Whether a group is far enough away that hiding it cannot be seen.
 *
 * Deliberately *not* `entry.isIntersecting`, even though with a zero root margin
 * the two now agree. The margin is a presentation decision and this is a
 * correctness one: nothing server-rendered may be hidden while it is on screen,
 * and that must not quietly depend on a constant somebody may want to tune. When
 * it did depend on it, a `-12%` bottom margin erased 70px of the figures strip
 * at 1440x760 about a second after first paint, and the statement band at
 * 1440x1000. A 900px-tall window falls between the two ranges where it bites,
 * which is exactly why the first round of checking missed it.
 *
 * `boundingClientRect` comes with the entry, so this costs no layout read, and
 * `rootBounds` would be wrong to use — it is the root rectangle, margin and all.
 */
function isOffScreen(entry: IntersectionObserverEntry, viewportHeight: number) {
  const rect = entry.boundingClientRect
  return rect.bottom <= 0 || rect.top >= viewportHeight
}

/**
 * Arms every group under `rootRef`. Takes the root the page already has rather
 * than handing back a second ref for the same element — the page declares what
 * travels together, the hook owns when.
 *
 * One observer for the whole landing rather than one per block: the callback is
 * the only per-scroll work, and it stops being called at all once the last
 * group has arrived.
 */
export function useRevealOnView(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        /*
         * `clientHeight` is the viewport the observer itself measures against,
         * less any horizontal scrollbar, so it is the right number. The fallback
         * is not decoration: a zero here would put every group above the fold by
         * this arithmetic and hide the entire page, which is the worst outcome
         * this file has, earned from the cheapest possible mistake.
         */
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight
        for (const entry of entries) {
          /*
           * Three cases, and the order matters.
           *
           * Past the trigger line: reveal it, and stop watching.
           *
           * On screen but short of the trigger line: reveal it too, without
           * waiting. It is either straddling the fold at load or was already
           * painted, so the one thing that must not happen is hiding it. Because
           * it was never 'pending', going straight to 'shown' leaves opacity at
           * 1 and translate at none — the computed values do not change, so
           * nothing animates and nothing flashes. It loses the arrival, which is
           * the correct thing to lose.
           *
           * Genuinely off screen: hide it, and let it arrive on the way down.
           */
          if (entry.isIntersecting || !isOffScreen(entry, viewportHeight)) {
            show(entry.target)
            observer.unobserve(entry.target)
            continue
          }
          ownBlocks(entry.target).forEach((block) =>
            block.setAttribute(REVEAL_ATTR, 'pending'),
          )
        }
      },
      { rootMargin: ROOT_MARGIN },
    )

    root.querySelectorAll(`[${REVEAL_GROUP_ATTR}]`).forEach((group) => observer.observe(group))
    return () => observer.disconnect()
  }, [rootRef])
}
