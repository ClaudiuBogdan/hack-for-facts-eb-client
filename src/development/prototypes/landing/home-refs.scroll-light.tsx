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
 * Scroll distance, past the point where the head reaches the bottom corner,
 * over which the two rails travel along the bottom border to meet in its
 * middle.
 *
 * They ride the frame's two sides all the way down, turn the corner, and close
 * on a single point — so the page ends on one mark rather than on two that
 * simply stop.
 */
const CONVERGE_RANGE_PX = 340

/**
 * Quiet time after the last scroll before the light starts fading out.
 *
 * Short on purpose — the light reports movement, so it should begin leaving
 * almost as soon as the movement does. Still comfortably longer than the gap
 * between scroll events during trackpad momentum, which keeps firing, so a
 * glide to a halt fades once at the end rather than flickering through it.
 */
const IDLE_MS = 220

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

  /* The whole thing fades once the reader stops. It reports movement, so
     standing still is the one state where it has nothing to say — and a mark
     parked on the rule indefinitely is exactly the idle noise this is meant to
     avoid. Faded on the host rather than per element, so the head, trail and
     halo go together instead of separately.

     Asymmetric, and the asymmetry is the whole feel of it: this curve governs
     arriving, and the one on '.is-idle' governs leaving. It has to catch up
     with the reader within a frame or two of the first wheel notch, then take
     its time going. Sharing one duration made a short scroll barely light at
     all, because the rise was still climbing when the fall began. */
  transition: opacity 130ms ease-out;

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
    rgba(202, 84, 22, 0.1) 0%,
    rgba(198, 72, 16, 0.035) 40%,
    rgba(198, 72, 16, 0) 70%
  );
  --sp-rest: 0.26;
}

.tpz-light.is-idle {
  opacity: 0;
  transition: opacity 550ms ease;
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
    rgba(240, 140, 70, 0.12) 0%,
    rgba(226, 118, 56, 0.04) 40%,
    rgba(226, 118, 56, 0) 70%
  );
  --sp-rest: 0.22;
}

.tpz-light-rail {
  position: absolute;
  top: 0;
  width: 0;
  height: 100%;
  /* Set per rail, not on the host: the two travel opposite distances to reach
     the same point. */
  transform: translate3d(var(--sp-dx, 0px), 0, 0);
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
  /* 1px, the rule's own width, and an odd width against a half-pixel rail
     resolves to whole pixels — so it lies exactly on the line instead of being
     snapped off it. */
  width: 1px;
  height: ${TRAIL_BASE_PX}px;
  margin-left: -0.5px;
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
  /* 3px for the same reason: centred on a half-pixel rail it spans whole
     pixels. At 2px it spanned .5 to .5 and the browser snapped the whole mark
     a pixel sideways off the rule. */
  width: 3px;
  height: 3px;
  margin-left: -1.5px;
  margin-top: -1.5px;
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
  width: 29px;
  height: 29px;
  margin-left: -14.5px;
  margin-top: -14.5px;
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
  /** Document y of the page's first and last edge, in document space. */
  bounds: readonly [number, number]
}

