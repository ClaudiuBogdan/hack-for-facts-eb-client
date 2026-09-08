import { useEffect } from 'react'
import type { RefObject } from 'react'
import { LIT_CLASS, TRAIL_BASE_PX } from './home-refs.light-material'

/**
 * A light that traces the card of whichever section you are reading.
 *
 * The frame light in `home-refs.scroll-light.tsx` answers *how fast* — its
 * length is scroll velocity, and it fades the moment you stop. This one answers
 * *where*: two heads leave the top centre of the section's card, run outward
 * along the top border, down the two sides, and close on the bottom centre.
 * Reaching the bottom is the same event as the card leaving the middle of the
 * screen, so the circuit is not an animation that happens to be triggered by
 * scrolling — it is a readout of how far through the section you are.
 *
 * The two are deliberately independent: separate hooks, separate hosts, no
 * shared state. What they do share is their material, which lives in
 * `home-refs.light-material.tsx` and belongs to neither. They also divide the
 * page's two questions cleanly at rest, where the frame light has faded out and
 * this one has not, because standing still says nothing about speed and
 * everything about position.
 *
 * Three things make it cheap enough to run on every frame of every scroll:
 *
 * 1. **One host, moved between cards** rather than one host per card. Six
 *    sections would otherwise mean ninety-six promoted layers for the sake of
 *    the sixteen that can ever be visible at once.
 * 2. **`transform` and `opacity` only**, as with the frame light. The card
 *    geometry is measured on mount and on resize; the per-frame path is pure
 *    arithmetic over `window.scrollY`.
 * 3. **One arm, drawn twice.** The right-hand arm is the left one under
 *    `scaleX(-1)`, so the maths below is written once and the mirror inverts
 *    the rotations for free.
 */

/** The card each section wants traced. Put on the bordered box, not the band. */
export const SECTION_LIGHT_ATTR = 'data-section-light'

/**
 * How far ahead of a card its claim starts rising.
 *
 * The margins have to be *leaving* before the section light arrives, or the
 * page briefly has two answers to the same question. Two hundred pixels is
 * about a screenful of lead-in on a laptop, and short enough that the margins
 * are still mostly lit when the card's top edge comes into view.
 */
const LEAD_PX = 200

/**
 * How far past a card its claim takes to fall away.
 *
 * Shorter than the lead-in on purpose. Arriving somewhere deserves a slow
 * approach; leaving does not, and the margins should be back before the reader
 * is far enough past the card to wonder where the light went.
 */
const RELEASE_PX = 120

/**
 * Where down the screen the reader is presumed to be looking.
 *
 * The section in focus is the one whose card crosses this line, and the light's
 * progress around that card is where the line sits inside it — so exactly one
 * section is ever lit, and the handover happens when the line leaves one card
 * and meets the next. Any looser definition ("visible") lights two at once on a
 * tall viewport, which is the opposite of pointing at one.
 */
export const FOCUS_RATIO = 0.5

/**
 * Length of the comet, in pixels of border.
 *
 * Fixed, unlike the frame light's, which is scroll velocity made visible. This
 * light is a place marker, and a marker whose size reports how hard you are
 * flicking the trackpad is reporting the wrong thing. It also has to survive
 * standing still, which a velocity-driven length by definition does not.
 */
const COMET_PX = 130

/** Ceiling on the whole thing, so it stays behind the text it is framing. */
const MAX_OPACITY = 0.7

/** Cross-fade when the reader moves from one section to the next. */
const HANDOVER_MS = 260

/**
 * Velocity decay per frame, matching the frame light.
 *
 * Only the *sign* is used here — the comet has a fixed length, but it still has
 * to point the right way, and a tail that flips end for end the instant a
 * trackpad glide reverses reads as a glitch rather than as a direction change.
 * Decaying the stored velocity means the sign survives the gaps between scroll
 * events and only turns over once the reader really has.
 */
