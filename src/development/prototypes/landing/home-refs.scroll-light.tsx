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
 * 4. **Two palettes, not one, and no hue in either.** Silver, not white: a
 *    grey core with a lighter edge, which is the material rather than the
 *    maximum of the scale. Pure white is the brightest thing a screen has, so
 *    on near-black it blows out into a strip light and on near-white it can
 *    only ever be a gap — neither reads as an object moving along a rule.
 *    Backing the core off to a mid grey gives it a value of its own to be seen
 *    against, and the flank sits a shade lighter than the core so the mark has
 *    a bright edge rather than a dark one. Same anatomy in both themes; only
 *    the point on the grey scale moves.
 * 5. **It rests visible.** Length and halo are driven by scroll speed, so a
 *    parked page would otherwise show nothing at all and the whole effect would
 *    be invisible until someone happened to scroll. The head keeps a floor
 *    opacity and sits on the rail as a position marker; movement adds the trail
 *    and the flare on top of it.
 * 6. **It lives in the document, not the viewport.** See `.tpz-light` below.
 *    This is the one thing here that is a correctness rule rather than a taste
 *    one.
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
  /*
   * Absolute inside the landing root, not fixed to the viewport — and that is
   * load-bearing, because the rules this light rides are in the flow.
   *
   * A fixed host is positioned against the *visual* viewport, and anything that
   * moves the visual viewport relative to the layout viewport moves it away
   * from the lines underneath: macOS elastic overscroll at the end of the page,
   * an iOS URL bar collapsing, a pinch zoom. The document slides, the light
   * does not, and the two heads end up floating off the frame — which is
   * exactly what rubber-banding past the footer looked like.
   *
   * Sharing the root's coordinate space makes that unrepresentable. The light
   * and the rules are in one layer and move as one thing, and '--sp-y' is a
   * document offset rather than a viewport one. It also means the light cannot
   * leave the landing at all, because the host is bounded by it.
   */
  position: absolute;
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

  /*
   * Light theme. The core runs 158 down to 134 against a frame rule of 230 on a
   * page of 252, so it is a silver mark on the line rather than a hole in it.
   *
   * A white core was tried here first and is the thing this replaced. It was
   * defensible — white is brighter than the rule, so the head read as the rule
   * lighting up — but at 1px on a 230 rule it had 25 levels of headroom to work
   * in, which is not enough to carry a mark, and the grey flank around it ended
   * up doing all the visible work. Silver has the whole scale to itself.
   *
   * Not black either: a 1px mark at 60% black running 150px down the page pulls
   * the eye off the text it is supposed to be accompanying. Mid grey is the
   * value that is present without being loud.
   */
  --sp-trail: linear-gradient(
    to bottom,
    rgba(158, 158, 158, 0) 0%,
    rgba(158, 158, 158, 0.24) 35%,
    rgba(150, 150, 150, 0.55) 62%,
    rgba(140, 140, 140, 0.85) 84%,
    rgb(134, 134, 134) 100%
  );
  /* The flank. Feathered and barely there — it is what keeps the core from
     reading as a drawn line, and it is the *lighter* end of the silver, so the
     mark has a bright edge rather than a dark one. */
  --sp-flank: linear-gradient(
    to bottom,
    rgba(176, 176, 176, 0) 0%,
    rgba(176, 176, 176, 0.06) 35%,
    rgba(170, 170, 170, 0.13) 62%,
    rgba(166, 166, 166, 0.2) 84%,
    rgba(164, 164, 164, 0.24) 100%
  );
  --sp-core: rgb(132, 132, 132);
  /*
   * Set where it is only just perceptible. A halo strong enough to notice on
   * its own is a second mark competing with the head; this one is only there to
   * keep the core from floating free of the page. It also lightens as it goes
   * out, which is the same gradient the flank runs — the edge of the mark is
   * its bright part, the middle its dark one.
   */
  --sp-halo: radial-gradient(
    circle,
    rgba(140, 140, 140, 0.22) 0%,
    rgba(160, 160, 160, 0.1) 34%,
    rgba(170, 170, 170, 0.035) 55%,
    rgba(170, 170, 170, 0) 72%
  );
  --sp-rest: 0.5;
  /*
   * How much of the resting mark the halo carries. More on the light theme,
   * where the core sits on a rule that is already close to it in value and the
   * pool around it is what separates the two; on the dark theme the core stands
   * 160 levels clear of its background and needs no help.
   */
  --sp-halo-rest: 1;
}

