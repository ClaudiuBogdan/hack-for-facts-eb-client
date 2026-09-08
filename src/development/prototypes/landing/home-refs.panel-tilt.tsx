import { useEffect, type RefObject } from 'react'

/**
 * The hero's entity panel as a separate pane, set at an angle in its own space.
 *
 * The hero is two columns from `lg` up: the headline, the search and the
 * shortcuts on the left, and this panel of real entities on the right. Flat, it
 * reads as another box in the same plane as the text — one more thing on the
 * page. Given a little depth it reads as what it is: a second surface, next to
 * the argument rather than part of it, holding the product itself.
 *
 * Three things, and the order matters because each hands to the next.
 *
 * **A resting angle.** The panel sits turned a few degrees about its vertical
 * axis inside a `perspective` its wrapper owns. The wrapper holds the
 * perspective rather than the panel writing `perspective()` into its own
 * transform, because the function form fixes the vanishing point to the
 * element's own centre and the property form uses the scene's — mixing the two
 * across a base rule and a keyframe makes the panel jump at the moment one
 * hands over to the other.
 *
 * **An entrance.** On load it swings in from a wider angle, pushed back in Z and
 * down, and settles onto the resting angle. This is CSS with no JavaScript in
 * the path: the panel is never left hidden by a script that failed to arrive,
 * which is the one thing DESIGN.md's motion rules will not have.
 *
 * It is worth being explicit that this animates something already on screen at
 * load, which the rest of this page deliberately does not — hero text is what a
 * reader came for and it is there in the first frame. The panel is navigation,
 * secondary to the headline beside it, and it is the only thing here that
 * moves. That is the argument for the exception; it is not a licence to start
 * animating the headline.
 *
 * **An unwind.** Scrolling down rotates the panel back toward flat, so it turns
 * to face the reader as they leave the hero. The angle is what the reader is
 * given for looking at the top of the page; by the time they are past it, the
 * pane has squared up.
 *
 * The three share one custom property, and that is what makes the handover
 * seamless rather than a snap. The entrance's final keyframe is written as
 * `rotateY(var(--tpz-tilt))`, not as a literal — `var()` in a keyframe resolves
 * at compute time, so if the reader scrolls *during* the entrance the animation
 * lands on wherever the scroll has since put the angle instead of on the value
 * that was correct when the page loaded.
 */

/**
 * Resting yaw, in degrees.
 *
 * The aim was derived first: measured at three viewport widths, the search
 * field sits 578px left of the panel's centre and 108px below it, and since the
 * frame is a fixed 1152px those offsets do not move with the window. Pointing
 * the panel's normal exactly at the field is a yaw of 26.7 degrees.
 *
 * This is short of that on purpose. At the full 26.7 the face is foreshortened
 * hard enough that the list stops being something you read and becomes
 * something you look at, and the panel's whole job is to be six real links.
 * What is kept is the direction — it still turns toward the search field rather
 * than toward the headline or the page — and what is given up is arriving there
 * exactly. Shipping mockup implementations sit in the same place for the same
 * reason, between 15 and 18 degrees where the text still has to be legible.
 *
 * Negative turns the panel's face toward the left column: its outer edge, at
 * the page margin, comes toward the reader and the inner edge falls away. Worth
 * stating because it is easy to get backwards from the transform alone, and it
 * was got backwards once: a surface that *faces* left is one whose right edge is
 * nearer, so the panel that looks like it is addressing the text is the one
 * leaning its far edge out at you.
 */
const REST_TILT_DEG = -18

/**
 * Depth of the scene.
 *
 * Reference points from shipping mockup implementations: about 1200px reads as
 * a physical device, 2400px as a product shot, 6400px as already near-parallel.
 * This sits at the device end because the panel is meant to be a window rather
 * than a diagram.
 *
 * It is also half of how strongly the angle reads — a smaller number is a
 * nearer viewer and a harsher foreshortening for the same degrees — so this and
 * the yaw are tuned against each other rather than in isolation.
 */
