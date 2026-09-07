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

/** Marks a block that should arrive. Inert until the observer arms it. */
export const REVEAL_ATTR = 'data-reveal'

/** Marks the ancestor whose entry reveals every block inside it, together. */
export const REVEAL_GROUP_ATTR = 'data-reveal-group'

const DURATION_MS = 600
const STAGGER_MS = 70
const RISE_PX = 12
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

/**
 * How far in a group must come before it starts. Zero would fire on the first
 * subpixel of overlap, which on a fast scroll means the animation is already
 * over by the time the block is properly on screen.
 */
const ROOT_MARGIN = '0px 0px -12% 0px'

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

/** Reveals every block in a group, staggered in document order. */
function show(group: Element) {
  const blocks = group.querySelectorAll<HTMLElement>(`[${REVEAL_ATTR}]`)
  blocks.forEach((block, index) => {
    block.style.setProperty('--tpz-reveal-delay', `${index * STAGGER_MS}ms`)
    block.setAttribute(REVEAL_ATTR, 'shown')
  })
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
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            /*
             * The first callback reports every group, on screen or not, which is
             * what makes the hidden state safe to apply here: a group already in
             * view is marked 'shown' without ever having been 'pending', so its
             * computed opacity never changes and no transition runs. Everything
             * that does get hidden is below the fold, where the reader cannot
             * see it happen. This is also what survives a reload half way down
             * the page — scroll restoration lands first, and whatever is under
             * the viewport then is simply left alone.
             */
            entry.target
              .querySelectorAll<HTMLElement>(`[${REVEAL_ATTR}]`)
              .forEach((block) => block.setAttribute(REVEAL_ATTR, 'pending'))
            continue
          }
          show(entry.target)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: ROOT_MARGIN },
    )

    root.querySelectorAll(`[${REVEAL_GROUP_ATTR}]`).forEach((group) => observer.observe(group))
    return () => observer.disconnect()
  }, [rootRef])
}