.tpz-light.is-idle {
  opacity: 0;
  transition: opacity 550ms ease;
}

/*
 * Dark theme: the reference's ramp with the hue taken out of it. The alphas are
 * still the measured ones — walking the tail's own column in the source crop
 * gives luminance 23 at the tip through 105 at the midpoint to 230 near the
 * head, over a background of 23 — but the chroma that carried them is gone, so
 * what is left is a grey scale running to white.
 *
 * The shape of the ramp is the point: it stays dim for the first half and does
 * almost all of its brightening in the last 30%. A linear fade reads as a
 * gradient; this reads as something incandescent at one end.
 */
.dark .tpz-light {
  --sp-trail: linear-gradient(
    to bottom,
    rgba(150, 150, 150, 0) 0%,
    rgba(150, 150, 150, 0.2) 25%,
    rgba(168, 168, 168, 0.34) 50%,
    rgba(186, 186, 186, 0.6) 70%,
    rgba(200, 200, 200, 0.86) 85%,
    rgba(208, 208, 208, 0.96) 94%,
    rgb(212, 212, 212) 100%
  );
  /* The same flank, in the material of this theme: the core's own ramp at a
     fifth of its weight, spread across five pixels instead of one. */
  --sp-flank: linear-gradient(
    to bottom,
    rgba(160, 160, 160, 0) 0%,
    rgba(160, 160, 160, 0.045) 35%,
    rgba(180, 180, 180, 0.09) 62%,
    rgba(196, 196, 196, 0.15) 84%,
    rgba(202, 202, 202, 0.18) 100%
  );
  --sp-core: rgb(214, 214, 214);
  --sp-halo: radial-gradient(
    circle,
    rgba(200, 200, 200, 0.1) 0%,
    rgba(178, 178, 178, 0.03) 40%,
    rgba(178, 178, 178, 0) 70%
  );
  --sp-rest: 0.22;
  --sp-halo-rest: 0.22;
}

.tpz-light-rail {
  position: absolute;
  top: 0;
  width: 0;
  height: 100%;
  /* The rail itself never moves. '--sp-dx' and '--sp-rot-h' are set on it only
     so they inherit down: the head and the leg behind it travel, while the leg
     left on the vertical rule stays at the corner. */
}

.tpz-light-trail-v,
.tpz-light-trail-h,
.tpz-light-flank-v,
.tpz-light-flank-h,
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
.tpz-light-trail-v,
.tpz-light-trail-h,
.tpz-light-flank-v,
.tpz-light-flank-h {
  height: ${TRAIL_BASE_PX}px;
  transform-origin: 50% 100%;
}

.tpz-light-trail-v,
.tpz-light-trail-h {
  width: 1px;
  margin-left: -0.5px;
  border-radius: 0.5px;
  background: var(--sp-trail);
}

/*
 * The flank: the same tail, nine pixels wide and feathered to nothing at its
 * edges, sitting behind the 1px core.
 *
 * This is what turns a stroke into a beam. A single hard-edged bar reads as a
 * drawn line whatever colour it is; a bright core inside a soft field reads as
 * something emitting, because that is the cross-section light actually has.
 * Two elements rather than one because the falloff runs across the width while
 * the fade runs along the length, and a background gradient only has one axis
 * — the alternative is 'filter: drop-shadow', which would re-rasterise on every
 * frame of every scroll as 'scaleY' changes the source it blurs.
 *
 * The mask is static, so it costs a mask layer once and nothing per frame.
 */
.tpz-light-flank-v,
.tpz-light-flank-h {
  width: 5px;
  margin-left: -2.5px;
  border-radius: 2.5px;
  background: var(--sp-flank);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 50%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, #000 50%, transparent 100%);
}

