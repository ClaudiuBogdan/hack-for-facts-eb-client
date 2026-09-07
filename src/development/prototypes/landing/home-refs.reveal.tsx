import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Section text and cells that arrive as you reach them.
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

const DURATION_MS = 600
const STAGGER_MS = 70

/** A short beat once a block has earned its entrance, so it does not snap in. */
const ENTRANCE_DELAY_MS = 80

/**
 * How far into the viewport a block comes before it starts arriving.
 *
 * A block that begins the moment its first pixel clears the bottom edge does
 * most of its arriving at the very edge of the screen, which reads as the
 * scroll dragging it in rather than as an entrance.
 *
 * This is the same shape as the `-12%` root margin that erased text earlier, and
 * it is only safe here because of `safety` below. The failure then was not the
 * margin itself but that it was the *only* thing that could reveal a block: a
 * block sitting in the offset band is on screen, hidden, and the observer will
 * not speak again until it crosses the line, so a reader parked there waited
 * forever. Nothing bounded it.
 */
const TRIGGER_OFFSET_PX = 140

/**
 * The longest a block may be visible and still hidden.
 *
 * This is what makes the offset above safe rather than a repeat of the bug. A
 * second observer watches the real viewport edge and starts this clock the
 * moment a block is genuinely visible; if the reader stops scrolling inside the
 * offset band, the block arrives anyway. The offset shapes the entrance during
 * a scroll, and this guarantees it always ends.
 */
const SAFETY_MS = 700

/**
 * The longest a single arrival may run, however many blocks land together.
 *
 * Four at 70ms is 210ms and the whole thing is over in 810ms. A lattice section
 * can put eight cells on screen at once on a wide viewport, and eight at a flat
 * 70ms runs to 1090ms, which stops reading as a row arriving and starts reading
 * as a queue.
 */
const STAGGER_WINDOW_MS = 280
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

const CSS = `
[${REVEAL_ATTR}='pending'] {
  opacity: 0;
  translate: 0 12px;
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
 * Tells one block to arrive, `delay` milliseconds into the batch it landed in.
 *
 * A block that was never hidden is unaffected by the delay: its computed opacity
 * and translate do not change, so no transition starts and there is nothing for
 * a delay to postpone.
 */
function show(block: HTMLElement, delay: number) {
  block.style.setProperty('--tpz-reveal-delay', `${Math.round(delay)}ms`)
  block.setAttribute(REVEAL_ATTR, 'shown')
}

/**
 * Whether a block is far enough away that hiding it cannot be seen.
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
 * Arms every block under `rootRef`.
 *
 * Blocks are watched one by one rather than in declared groups, which is what
 * this did first. A group fired everything the moment its *top* edge appeared,
 * and a lattice section is tall — an image and four stacked cells — so its lower
 * cells arrived several hundred pixels below the fold and were long since
 * settled by the time anyone saw them. Watching each block puts every arrival on
 * screen, and blocks that appear together still travel together because the
 * stagger is applied per batch, in document order.
 *
 * One observer for the whole landing, and each block is dropped from it as it
 * lands, so the callback stops being called at all once the last one has.
 */
export function useRevealOnView(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /** Blocks visible but not yet arrived, and the clock that will bring them. */
    const waiting = new Map<Element, ReturnType<typeof setTimeout>>()

    /** Brings a batch in together, staggered in document order. */
    function arrive(blocks: Element[]) {
      if (blocks.length === 0) return
      // Document order, so a row staggers left to right and a column top to
      // bottom, rather than in whatever order the observer reported them.
      blocks.sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
      // The step can only ever shrink: a short batch keeps the full 70ms and
      // never slows down to fill the window.
      const step =
        blocks.length > 1 ? Math.min(STAGGER_MS, STAGGER_WINDOW_MS / (blocks.length - 1)) : 0
      blocks.forEach((block, index) => {
        const timer = waiting.get(block)
        if (timer !== undefined) {
          clearTimeout(timer)
          waiting.delete(block)
        }
        trigger.unobserve(block)
        safety.unobserve(block)
        show(block as HTMLElement, ENTRANCE_DELAY_MS + index * step)
      })
    }

    /**
     * The entrance. Fires once a block is `TRIGGER_OFFSET_PX` past the bottom
     * edge, which is what stops an arrival happening at the very lip of the
     * screen.
     */
    const trigger = new IntersectionObserver(
      (entries) => {
        /*
         * `clientHeight` is the viewport the observer itself measures against,
         * less any horizontal scrollbar, so it is the right number. The fallback
         * is not decoration: a zero here would put every block above the fold by
         * this arithmetic and hide the entire page, which is the worst outcome
         * this file has, earned from the cheapest possible mistake.
         */
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight

        /*
         * Three cases, and the order matters.
         *
         * Past the trigger line: arrive.
         *
         * On screen but short of the trigger line: arrive too, without waiting.
         * Either straddling the fold at load or already painted, so the one
         * thing that must not happen is hiding it. Because it was never
         * 'pending', going straight to 'shown' leaves opacity at 1 and translate
         * at none — the computed values do not change, so nothing animates and
         * nothing flashes. It loses the arrival, which is the correct thing to
         * lose.
         *
         * Genuinely off screen: hide it, and let it arrive on the way down.
         */
        const arriving: Element[] = []
        for (const entry of entries) {
          if (entry.isIntersecting || !isOffScreen(entry, viewportHeight)) {
            arriving.push(entry.target)
            continue
          }
          entry.target.setAttribute(REVEAL_ATTR, 'pending')
        }
        arrive(arriving)
      },
      { rootMargin: `0px 0px -${TRIGGER_OFFSET_PX}px 0px` },
    )

    /**
     * The guarantee. Watches the real viewport edge, so it hears about a block
     * the moment it is genuinely visible — including while it sits inside the
     * offset band, where `trigger` stays silent. Whatever the reader does, a
     * visible block arrives within `SAFETY_MS`.
     */
    const safety = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            const timer = waiting.get(entry.target)
            if (timer !== undefined) {
              clearTimeout(timer)
              waiting.delete(entry.target)
            }
            continue
          }
          if (waiting.has(entry.target)) continue
          waiting.set(
            entry.target,
            setTimeout(() => {
              waiting.delete(entry.target)
              arrive([entry.target])
            }, SAFETY_MS),
          )
        }
      },
      { rootMargin: '0px' },
    )

    for (const block of root.querySelectorAll(`[${REVEAL_ATTR}]`)) {
      trigger.observe(block)
      safety.observe(block)
    }
    return () => {
      trigger.disconnect()
      safety.disconnect()
      for (const timer of waiting.values()) clearTimeout(timer)
      waiting.clear()
    }
  }, [rootRef])
}