const PERSPECTIVE_PX = 1150

/**
 * How much wider the angle is at the start of the entrance than at rest.
 *
 * Lower than it was, because the resting angle is now much larger: the old 2.1
 * against this yaw would have started the panel at 56 degrees, which is not an
 * entrance but a card trick.
 */
const OPEN_FACTOR = 1.5

/**
 * Where the entrance starts, relative to where it lands.
 *
 * Back in Z, out toward the margin and slightly low, so it arrives like a pane
 * being set into place rather than a box fading up. The Z is the one that does
 * the work: with the scene's perspective it is what makes the panel read as
 * approaching rather than scaling.
 */
const FROM_X_PX = 34
const FROM_Y_PX = 18
const FROM_Z_PX = -110

const DURATION_MS = 780

/**
 * Delay before it starts.
 *
 * Short, and shorter than it first was. At 140ms the panel was simply absent
 * from a hero that is on screen at load — sampled frame by frame, nothing was
 * there at 140ms — and this easing already puts the panel almost fully in place
 * by a third of the duration, so the delay was most of what a reader would have
 * experienced as a wait. Enough that the first painted frame is still, and no
 * more than that.
 */
const DELAY_MS = 70
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Scroll distance over which the angle unwinds to flat.
 *
 * Roughly the height of the hero, so the pane finishes squaring up about when
 * the hero finishes leaving. Longer and the rotation is still running over
 * content that has nothing to do with it.
 */
const UNWIND_PX = 460

/**
 * Contact shadow, drawn on the panel itself.
 *
 * DESIGN.md is flat by default and reserves shadows for genuinely floating
 * layers, with no ambient or decorative shadows. A pane standing off the page
 * at an angle is the case that rule was describing without naming: a shadow is
 * what says it is off the surface rather than printed on it.
 *
 * Deliberately tight. A `box-shadow` is part of the element's own box and is
 * transformed along with it, so it can never read as a shadow cast onto the
 * page behind — it is depth attached to the card. That is the right tool for
 * the close contact shading and the wrong one for the cast shadow, which is
 * why there are two.
 */
const CONTACT_SHADOW = '-8px 12px 20px -14px rgb(15 23 42 / 0.28)'

/**
 * How long the panel takes to square up under the pointer.
 *
 * Long enough to be a movement rather than a switch, short enough that it has
 * finished before a reader who is reaching for a link gets there.
 */
const ALIGN_MS = 260

/**
 * The width at which the hero becomes two columns, and the angle means anything.
 *
 * In `rem`, and matching Tailwind's `lg` exactly, because half of this effect is
 * expressed in utilities on that breakpoint — the two-column grid, the title
 * bar, the corners — and half is in the stylesheet below. They have to flip on
 * the same query, not merely on queries that agree at the default font size.
 *
 * Tailwind v4's `--breakpoint-lg` is `64rem`, and `rem` in a media query
 * resolves against the *browser's default font size* rather than against
 * `html`. Written as `1024px` this detached for anyone who has changed that
 * setting: measured at a 20px default and an 1100px viewport, the px query
 * matched and the rem query did not, so the hero was one column with the chrome
 * hidden while the panel was still rotated 18 degrees and casting a shadow —
 * a full-width list tilted at a headline directly above it, which is the exact
 * thing this gate exists to prevent.
 */
const DESKTOP_QUERY = '(min-width: 64rem)'

/** Class on the wrapper that owns the perspective. */
export const TILT_SCENE_CLASS = 'tpz-tilt-scene'

/** Class on the panel that is actually turned. */
export const TILT_PANEL_CLASS = 'tpz-tilt-panel'

/**
 * Class on the cast shadow.
 *
 * A separate element rather than a bigger `box-shadow`, because the two are not
 * the same thing. A box-shadow belongs to the panel's box and is carried
 * through the panel's transform with it; a shadow lying on the page behind has
 * its own geometry and must not be rotated with the thing casting it. Every
 * mockup implementation worth reading does it this way for exactly that reason.
 */