/*
 * The tail is two legs, not one bar, and that is the whole of following the
 * contour. A single bar rotated through the corner is a straight line at every
 * angle in between, so mid-turn it lifts off the frame and hangs diagonally
 * across the content. Split in two, the tail bends: one leg lies along the
 * bottom border behind the head, the other still stands on the vertical rule,
 * and their lengths trade off so the total stays constant as the head rounds
 * the corner.
 *
 * The vertical leg stays at the corner — no '--sp-dx' — and is what is left of
 * the tail that has not yet turned.
 */
.tpz-light-trail-v,
.tpz-light-flank-v {
  transform: translate3d(0, calc(var(--sp-y, 0px) - ${TRAIL_BASE_PX}px), 0)
    scaleY(calc(var(--sp-scale-v, 0) * var(--sp-dir, 1)));
  /* Dims as the head leaves it behind, so the corner is not left looking like a
     second head. */
  opacity: calc(var(--sp-on, 0) * var(--sp-remnant, 1));
}

.tpz-light-flank-v {
  opacity: calc(var(--sp-on, 0) * var(--sp-remnant, 1));
}

/*
 * The horizontal leg is pinned to the head and lies flat along the border. It
 * has a length only once the head has actually turned, so the angle is a fixed
 * quarter turn rather than something interpolated — there is no in-between
 * state to draw.
 */
.tpz-light-trail-h,
.tpz-light-flank-h {
  transform: translate3d(var(--sp-dx, 0px), calc(var(--sp-y, 0px) - ${TRAIL_BASE_PX}px), 0)
    rotate(var(--sp-rot-h, -90deg))
    scaleY(calc(var(--sp-scale-h, 0) * var(--sp-dir, 1)));
  opacity: var(--sp-on, 0);
}

/* The core. Small, and a silver rather than a white — see the palettes above
   for why the brightest value on the scale turned out to be the wrong one. */
.tpz-light-head {
  /* 1px — the rule's own width. Odd, so a half-pixel rail resolves it to whole
     pixels and it sits exactly on the line; 2px cannot be centred on a 1px rule
     at all, and 3px read as a bead on a thread. The head is the hot end of the
     tail rather than a separate dot, which is how the reference does it too. */
  width: 1px;
  height: 1px;
  margin-left: -0.5px;
  margin-top: -0.5px;
  border-radius: 50%;
  background: var(--sp-core);
  transform: translate3d(var(--sp-dx, 0px), var(--sp-y, 0px), 0)
    scale(calc(1 + var(--sp-flare, 0) * 0.9));
  /* Never fully off: this is the page's position marker before it is an
     animation, so it stays on the rail when nothing is moving. Reaches a full
     1 rather than stopping at 0.82, because the trail's last stop is opaque
     white and anything less left the head dimmer than the pixels immediately
     behind it — a tail with a cool tip, which is the one thing the ramp exists
     to avoid. */
  opacity: min(1, calc(var(--sp-rest) + var(--sp-on, 0) * 0.78));
}

/* A pre-blurred texture rather than 'filter: blur'. Blur on a moving element
   repaints the blurred region every frame; a radial gradient is something the
   compositor can just move. */
.tpz-light-halo {
  /* Small. A halo wide enough to be read as a disc is a second mark competing
     with the head instead of belonging to it — at 29px it was a grey coin
     sliding down the rule. This is close enough to the 1px core that the two
     read as one thing: a lit point with an edge, not a point inside a circle.
     It rests at 0.55 of this and only reaches full width on a flare, so the
     figure here is the largest it ever gets rather than its usual size. */
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  margin-top: -4.5px;
  border-radius: 50%;
  background: var(--sp-halo);
  transform: translate3d(var(--sp-dx, 0px), var(--sp-y, 0px), 0)
    scale(calc(0.55 + var(--sp-flare, 0) * 0.75));
  opacity: min(
    1,
    calc(
      var(--sp-rest) * var(--sp-halo-rest, 0.22) + var(--sp-on, 0) *
        (0.3 + var(--sp-flare, 0) * 0.7)
    )
  );
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
  /** x of the centre of each frame rule, relative to the root's left edge. */
  rails: readonly number[]
  /** Document y of every band boundary — the stops. */
  stops: readonly number[]
  /** Document y of the page's first and last edge, in document space. */
  bounds: readonly [number, number]
}

