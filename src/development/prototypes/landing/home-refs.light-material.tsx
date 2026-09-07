/**
 * What the scroll lights are made of, as opposed to where they go.
 *
 * There are two lights on this page and there will not be a third: one rides
 * the frame rules and reports movement, the other traces the card of whichever
 * section you are reading and reports position. They are independent — separate
 * hooks, separate hosts, separate reasons to exist — but they are the same
 * *substance*, and that has to be true in one place rather than in two. The
 * palette here was retuned four times in an afternoon; a copy of it in the
 * second light would have been wrong by the end of the first hour.
 *
 * So this module owns the material: the grey scale, and the anatomy of the four
 * pieces every light is built from.
 *
 *   core   a 1px bar carrying the length ramp — the bright spine
 *   flank  a 5px feathered bar behind it — the shoulders
 *   head   a 1px dot at the leading end
 *   halo   a small radial texture behind the head
 *
 * What it deliberately does *not* own is transform and opacity. Those are the
 * path, and the path is the whole difference between the two lights: one runs
 * down a rule and turns a single corner, the other runs a closed circuit around
 * a box from its top centre back to its bottom centre. Every element here is
 * positioned at the origin of its host and left there, waiting to be moved.
 */

/** Goes on any light's host, so the custom properties below reach its parts. */
export const LIT_CLASS = 'tpz-lit'

/**
 * Unscaled height of a trail bar. Every leg of every light is this tall and
 * `scaleY`d down to the length it needs, because scaling a fixed box costs a
 * composite while animating `height` costs a layout.
 */
export const TRAIL_BASE_PX = 260

const MATERIAL_CSS = `
.${LIT_CLASS} {
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

/*
 * Dark theme: the reference's ramp with the hue taken out of it. The alphas are
 * still the measured ones — walking the tail's own column in the source crop
 * gives luminance 23 at the tip through 105 at the midpoint to 230 near the
 * head, over a background of 23 — but the chroma that carried them is gone, so
 * what is left is a grey scale running to silver.
 *
 * The shape of the ramp is the point: it stays dim for the first half and does
 * almost all of its brightening in the last 30%. A linear fade reads as a
 * gradient; this reads as something incandescent at one end.
 */
.dark .${LIT_CLASS} {
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

/* Every part starts at its host's origin. Nothing here says where it goes. */
.tpz-lit-core,
.tpz-lit-flank,
.tpz-lit-head,
.tpz-lit-halo {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform, opacity;
}

/* Both bars hang *above* their origin and scale from the bottom edge, so the
   leading end stays put while the tail lengthens behind it. */
.tpz-lit-core,
.tpz-lit-flank {
  height: ${TRAIL_BASE_PX}px;
  transform-origin: 50% 100%;
}

.tpz-lit-core {
  width: 1px;
  margin-left: -0.5px;
  border-radius: 0.5px;
  background: var(--sp-trail);
}

/*
 * The flank: the same tail, five pixels wide and feathered to nothing at its
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
.tpz-lit-flank {
  width: 5px;
  margin-left: -2.5px;
  border-radius: 2.5px;
  background: var(--sp-flank);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 50%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, #000 50%, transparent 100%);
}

/* The core's leading end. Small, and a silver rather than a white — see the
   palettes above for why the brightest value on the scale was the wrong one. */
.tpz-lit-head {
  /* 1px — a rule's own width. Odd, so a half-pixel rail resolves it to whole
     pixels and it sits exactly on the line; 2px cannot be centred on a 1px rule
     at all, and 3px read as a bead on a thread. */
  width: 1px;
  height: 1px;
  margin-left: -0.5px;
  margin-top: -0.5px;
  border-radius: 50%;
  background: var(--sp-core);
}

/* A pre-blurred texture rather than 'filter: blur'. Blur on a moving element
   repaints the blurred region every frame; a radial gradient is something the
   compositor can just move. */
.tpz-lit-halo {
  /* Small. A halo wide enough to be read as a disc is a second mark competing
     with the head instead of belonging to it — at 29px it was a grey coin
     sliding down the rule. This is close enough to the 1px core that the two
     read as one thing: a lit point with an edge, not a point inside a circle.
     Both lights rest at a fraction of this and only reach full width on a
     flare, so the figure here is the largest it ever gets. */
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  margin-top: -4.5px;
  border-radius: 50%;
  background: var(--sp-halo);
}
`

/**
 * Rendered once by the page, above both lights' own stylesheets.
 *
 * A plain style element rather than an addition to `src/index.css`, which a
 * prototype may not touch. Server-rendered too, so the first paint has it.
 */
export function LightMaterialStyles() {
  return <style>{MATERIAL_CSS}</style>
}