const VELOCITY_DECAY = 0.93

const CSS = `
.tpz-section-light {
  /*
   * Absolute in the landing root and sized to the active card, for the same
   * reason the frame light is: a fixed host is pinned to the visual viewport,
   * and the border it is tracing is not. Its own coordinate space is the card,
   * so everything below is in card pixels and nothing has to know about scroll.
   */
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  /* Under the frame light. They never overlap — the card is inset from the
     frame rules by the band's own padding — but if a narrow viewport ever
     brings them together, the light that reports movement should win. */
  z-index: 19;
  opacity: calc(var(--sl-on, 0) * ${MAX_OPACITY});
  transition: opacity ${HANDOVER_MS}ms ease;
}


/*
 * The two arms are one arm. The right is the left mirrored about the card's
 * vertical centre line, which inverts its rotations along with everything else,
 * so the leg that lies backwards along the top border on the left does so on
 * the right too without a second set of angles to keep in step.
 */
.tpz-section-arm {
  position: absolute;
  inset: 0;
}

.tpz-section-arm-mirrored {
  transform: scaleX(-1);
  transform-origin: 50% 0;
}

/*
 * Three legs, because the circuit turns two corners and a single bar rotated
 * through a corner is a straight line at every angle in between — mid-turn it
 * would lift off the border and hang diagonally across the card. Each leg holds
 * whatever part of the comet currently lies on it, and the three lengths always
 * sum to the comet, so it bends rather than stretching.
 *
 * Each is translated so its *leading* end sits at the head-most point of its
 * share, then rotated onto its border, then scaled to that share's length. The
 * sign of the scale is the direction of travel: negative flips the bar to hang
 * off the other side of its origin, which reverses the ramp with it, so
 * scrolling back up does not leave the tail in front of the head.
 */
.tpz-section-leg-top {
  transform: translate3d(
      calc(var(--sl-xc, 0px) - var(--sl-u1, 0px)),
      calc(var(--sl-yt, 0px) - ${TRAIL_BASE_PX}px),
      0
    )
    rotate(90deg) scaleY(calc(var(--sl-k1, 0) * var(--sl-dir, 1)));
  opacity: var(--sl-o1, 0);
}

.tpz-section-leg-side {
  transform: translate3d(
      var(--sl-x0, 0px),
      calc(var(--sl-yt, 0px) + var(--sl-u2, 0px) - ${TRAIL_BASE_PX}px),
      0
    )
    scaleY(calc(var(--sl-k2, 0) * var(--sl-dir, 1)));
  opacity: var(--sl-o2, 0);
}

.tpz-section-leg-foot {
  transform: translate3d(
      calc(var(--sl-x0, 0px) + var(--sl-u3, 0px)),
      calc(var(--sl-yb, 0px) - ${TRAIL_BASE_PX}px),
      0
    )
    rotate(-90deg) scaleY(calc(var(--sl-k3, 0) * var(--sl-dir, 1)));
  opacity: var(--sl-o3, 0);
}

.tpz-section-head {
  transform: translate3d(var(--sl-hx, 0px), var(--sl-hy, 0px), 0);
}

.tpz-section-halo {
  transform: translate3d(var(--sl-hx, 0px), var(--sl-hy, 0px), 0) scale(0.7);
  opacity: 0.75;
}

/* The motion is the whole component, so reduced motion removes it rather than
   substituting something static. The hook also never attaches its listener. */
@media (prefers-reduced-motion: reduce) {
  .tpz-section-light {
    display: none;
  }
}
`

export function SectionLightStyles() {
  return <style>{CSS}</style>
}

/** One traced card, in document coordinates, measured once per layout. */
type Card = {
  readonly element: Element
  /** Root-relative, since that is the space the host is positioned in. */
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  /** Document space, for deciding which card the focus line is inside. */
  readonly topDoc: number
  readonly bottomDoc: number
}

