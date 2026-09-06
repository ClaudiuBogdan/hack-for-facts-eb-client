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
 * 4. **Two palettes, not one.** The reference is white-hot on near-black, which
 *    on our default light theme would be a grey smear. So the light theme gets
 *    the brand navy as a solid core with a faint halo — a mark that reads as
 *    ink rather than as glow — and only the dark theme gets the luminous
 *    version. Same anatomy, different material.
 * 5. **It rests visible.** Length and halo are driven by scroll speed, so a
 *    parked page would otherwise show nothing at all and the whole effect would
 *    be invisible until someone happened to scroll. The head keeps a floor
 *    opacity and sits on the rail as a position marker; movement adds the trail
 *    and the flare on top of it.
 */

/** Unscaled height of the trail bar. `scaleY` works against this. */
const TRAIL_BASE_PX = 260

/** Trail length per pixel-per-frame of scroll speed. */
const TRAIL_PER_VELOCITY = 4.2

/**
 * Longest the trail is allowed to stretch. Close to the 164px the reference
 * crop measures, which is the length at which it still reads as a mark rather
 * than a beam.
 */
const TRAIL_MAX_PX = 150

/** How near a band boundary the head has to be before it flares. */
const FLARE_RANGE_PX = 140

/**
 * Velocity decay per frame while the scroll is idle, so the trail retracts.
 * Slow enough that the tail lingers for a beat after the wheel stops — at a
 * faster decay it vanished on the same frame and the tail was never seen.
 */
const VELOCITY_DECAY = 0.93

const CSS = `
.tpz-light {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;

  /* Light theme: ink, not light. The same warm hue, pushed dark enough to read
     on a near-white page, where the luminous ramp below would vanish. */
  --sp-trail: linear-gradient(
    to bottom,
    rgba(194, 65, 12, 0) 0%,
    rgba(194, 65, 12, 0.14) 25%,
    rgba(198, 72, 16, 0.3) 50%,
    rgba(202, 84, 22, 0.58) 70%,
    rgba(206, 92, 26, 0.82) 85%,
    rgba(208, 98, 30, 0.95) 94%,
    rgb(210, 102, 32) 100%
  );
  --sp-core: rgb(198, 72, 16);
  --sp-halo: radial-gradient(
    circle,
    rgba(202, 84, 22, 0.13) 0%,
    rgba(198, 72, 16, 0.05) 40%,
    rgba(198, 72, 16, 0) 70%
  );
  --sp-rest: 0.26;
}

/*
 * Dark theme: the reference's ramp, sampled rather than eyeballed. Walking the
 * tail's own column in the source crop gives rgb(55,37,28) at the tip through
 * (158,84,45) at the midpoint to (248,223,185) near the head, over a background
 * of luminance 23 — so the alphas here are that measured luminance normalised.
 *
 * The shape of the ramp is the point: it stays dim for the first half and does
 * almost all of its brightening in the last 30%. A linear fade reads as a
 * gradient; this reads as something incandescent at one end.
 */
.dark .tpz-light {
  --sp-trail: linear-gradient(
    to bottom,
    rgba(200, 90, 40, 0) 0%,
    rgba(214, 100, 44, 0.22) 25%,
    rgba(226, 118, 56, 0.36) 50%,
    rgba(240, 158, 100, 0.64) 70%,
    rgba(250, 202, 148, 0.87) 85%,
    rgba(255, 232, 194, 0.98) 94%,
    rgb(255, 246, 228) 100%
  );
  --sp-core: rgb(255, 244, 224);
  --sp-halo: radial-gradient(
    circle,
    rgba(240, 140, 70, 0.16) 0%,
    rgba(226, 118, 56, 0.06) 40%,
    rgba(226, 118, 56, 0) 70%
  );
  --sp-rest: 0.22;
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
  width: 1.5px;
  height: ${TRAIL_BASE_PX}px;
  margin-left: -0.75px;
  border-radius: 1px;
  transform-origin: 50% 100%;
  background: var(--sp-trail);
  /* The bar's bottom edge sits on the head and it scales from there, so a
     negative scale reflects it about the head: scrolling down it trails above,
     scrolling up it trails below, and because the gradient is reflected too its
     bright end stays on the head either way. One multiply, no second element. */
  transform: translate3d(0, calc(var(--sp-y, 0px) - ${TRAIL_BASE_PX}px), 0)
    scaleY(calc(var(--sp-scale, 0) * var(--sp-dir, 1)));
  opacity: var(--sp-on, 0);
}

/* The hot core. Small and near-white — the colour comes from the halo. */
.tpz-light-head {
  width: 2px;
  height: 2px;
  margin-left: -1px;
  margin-top: -1px;
  border-radius: 50%;
  background: var(--sp-core);
  transform: translate3d(0, var(--sp-y, 0px), 0)
    scale(calc(1 + var(--sp-flare, 0) * 0.9));
  /* Never fully off: this is the page's position marker before it is an
     animation, so it stays on the rail when nothing is moving. */
  opacity: min(1, calc(var(--sp-rest) + var(--sp-on, 0) * 0.6));
}

/* A pre-blurred texture rather than 'filter: blur'. Blur on a moving element
   repaints the blurred region every frame; a radial gradient is something the
   compositor can just move. */
.tpz-light-halo {
  width: 44px;
  height: 44px;
  margin-left: -22px;
  margin-top: -22px;
  border-radius: 50%;
  background: var(--sp-halo);
  transform: translate3d(0, var(--sp-y, 0px), 0)
    scale(calc(0.55 + var(--sp-flare, 0) * 0.75));
  opacity: min(1, calc(var(--sp-rest) * 0.22 + var(--sp-on, 0) * (0.3 + var(--sp-flare, 0) * 0.7)));
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
  /** Viewport x of the centre of each frame rule. */
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
    // Half a pixel in from each edge, because the rule is a 1px span drawn
    // *inside* the frame: the left one covers x .left..left+1 and the right one
    // .right-1...right, so their centres are half a pixel off the box. Centring
    // the head on the box edge instead leaves it visibly beside the line — the
    // same correction the crux marks needed.
    rails.push(box.left + 0.5, box.right - 0.5)
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
      // Sign survives the decay, so the trail keeps pointing the way the reader
      // was last travelling rather than snapping upright as it retracts.
      host.style.setProperty('--sp-dir', velocity < 0 ? '-1' : '1')
      host.style.setProperty('--sp-scale', (trail / TRAIL_BASE_PX).toFixed(4))
      host.style.setProperty('--sp-flare', flare.toFixed(3))
      // Present once there is either movement or a boundary under the head,
      // so a parked page is not left with a dot burning on the rail.
      host.style.setProperty('--sp-on', Math.min(1, trail / 14 + flare).toFixed(3))

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

    /*
     * A window resize is not the only thing that moves the rule. The sidebar
     * opening, a lazily-decoded illustration changing a band's height, a font
     * swapping in — all shift the frame without firing `resize`, and a rail
     * measured once at mount then sits beside the line instead of on it. The
     * observer catches every one of them, because it watches the element that
     * actually defines the geometry.
     */
    const observer = new ResizeObserver(onResize)
    observer.observe(root)
    const heroFrame = root.querySelector('[data-frame="hero"]')
    if (heroFrame) observer.observe(heroFrame)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled])

  return rootRef
}

/** The two rails. Positions are written by the hook, which measures the frame. */
export function ScrollLight() {
  return (
    <div className="tpz-light" aria-hidden="true">
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