function measure(root: HTMLElement | null): Geometry {
  if (!root) return { rails: [], stops: [], bounds: [0, 0] }
  const rootBox = root.getBoundingClientRect()
  /*
   * Everything the host draws is positioned against the root, so the rails are
   * stored relative to it. In practice the root is full-bleed and this is zero,
   * but reading it means a root that ever gains a margin moves the light with
   * it rather than leaving it beside the rule. Rounded, so it cannot reintroduce
   * a fraction into the half-pixel below.
   */
  const originX = Math.round(rootBox.left)
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
    rails.push(Math.round(box.left) + 0.5 - originX, Math.round(box.right) - 0.5 - originX)
  }
  const stops = Array.from(root.querySelectorAll('section')).map(
    (section) => section.getBoundingClientRect().top + window.scrollY,
  )
  // Kept in document space so the per-frame conversion is a subtraction rather
  // than another layout read.
  const bounds: [number, number] = [
    rootBox.top + window.scrollY,
    rootBox.bottom + window.scrollY,
  ]
  return { rails, stops, bounds }
}

/**
 * Returns the ref to put on the page root. The host is found underneath it, so
 * the component owns its own markup and the page only lends its geometry.
 */
export function useScrollLight(): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
      /*
       * Two coordinates, and keeping them apart is the point. `headViewport` is
       * where on the screen the playhead should be; `headDocument` is the point
       * of the page it has landed on, which is what the stops are measured in
       * and what the host — being in the flow — actually draws against.
       */
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
      /*
       * Split the tail across the corner. Whatever length has already rounded
       * it lies along the bottom border behind the head; the remainder is still
       * standing on the vertical rule. The two always sum to the tail's length,
       * so it bends rather than stretching or snapping.
       */
      const travelled =
        geometry.rails.length === 2 ? Math.abs(centre - geometry.rails[0]) * pull : 0
      const alongBorder = Math.min(trail, travelled)
      const alongRule = Math.max(0, trail - travelled)
      host.style.setProperty('--sp-scale-h', (alongBorder / TRAIL_BASE_PX).toFixed(4))
      host.style.setProperty('--sp-scale-v', (alongRule / TRAIL_BASE_PX).toFixed(4))
      host.style.setProperty('--sp-remnant', trail > 0 ? (alongRule / trail).toFixed(3) : '1')

      for (const [i, rail] of railEls.entries()) {
        rail.style.setProperty('--sp-dx', `${((centre - geometry.rails[i]) * pull).toFixed(1)}px`)
      }

      /*
       * Root-relative, because the host is. It falls out of this that once the
       * head has parked on the bottom border this value stops changing at all,
       * so scrolling the footer writes nothing: the light is already welded to
       * the line and needs no help to stay there.
       */
      host.style.setProperty('--sp-y', `${(headDocument - topDoc).toFixed(1)}px`)
      // Sign survives the decay, so the trail keeps pointing the way the reader
      // was last travelling rather than snapping upright as it retracts.
      host.style.setProperty('--sp-dir', velocity < 0 ? '-1' : '1')
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
        // Fixed, not interpolated: the horizontal leg only exists once the head
        // has turned, so there is no intermediate angle to draw. The left rail
        // travels right and lays its leg to the left; the right rail mirrors.
        const mid = geometry.rails.length === 2 ? (geometry.rails[0] + geometry.rails[1]) / 2 : x
        rail.style.setProperty('--sp-rot-h', x < mid ? '-90deg' : '90deg')
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
  }, [])

  return rootRef
}

/** The two rails. Positions are written by the hook, which measures the frame. */
export function ScrollLight() {
  return (
    <div className="tpz-light" aria-hidden="true">
      {[0, 1].map((rail) => (
        <div key={rail} className="tpz-light-rail">
          <span className="tpz-light-halo" />
          <span className="tpz-light-flank-v" />
          <span className="tpz-light-flank-h" />
          <span className="tpz-light-trail-v" />
          <span className="tpz-light-trail-h" />
          <span className="tpz-light-head" />
        </div>
      ))}
    </div>
  )
}