const clamp = (value: number, low: number, high: number) =>
  value < low ? low : value > high ? high : value

/** Distance from a card's top centre to its corner, along the painted line. */
const halfTopOf = (card: Card) => card.width / 2 - 0.5

/**
 * How strongly the nearest card claims the reader, 0 to 1: 1 anywhere inside
 * one, falling away across `LEAD_PX` above it and `RELEASE_PX` below.
 *
 * Exported because the frame light needs the same answer to know when to stand
 * down, and this is the definition of the thing — not a value passed between
 * them. Each light measures the cards itself and calls this; there is no shared
 * state, no ordering to get right, and no chance of the two disagreeing about
 * where the crossing happens.
 *
 * It was a value passed between them, briefly, as a custom property on the
 * root. That is the obvious way to do it and it is a trap: a custom property on
 * the root invalidates style for everything that could read it, and twenty-five
 * writes over an 1800px scroll took the 95th-percentile frame from 18.4ms to
 * 48.5ms at 6x throttle. Nothing wrong with the idea, everything wrong with the
 * element it was written on.
 *
 * A ramp in *distance* rather than a boolean plus a CSS transition, which is
 * what this started as. A duration-based fade makes the crossing depend on how
 * fast the reader happens to be scrolling: at a flick the two lights cross, and
 * at a slow read the margins are long gone before the card arrives and the page
 * spends two hundred pixels with nothing lit. Where you are does not depend on
 * how quickly you got there.
 */
export function sectionClaimAt(
  spans: readonly (readonly [number, number])[],
  focus: number,
): number {
  let best = 0
  for (const [top, bottom] of spans) {
    const near =
      focus < top
        ? 1 - (top - focus) / LEAD_PX
        : focus > bottom
          ? 1 - (focus - bottom) / RELEASE_PX
          : 1
    if (near > best) best = near
  }
  return clamp(best, 0, 1)
}

/**
 * Where the head is, given how far it has travelled around the circuit.
 *
 * Half-pixel offsets throughout, and they are the same half pixel the host's
 * `--sl-x0` and `--sl-yt` carry: the head and the legs have to agree about
 * where the line is, or the comet steps sideways as it crosses a corner.
 */
function headAt(
  distance: number,
  half: number,
  side: number,
  height: number,
): readonly [number, number] {
  if (distance <= half) return [half + 0.5 - distance, 0.5]
  if (distance <= half + side) return [0.5, 0.5 + (distance - half)]
  return [0.5 + (distance - half - side), height - 0.5]
}

/**
 * Card rectangles, snapped the way the border is actually painted.
 *
 * A card centred by `mx-auto` lands on a fractional pixel at most widths, and
 * its 1px border is then drawn on the whole pixel next door. Rounding the box
 * before insetting by half a pixel reproduces that snap, so the light sits *on*
 * the line rather than half a pixel beside it — the same correction the frame
 * light makes for the same reason, and visible on a 1px mark.
 */
function measure(root: HTMLElement | null): Card[] {
  if (!root) return []
  const rootBox = root.getBoundingClientRect()
  /*
   * Not rounded: the host is placed at these offsets *inside* the root, so it
   * is painted at `root.left + card.left`. Rounding the origin would leave the
   * root's own fraction in that sum and push the circuit off the border by up
   * to half a pixel — the error the rounding of the card's edge below exists to
   * remove. Subtracting the real value cancels it.
   */
  const originX = rootBox.left
  const originY = rootBox.top + window.scrollY
  return Array.from(root.querySelectorAll(`[${SECTION_LIGHT_ATTR}]`)).map((element) => {
    const box = element.getBoundingClientRect()
    const left = Math.round(box.left)
    const top = Math.round(box.top + window.scrollY)
    return {
      element,
      left: left - originX,
      top: top - originY,
      width: Math.round(box.width),
      height: Math.round(box.height),
      topDoc: top,
      bottomDoc: top + Math.round(box.height),
    }
  })
}