export const TILT_SHADOW_CLASS = 'tpz-tilt-shadow'

/*
 * Note for anyone editing the stylesheet below: it is a template literal, so a
 * backtick anywhere inside it — including in a CSS comment — ends the string
 * and produces a syntax error several lines later. Use single quotes.
 */
const CSS = `
/*
 * Registered, so it can be interpolated.
 *
 * An unregistered custom property is a string to the animation engine and jumps
 * from one value to the other at the halfway point. Registered as an angle it
 * animates properly, which is what lets the entrance open the panel out and
 * close it again while the transform itself stays owned by the rule below.
 */
@property --tpz-tilt {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

/*
 * How much of the angle is applied: 1 at rest, 0 while the panel is being used.
 *
 * A separate multiplier rather than transitioning '--tpz-tilt' itself, and the
 * reason is the scroll handler. It writes the angle on every frame of the
 * unwind, and a transition on that property would make each of those writes an
 * animation — the panel would lag the scroll instead of tracking it. Splitting
 * the two means the angle stays instant and only the flattening eases.
 *
 * Inherited, so the cast shadow can read it too and soften as the panel comes
 * square: a pane lying flat against the page does not throw the shadow that one
 * standing at an angle does.
 */
@property --tpz-hover {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

/*
 * Hidden by default and shown only inside the desktop block below.
 *
 * Everything else here degrades to nothing below that width because it is a
 * transform or a perspective, and an element with neither is simply untouched.
 * The shadow is not: it is a real element, so without this it stays in the flow
 * on a phone as an unstyled empty div, in a layout that has no window for it to
 * be the shadow of.
 */
.${TILT_SHADOW_CLASS} {
  display: none;
}

/*
 * Only where the hero is two columns. Below that the panel is a full-width
 * block underneath the headline, and a pane angled toward a headline it sits
 * directly beneath is angled toward nothing — it just reads as a rendering
 * mistake.
 */
@media ${DESKTOP_QUERY} {
  /* The scene owns the perspective; the constant above says why this value. */
  .${TILT_SCENE_CLASS} {
    position: relative;
    perspective: ${PERSPECTIVE_PX}px;
    --tpz-hover: 1;
    transition: --tpz-hover ${ALIGN_MS}ms ${EASE};
  }

  /*
   * Squares up to face the reader when they are about to use it.
   *
   * 'focus-within' as well as ':hover', and not as an afterthought: the panel is
   * six links, and someone arriving at them by keyboard has exactly the same
   * problem the angle creates — a target that is foreshortened and set at a
   * slant. Leaving them tilted while flattening for the mouse would make the
   * angle a small tax paid only by people not using a pointer.
   */
  .${TILT_SCENE_CLASS}:hover,
  .${TILT_SCENE_CLASS}:focus-within {
    --tpz-hover: 0;
  }

  /*
   * The shadow the panel casts on the page, as its own element and its own
   * geometry: an ellipse under the panel, pushed toward the far edge and
   * blurred. It is not transformed with the panel, which is the whole point —
   * a cast shadow lies on the surface behind, not on the pane.
   */
  .${TILT_SHADOW_CLASS} {
    display: block;
    position: absolute;
    z-index: 0;
    /* Hover is inherited by ancestors from their descendants, and this one
       reaches past the panel on two sides — without this, waving the pointer
       through the empty space below and right of the panel would square it up
       for something the reader is not going anywhere near. */
    pointer-events: none;
    /*
     * Down and to the right, which puts the light source up and to the left —
     * the same direction the rest of the page is lit from, so the panel is not
     * the one object with its own sun.
     *
     * Offset clear of the panel's own bottom rather than tucked under it. A cast
     * shadow directly beneath its object reads as contact; pushed out from under
     * it, it reads as the object standing off a surface, which is the whole
     * reason this is an element and not a box-shadow.
     */
    left: 16%;
    right: -12%;
    bottom: -38px;
    height: 26%;
    border-radius: 50%;
    background: rgb(15 23 42 / 0.22);
    filter: blur(30px);
    /* Softens as the panel squares up: flat against the page, it should not
       still be throwing the shadow of something standing at an angle. */
    opacity: calc(0.35 + 0.65 * var(--tpz-hover));
    animation: tpz-shadow-in ${DURATION_MS}ms ${EASE} ${DELAY_MS}ms backwards;
  }

  .${TILT_PANEL_CLASS} {
    position: relative;
    z-index: 1;
    /*
     * The resting angle lives here rather than in a var() fallback. Once the
     * property is registered it always has a value — its initial-value — so a
     * fallback would never be reached.
     */
    --tpz-tilt: ${REST_TILT_DEG}deg;
    /*
     * Hinged on the edge nearest the reader, which is also the page's right
     * rule. About its own centre instead, the whole near edge sat 3.1px past
     * the column it lives in — nothing on its own, except that this page is
     * built on a visible lattice and every surface below the hero aligns to
     * that same rule, so an edge three pixels through it reads as a mistake
     * rather than as depth.
     *
     * The settled projection has no pitch, so the near edge lands on the rule
     * exactly — measured 0.0px. The other two put a little back and that is left
     * alone deliberately: 1.6px for the pitched version and 3.8px for the
     * sheared one. It is a different thing from the offset above. The yaw's was
     * the entire edge sitting off the rule; a pitch or a shear anchors that
     * edge's midpoint on it and swings only a corner forward. A corner of a
     * tilted pane projecting past the grid is what depth looks like; an edge
     * parallel to the grid and beside it is what a mistake looks like.
     */
    transform-origin: right center;
    box-shadow: ${CONTACT_SHADOW};
    animation: tpz-panel-in ${DURATION_MS}ms ${EASE} ${DELAY_MS}ms backwards;
  }

  /*
   * Two-point perspective: yawed about the vertical axis and nothing else.
   *
   * Chosen over two alternatives that were built and measured rather than
   * argued about, and are in the history rather than left behind as options.
   * Three-point added a pitch so the panel aimed at the search field vertically
   * as well as sideways — more literally correct, and it tilts the rows off
   * level, which on a panel whose entire content is six lines of text costs
   * more than the accuracy buys. A parallel projection with a cosine-corrected
   * shear read as drafted rather than photographed and sheared the text hardest
   * of the three.
   *
   * Two-point is also the only one whose near edge lands exactly on the page's
   * right rule, since a pitch and a shear each swing a corner forward past a
   * hinge that only the yaw respects.
   */
  .${TILT_PANEL_CLASS} {
    transform: rotateY(calc(var(--tpz-tilt) * var(--tpz-hover)));
  }

  /*
   * The entrance.
   *
   * It animates 'translate', 'opacity' and the angle — never 'transform', which
   * stays owned by the rule above. 'translate' is a separate property that
   * composes ahead of 'transform', so the two do not fight over one property.
   *
   * The closing angle is deliberately absent from the 'to' frame. A property
   * named in one keyframe and not the other interpolates toward the element's
   * underlying value, so the entrance lands on whatever the scroll handler has
   * since written rather than on the value that was correct at load — scroll
   * during the entrance and it arrives where it should, with no snap at the end.
   */
  @keyframes tpz-panel-in {
    from {
      opacity: 0;
      --tpz-tilt: ${(REST_TILT_DEG * OPEN_FACTOR).toFixed(2)}deg;
      translate: ${FROM_X_PX}px ${FROM_Y_PX}px ${FROM_Z_PX}px;
    }
    to {
      opacity: 1;
      translate: none;
    }
  }

  /*
   * The shadow arrives with the panel and only fades — it has no geometry of its
   * own to animate, and a shadow that slides is a light source moving.
   *
   * The closing opacity is deliberately absent, for the same reason the
   * entrance omits its closing angle: named explicitly, the animation would end
   * on a literal 1 and then drop to the underlying value in a single frame.
   * That is visible whenever the two disagree — reload with the pointer already
   * over the panel and the hover state has taken the underlying opacity to
   * 0.35, so the shadow would hold at full through the entrance and then snap.
   * Omitted, it interpolates to whatever the cascade currently says.
   */
  @keyframes tpz-shadow-in {
    from {
      opacity: 0;
    }
  }
}

/*
 * Flattened, not frozen at the resting angle. A list of links left permanently
 * skewed is the flourish with the movement taken out of it, which is not what
 * the preference asks for — it asks for the flourish to be gone. The hook makes
 * the same decision independently and never attaches its listener.
 */
@media (prefers-reduced-motion: reduce) {
  /*
   * Every property the rules above set, neutralised, at equal specificity and
   * later in source order — which is the only reason it wins.
   *
   * Worth stating because it silently failed once: while the transform was
   * keyed on an attribute selector, specificity (0,2,0), a bare class here at
   * (0,1,0) could not undo it and a media query adds nothing. The shadow went
   * away and the rotation stayed, for exactly the reader who asked for no
   * motion. Keep both selectors the same shape.
   */
  .${TILT_PANEL_CLASS} {
    animation: none;
    transform: none;
    translate: none;
    box-shadow: none;
  }

  .${TILT_SHADOW_CLASS} {
    display: none;
  }
}
`

