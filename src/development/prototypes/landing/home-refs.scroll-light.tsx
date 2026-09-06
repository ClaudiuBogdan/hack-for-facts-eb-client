import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * Scroll-coupled light running down the frame rules.
 *
 * The reference is ui8.ai/forge, whose sparks are 2px bars carrying a gradient
 * from transparent to white-hot with radial-gradient halos behind the head.
 * Probing that page while wheeling it shows the streaks changing length with
 * scroll speed — 28px at a nudge, 275px at a flick — which is the whole trick.
 * They are coupled to the scroll, not triggered by it. An observer firing a
 * transition once as a band enters view reads as a fade-in; only a value that
 * tracks the scroll every frame reads as light moving with you.
 *
 * What is ours rather than borrowed is where the light goes and what it stops
 * for. The head rides the two frame rules as a playhead — its position *is* the
 * scroll position — and flares as it crosses each band boundary. The page's own
 * structure supplies the stops, so the effect reports the document rather than
 * decorating it. The first stop is the pair of crux marks under the hero, which
 * already sit in brand blue at exactly that point.
 *
 * Constraints, following `home-refs.field-animation.tsx`:
 *
 * 1. **`transform` and `opacity` only.** The trail's length is a `scaleY` on a
 *    fixed-height bar, not an animated `height` — height would run layout on
 *    every frame of every scroll.
 * 2. **One write per frame.** The scroll handler only stores the position and
 *    schedules a frame; a single rAF writes four custom properties onto one
 *    host. Everything below that is declarative CSS.
 * 3. **`will-change` is set here**, on two elements that are always moving.
 *    That is the case it exists for — unlike the ~990 field cells, where asking
 *    for that many layers would cost more than the repaint it saves.
 * 4. **Dark only.** Additive light on a near-white background is a smudge, not
 *    a glow. The host is `hidden dark:block` rather than recoloured, because a
 *    blue smear on the light theme would be a worse answer than none.
 */

/** Unscaled height of the trail bar. `scaleY` works against this. */
const TRAIL_BASE_PX = 260

/** Trail length per pixel-per-frame of scroll speed. */
const TRAIL_PER_VELOCITY = 2.4

/** Longest the trail is allowed to stretch, so a flick does not draw a laser. */
const TRAIL_MAX_PX = 210

/** How near a band boundary the head has to be before it flares. */
const FLARE_RANGE_PX = 140

/** Velocity decay per frame while the scroll is idle, so the trail retracts. */
const VELOCITY_DECAY = 0.86

const CSS = `
.tpz-light {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.tpz-light-rail {
  position: absolute;
  top: 0;
  width: 0;
  height: 100%;
}

.tpz-light-trail,
.tpz-light-head,
.tpz-light-halo {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform, opacity;
}

/* The trail hangs above the head and is scaled from its bottom edge, so the
   head stays put while the tail lengthens behind it. 'scaleY' on a fixed box
   costs a composite; animating 'height' would cost a layout. */
.tpz-light-trail {
  width: 2px;
  height: ${TRAIL_BASE_PX}px;
  margin-left: -1px;
  border-radius: 1px;
  transform-origin: 50% 100%;
  background: linear-gradient(
    to bottom,
    rgba(96, 152, 255, 0) 0%,
    rgba(96, 152, 255, 0.4) 55%,
    rgba(178, 212, 255, 0.85) 88%,
    rgb(233, 243, 255) 100%
  );
  transform: translate3d(0, calc(var(--sp-y, 0px) - ${TRAIL_BASE_PX}px), 0)
    scaleY(var(--sp-scale, 0));
  opacity: var(--sp-on, 0);
}

/* The hot core. Small and near-white — the colour comes from the halo. */
.tpz-light-head {
  width: 4px;
  height: 4px;
  margin-left: -2px;
  margin-top: -2px;
  border-radius: 50%;
  background: rgb(240, 247, 255);
  transform: translate3d(0, var(--sp-y, 0px), 0)
    scale(calc(1 + var(--sp-flare, 0) * 0.9));
  opacity: var(--sp-on, 0);
}

/* A pre-blurred texture rather than 'filter: blur'. Blur on a moving element
   repaints the blurred region every frame; a radial gradient is something the
   compositor can just move. */
.tpz-light-halo {
  width: 150px;
  height: 150px;
  margin-left: -75px;
  margin-top: -75px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(120, 170, 255, 0.3) 0%,
    rgba(90, 140, 240, 0.12) 35%,
    rgba(80, 130, 230, 0) 70%
  );
  transform: translate3d(0, var(--sp-y, 0px), 0)
    scale(calc(0.55 + var(--sp-flare, 0) * 0.75));
  opacity: calc(var(--sp-on, 0) * (0.35 + var(--sp-flare, 0) * 0.65));
}

/* The motion is the whole component, so reduced motion removes it rather than
   substituting something static. The hook also never attaches its listener. */
@media (prefers-reduced-motion: reduce) {
  .tpz-light {
    display: none;
  }
}
`