/**
 * Arms the section light. Takes the same root ref the frame light uses.
 *
 * Deliberately its own listener and its own frame rather than a painter bolted
 * onto `useScrollLight`. Two passive scroll handlers and two rAF callbacks do
 * not cost meaningfully more than one — the browser still runs a single style,
 * layout and paint pass for the frame, and neither of these reads layout — so
 * sharing a pump would buy nothing and would tie two effects together that have
 * different lifetimes, different idle behaviour and different reasons to exist.
 */
export function useSectionLight(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const host = root.querySelector<HTMLElement>('.tpz-section-light')
    if (!host) return

    let cards = measure(root)
    /** The card the host is currently sized to. */
    let shown: Card | null = null
    let handover = 0
    let lastY = window.scrollY
    let velocity = 1
    let frame = 0

    /** The card the focus line is inside, if any. */
    const cardAt = (focus: number) =>
      cards.find((c) => focus >= c.topDoc && focus <= c.bottomDoc) ?? null


    /** Moves the host onto a card. Writes geometry, so only on a change. */
    const place = (card: Card | null) => {
      shown = card
      if (!card) {
        host.style.setProperty('--sl-on', '0')
        return
      }
      host.style.left = `${card.left}px`
      host.style.top = `${card.top}px`
      host.style.width = `${card.width}px`
      host.style.height = `${card.height}px`
      /*
       * The circuit's own geometry, written once per card rather than per
       * frame. Half a pixel in from each edge, because the border is painted
       * inside the box and a 1px mark centred on the box edge is half on the
       * card and half on the page.
       */
      host.style.setProperty('--sl-x0', '0.5px')
      host.style.setProperty('--sl-xc', `${card.width / 2}px`)
      host.style.setProperty('--sl-yt', '0.5px')
      host.style.setProperty('--sl-yb', `${card.height - 0.5}px`)
      host.style.setProperty('--sl-on', '1')
    }

    const paint = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      // Only the sign is used, but it is decayed rather than sampled so that a
      // momentum glide keeps pointing one way through the gaps between events.
      velocity = Math.abs(delta) > Math.abs(velocity) ? delta : velocity * VELOCITY_DECAY

      const focus = y + window.innerHeight * FOCUS_RATIO
      const wanted = cardAt(focus)

      if (wanted !== shown) {
        /*
         * Never move a lit host. A card change fades the light out, waits for
         * the fade, and only then repositions — otherwise a fast scroll drags a
         * half-visible comet across the gap between two sections, which reads
         * as one light teleporting rather than as two handing over.
         *
         * Nothing lit yet is the exception: the very first card, and every card
         * after a re-measure, arrives without the pause because there is no
         * fade to wait out.
         */
        if (!shown) {
          place(wanted)
          if (!wanted) return
        } else {
          host.style.setProperty('--sl-on', '0')
          if (handover === 0) {
            handover = window.setTimeout(() => {
              handover = 0
              // Read again rather than closing over `wanted`: a quarter of a
              // second is long enough for the reader to be somewhere else.
              place(cardAt(window.scrollY + window.innerHeight * FOCUS_RATIO))
              schedule()
            }, HANDOVER_MS)
          }
          return
        }
      } else if (handover !== 0) {
        /*
         * Back where we started before the clock ran out — the reader scrolled
         * out of the card and straight back in. Cancelling restores the light
         * that was already correctly placed, instead of leaving it dark for the
         * rest of the wait and then re-placing it on the card it never left.
         */
        window.clearTimeout(handover)
        handover = 0
        host.style.setProperty('--sl-on', '1')
      }
      if (!shown) return

      /*
       * Arc length around the circuit: out along the top border to the corner,
       * down the side, back in along the bottom. Measured from the snapped
       * geometry rather than from the card's width and height, so the head is
       * on the painted line at both ends of every leg.
       */
      const half = halfTopOf(shown)
      const side = shown.height - 1
      const total = half + side + half
      const progress = clamp(
        (y + window.innerHeight * FOCUS_RATIO - shown.topDoc) / (shown.bottomDoc - shown.topDoc),
        0,
        1,
      )
      const distance = progress * total
      const forward = velocity >= 0
      const low = forward ? distance - COMET_PX : distance
      const high = forward ? distance : distance + COMET_PX

      /*
       * Split the comet across the three legs. Each leg gets the part of
       * [low, high] that falls inside its own stretch of the circuit, so the
       * total is conserved as the head rounds a corner and the tail bends
       * instead of stretching or snapping.
       */
      const bounds: readonly [number, number][] = [
        [0, half],
        [half, half + side],
        [half + side, total],
      ]
      for (const [index, [from, to]] of bounds.entries()) {
        const start = clamp(low, from, to)
        const end = clamp(high, from, to)
        const length = end - start
        // The leading end, which is the far end when travelling forwards and
        // the near one when travelling back.
        const lead = forward ? end : start
        host.style.setProperty(`--sl-u${index + 1}`, `${(lead - from).toFixed(1)}px`)
        host.style.setProperty(`--sl-k${index + 1}`, (length / TRAIL_BASE_PX).toFixed(4))
        /*
         * The leg carrying the head is at full strength; a leg the head has
         * already left dims with the share of the comet still on it, so a
         * rounded corner does not leave what looks like a second head sitting
         * on it.
         */
        const carriesHead = distance >= from && distance <= to
        host.style.setProperty(
          `--sl-o${index + 1}`,
          carriesHead ? '1' : (length / COMET_PX).toFixed(3),
        )
      }

      const [hx, hy] = headAt(distance, half, side, shown.height)
      host.style.setProperty('--sl-hx', `${hx.toFixed(1)}px`)
      host.style.setProperty('--sl-hy', `${hy.toFixed(1)}px`)
      host.style.setProperty('--sl-dir', forward ? '1' : '-1')

      if (Math.abs(velocity) > 0.05) schedule()
    }

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint)
    }

    const onResize = () => {
      cards = measure(root)
      // The card the host is sized to is a stale object after a re-measure, so
      // it is looked up again by element rather than trusted.
      const same = shown ? (cards.find((c) => c.element === shown?.element) ?? null) : null
      shown = null
      place(same)
      schedule()
    }

    onResize()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    const observer = new ResizeObserver(onResize)
    observer.observe(root)
    /*
     * The document as well, because the root can move without changing size:
     * anything inserted above the landing pushes every card down while leaving
     * the root exactly as tall, so neither the observer above nor `resize`
     * fires and every `topDoc` here is stale. That would light the wrong card,
     * which is worse than displacing a mark — this light's whole job is to say
     * which section you are in.
     */
    observer.observe(document.documentElement)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      window.clearTimeout(handover)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootRef])
}

/**
 * The host and its two arms. Every position is written by the hook, which
 * measures the cards; nothing here knows which section it is on.
 */
export function SectionLight() {
  return (
    <div className={`tpz-section-light ${LIT_CLASS}`} aria-hidden="true">
      {['tpz-section-arm', 'tpz-section-arm tpz-section-arm-mirrored'].map((arm) => (
        <div className={arm} key={arm}>
          <span className="tpz-lit-halo tpz-section-halo" />
          <span className="tpz-lit-flank tpz-section-leg-top" />
          <span className="tpz-lit-flank tpz-section-leg-side" />
          <span className="tpz-lit-flank tpz-section-leg-foot" />
          <span className="tpz-lit-core tpz-section-leg-top" />
          <span className="tpz-lit-core tpz-section-leg-side" />
          <span className="tpz-lit-core tpz-section-leg-foot" />
          <span className="tpz-lit-head tpz-section-head" />
        </div>
      ))}
    </div>
  )
}