/** Rendered on the server too, so the first paint already has it. */
export function PanelTiltStyles() {
  return <style>{CSS}</style>
}

/**
 * Turns the panel back toward flat as the page scrolls.
 *
 * Writes one custom property on the panel itself. Not on the root: a custom
 * property written on `:root` during scroll invalidates style for everything
 * that could read it, which on this page measured p95 frame time from 18.4ms to
 * 48.5ms. Written on the one element that reads it, it is free.
 *
 * Reads `scrollY` and nothing else — no `getBoundingClientRect` — so a scroll
 * frame costs no layout.
 */
export function usePanelTilt(panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const desktop = window.matchMedia(DESKTOP_QUERY)
    let frame = 0
    /** Last angle written. Writing an unchanged value still invalidates style. */
    let last = Number.NaN

    const paint = () => {
      frame = 0
      const progress = Math.min(1, Math.max(0, window.scrollY / UNWIND_PX))
      // Quantised to a tenth of a degree, which at this perspective is far
      // below anything a display can resolve, so the difference between two
      // writes is always a difference somebody could see.
      const tilt = Math.round(REST_TILT_DEG * (1 - progress) * 10) / 10
      if (tilt === last) return
      last = tilt
      panel.style.setProperty('--tpz-tilt', `${tilt}deg`)
    }

    // Cached rather than read per event. The check itself is needed — the
    // stylesheet ignores the angle below this width, and without it the
    // listener would run on every phone scroll to write a property nothing
    // reads. Caching is because a media query list can flush style to answer
    // 'matches' and a scroll event fires many times a frame. The measured gain
    // was smaller than that reasoning suggests: 348 CPU samples through one
    // pass of the unwind against 313, with the worst frame 17ms against 9ms.
    // Kept because it is free and strictly less work, not because it was the
    // bottleneck — there isn't one here.
    let active = desktop.matches

    const onScroll = () => {
      if (!active) return
      if (frame === 0) frame = requestAnimationFrame(paint)
    }

    const onBreakpoint = () => {
      active = desktop.matches
      if (active) paint()
      else panel.style.removeProperty('--tpz-tilt')
    }

    if (active) paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    desktop.addEventListener('change', onBreakpoint)

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      desktop.removeEventListener('change', onBreakpoint)
      panel.style.removeProperty('--tpz-tilt')
    }
  }, [panelRef])
}