function measure(root: HTMLElement | null): Geometry {
  if (!root) return { rails: [], stops: [], bounds: [0, 0] }
  // The rule's x depends on viewport width through `max-w-6xl` and the frame's
  // padding, so it is read rather than computed.
  const frame = root.querySelector('[data-frame="hero"]')
  const rails: number[] = []
  if (frame) {
    const box = frame.getBoundingClientRect()
    /*
     * Centre on where the rule is *painted*, which is not where it is laid out.
     *
     * The frame is centred with `mx-auto`, so on most widths its edges land on
     * a fractional pixel — 195.5 at 1506px wide. A 1px span cannot be painted
     * across half a pixel, so the browser snaps it to a whole one, and the rule
     * that layout puts at 195.5..196.5 is drawn at 196..197. Centring the head
     * on the layout figure therefore leaves it half a pixel to the left of the
     * line it is supposed to be riding, which is visible on a 2px mark.
     *
     * Rounding first reproduces the snap, then the half pixel centres the head
     * within the drawn rule. Verified by taking the intensity-weighted centroid
     * of both out of a 4x screenshot rather than by trusting the arithmetic.
     */
    rails.push(Math.round(box.left) + 0.5, Math.round(box.right) - 0.5)
  }
  const stops = Array.from(root.querySelectorAll('section')).map(
    (section) => section.getBoundingClientRect().top + window.scrollY,
  )
  // Kept in document space so the per-frame conversion is a subtraction rather
  // than another layout read.
  const box = root.getBoundingClientRect()
  const bounds: [number, number] = [box.top + window.scrollY, box.bottom + window.scrollY]
  return { rails, stops, bounds }
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
    let idleTimer = 0

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
      /*
       * The playhead rides the viewport, but the rails belong to the landing —
       * so its travel is clipped to the page's own top and bottom edges. Past
       * the last band the head parks on that bottom border instead of carrying
       * on into the footer, which is not its frame and has no rule to sit on.
       * Both rails clamp to the same value, so they arrive together and the
       * light closes on the border rather than drifting apart below it.
       */
      const [topDoc, bottomDoc] = geometry.bounds
      const headViewport = Math.min(
        Math.max(progress * window.innerHeight, topDoc - y),
        bottomDoc - y,
      )
      const headDocument = y + headViewport

      const trail = Math.min(TRAIL_MAX_PX, Math.abs(velocity) * TRAIL_PER_VELOCITY)

      // The stops are what makes this the page's animation rather than a
      // generic one: distance from the head to the nearest band boundary.
      let nearest = Number.POSITIVE_INFINITY
      for (const stop of geometry.stops) {
        const distance = Math.abs(stop - headDocument)
        if (distance < nearest) nearest = distance
      }
      const flare = Math.max(0, 1 - nearest / FLARE_RANGE_PX)

      /*
       * Over the last stretch the rails draw together and meet on the centre of
       * the bottom rule. Each is given its own offset because they travel
       * opposite distances, and both reach zero separation at the same moment,
       * so the two heads become one mark rather than two that happen to stop.
       */
      /*
       * The two phases are sequenced, not blended. The head runs the vertical
       * rule until it reaches the bottom corner, and only then turns along the
       * bottom border towards the centre — so it always travels the frame's
       * contour and never cuts diagonally across the content inside it.
       *
       * `overshoot` is the scroll the playhead would have used to carry on down
       * had the clamp not stopped it. It is zero until the head is parked on
       * the corner, which is exactly the moment the turn should begin.
       */
      const overshoot = progress * window.innerHeight - (bottomDoc - y)
      const converge =
        geometry.rails.length === 2
          ? Math.min(1, Math.max(0, overshoot / CONVERGE_RANGE_PX))
          : 0
      const centre = geometry.rails.length === 2 ? (geometry.rails[0] + geometry.rails[1]) / 2 : 0
      // Eased, so the rails leave the corner gently instead of snapping in.
      const pull = converge * converge * (3 - 2 * converge)
      for (const [i, rail] of railEls.entries()) {
        const base = geometry.rails[i]
        rail.style.setProperty('--sp-dx', `${((centre - base) * pull).toFixed(1)}px`)
      }

      host.style.setProperty('--sp-y', `${headViewport.toFixed(1)}px`)
      // Sign survives the decay, so the trail keeps pointing the way the reader
      // was last travelling rather than snapping upright as it retracts.
      host.style.setProperty('--sp-dir', velocity < 0 ? '-1' : '1')
      host.style.setProperty('--sp-scale', ((trail / TRAIL_BASE_PX) * (1 - pull)).toFixed(4))
      host.style.setProperty('--sp-flare', flare.toFixed(3))
      // Present once there is either movement or a boundary under the head,
      // so a parked page is not left with a dot burning on the rail.
      host.style.setProperty('--sp-on', Math.min(1, trail / 14 + flare).toFixed(3))

      if (Math.abs(velocity) > 0.05) schedule()
    }

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint)
    }

    /*
     * Wake on movement, then fall back to idle. The timer restarts on every
     * scroll event, so a slow continuous scroll never triggers the fade — only
     * actually stopping does.
     */
    const wake = () => {
      host.classList.remove('is-idle')
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => host.classList.add('is-idle'), IDLE_MS)
      schedule()
    }

    let railEls: HTMLElement[] = []
    const onResize = () => {
      geometry = measure(root)
      railEls = []
      for (const [i, x] of geometry.rails.entries()) {
        const rail = host.children[i] as HTMLElement | undefined
        if (!rail) continue
        rail.style.left = `${x}px`
        railEls.push(rail)
      }
      schedule()
    }

    onResize()
    // Starts hidden: the page opens at rest, which is the state that has
    // nothing to report.
    host.classList.add('is-idle')
    window.addEventListener('scroll', wake, { passive: true })
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
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      window.clearTimeout(idleTimer)
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