export function ScrollLightStyles() {
  return <style>{CSS}</style>
}

type Geometry = {
  /** Viewport x of each frame rule. */
  rails: readonly number[]
  /** Document y of every band boundary — the stops. */
  stops: readonly number[]
}

function measure(root: HTMLElement | null): Geometry {
  if (!root) return { rails: [], stops: [] }
  // The rule's x depends on viewport width through `max-w-6xl` and the frame's
  // padding, so it is read rather than computed.
  const frame = root.querySelector('[data-frame="hero"]')
  const rails: number[] = []
  if (frame) {
    const box = frame.getBoundingClientRect()
    rails.push(box.left, box.right)
  }
  const stops = Array.from(root.querySelectorAll('section')).map(
    (section) => section.getBoundingClientRect().top + window.scrollY,
  )
  return { rails, stops }
}

/**
 * Returns the ref to put on the page root. The host is found underneath it, so
 * the component owns its own markup and the page only lends its geometry.
 */
export function useScrollLight(enabled: boolean): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const host = root.querySelector<HTMLElement>('.tpz-light')
    if (!host) return

    let geometry = measure(root)
    let lastY = window.scrollY
    let velocity = 0
    let frame = 0

    const paint = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      // Decay rather than snap to zero, so the trail retracts over a few frames
      // instead of vanishing the instant the wheel stops.
      velocity = Math.abs(delta) > Math.abs(velocity) ? delta : velocity * VELOCITY_DECAY

      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, y / scrollable))
      const headViewport = progress * window.innerHeight

      const trail = Math.min(TRAIL_MAX_PX, Math.abs(velocity) * TRAIL_PER_VELOCITY)

      // The stops are what makes this the page's animation rather than a
      // generic one: distance from the head to the nearest band boundary.
      const headDocument = y + headViewport
      let nearest = Number.POSITIVE_INFINITY
      for (const stop of geometry.stops) {
        const distance = Math.abs(stop - headDocument)
        if (distance < nearest) nearest = distance
      }
      const flare = Math.max(0, 1 - nearest / FLARE_RANGE_PX)

      host.style.setProperty('--sp-y', `${headViewport.toFixed(1)}px`)
      host.style.setProperty('--sp-scale', (trail / TRAIL_BASE_PX).toFixed(4))
      host.style.setProperty('--sp-flare', flare.toFixed(3))
      // Present once there is either movement or a boundary under the head,
      // so a parked page is not left with a dot burning on the rail.
      host.style.setProperty('--sp-on', Math.min(1, trail / 24 + flare).toFixed(3))

      if (Math.abs(velocity) > 0.05) schedule()
    }

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint)
    }

    const onResize = () => {
      geometry = measure(root)
      for (const [i, x] of geometry.rails.entries()) {
        const rail = host.children[i] as HTMLElement | undefined
        if (rail) rail.style.left = `${x}px`
      }
      schedule()
    }

    onResize()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled])

  return rootRef
}

/** The two rails. Positions are written by the hook, which measures the frame. */
export function ScrollLight() {
  return (
    <div className="tpz-light hidden dark:block" aria-hidden="true">
      {[0, 1].map((rail) => (
        <div key={rail} className="tpz-light-rail">
          <span className="tpz-light-halo" />
          <span className="tpz-light-trail" />
          <span className="tpz-light-head" />
        </div>
      ))}
    </div>
  )
}
