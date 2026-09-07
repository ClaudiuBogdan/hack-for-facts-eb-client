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
 * Published on the root: whether a card has the reader's attention.
 *
 * The two lights stay independent, so this is a fact one of them states rather
 * than a call it makes. The frame light's stylesheet is free to ignore it — and
 * in the default variant it does. Only the handover variant listens, and then
 * only to get out of the way.
 */
export const SECTION_LIT_ATTR = 'data-section-lit'

/**
 * How far ahead of a card the light counts as arriving.
 *
 * Whoever is listening needs to start leaving *before* the section light
 * appears, or the two are briefly on screen together and the page has two
 * answers to the same question. At a normal reading scroll this is about a
 * quarter of a second of warning.
 */
const LEAD_PX = 200

/**
 * Where down the screen the reader is presumed to be looking.
 *
 * The section in focus is the one whose card crosses this line, and the light's
 * progress around that card is where the line sits inside it — so exactly one
 * section is ever lit, and the handover happens when the line leaves one card
 * and meets the next. Any looser definition ("visible") lights two at once on a
 * tall viewport, which is the opposite of pointing at one.
 */
const FOCUS_RATIO = 0.5

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
 * Quiet time before the light leaves, when it is set to leave at all.
 *
 * Off by default: this light reports position, and standing still does not
 * change where you are. The header variant turns it on to find out whether a
 * page whose marks all come and go with the scroll reads as calmer than one
 * with a mark permanently parked on a border.
 *
 * Comfortably longer than `HANDOVER_MS`, and that is a constraint rather than a
 * taste. At the same value the two fades line up exactly: a scroll that crosses
 * from one section into the next spends its whole quiet period waiting out the
 * handover, and the light arrives on the new card at the same instant the idle
 * clock fires — so a short scroll showed nothing at all. Measured at 0.16 where
 * it should have been 0.7.
 */
const IDLE_MS = 620

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

/* Only ever added when the hook was asked for it. Slower going than coming, so
   the light catches up with the reader at once and takes its time leaving. */
.tpz-section-light.is-idle {
  opacity: 0;
  transition: opacity 520ms ease;
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
  const originX = Math.round(rootBox.left)
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
export function useSectionLight(
  rootRef: RefObject<HTMLElement | null>,
  {
    /**
     * Fade the whole thing out when the reader stops, the way the frame light
     * does. Off by default — see `IDLE_MS`.
     */
    fadeWhenIdle = false,
  }: { readonly fadeWhenIdle?: boolean } = {},
) {
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
    let idleTimer = 0
    /** Last value written to the root, so the attribute is not set every frame. */
    let published = ''

    const publish = (value: string) => {
      if (value === published) return
      published = value
      root.setAttribute(SECTION_LIT_ATTR, value)
    }

    /** Restarts the quiet clock, so a light that has just arrived gets its full
        moment on screen rather than inheriting whatever was left of the last. */
    const restartIdle = () => {
      if (!fadeWhenIdle) return
      host.classList.remove('is-idle')
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => host.classList.add('is-idle'), IDLE_MS)
    }

    /** Moves the host onto a card. Writes geometry, so only on a change. */
    const place = (card: Card | null) => {
      shown = card
      if (!card) {
        host.style.setProperty('--sl-on', '0')
        return
      }
      // Arriving counts as movement: the card changed because the reader moved.
      restartIdle()
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
      const wanted = cards.find((c) => focus >= c.topDoc && focus <= c.bottomDoc) ?? null
      // Stated before the early return below, because a card the reader is
      // still approaching is exactly the case anyone listening cares about.
      publish(
        cards.some((c) => focus >= c.topDoc - LEAD_PX && focus <= c.bottomDoc) ? '1' : '0',
      )

      /*
       * Never move a lit host. A card change fades the light out, waits for the
       * fade, and only then repositions — otherwise a fast scroll drags a
       * half-visible comet across the gap between two sections, which reads as
       * one light teleporting rather than as two sections handing over.
       */
      if (wanted !== shown) {
        // Nothing is lit yet, so there is no fade to wait out — the very first
        // card, and every card after a resize, arrives without the pause.
        if (!shown) {
          place(wanted)
          if (!wanted) return
        } else {
          host.style.setProperty('--sl-on', '0')
        }
      }
      if (wanted !== shown) {
        if (handover === 0) {
          handover = window.setTimeout(() => {
            handover = 0
            place(
              cards.find((c) => {
                const f = window.scrollY + window.innerHeight * FOCUS_RATIO
                return f >= c.topDoc && f <= c.bottomDoc
              }) ?? null,
            )
            schedule()
          }, HANDOVER_MS)
        }
        return
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

    /*
     * Wake on movement, then fall back to idle — but only if asked. Without
     * `fadeWhenIdle` this is just `schedule`, and the light stays where it is
     * when the reader stops, which is the whole point of it.
     */
    const wake = fadeWhenIdle
      ? () => {
          restartIdle()
          schedule()
        }
      : schedule

    onResize()
    if (fadeWhenIdle) host.classList.add('is-idle')
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', onResize)
    const observer = new ResizeObserver(onResize)
    observer.observe(root)

    return () => {
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      window.clearTimeout(handover)
      window.clearTimeout(idleTimer)
      root.removeAttribute(SECTION_LIT_ATTR)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootRef, fadeWhenIdle])
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
