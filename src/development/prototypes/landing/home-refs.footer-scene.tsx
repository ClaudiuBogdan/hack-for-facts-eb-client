import cloudsFar from '@/assets/images/landing-footer-clouds-far.webp'
import cloudsFront from '@/assets/images/landing-footer-clouds-front.webp'
import cloudsNear from '@/assets/images/landing-footer-clouds-near.webp'
import range from '@/assets/images/landing-footer-range.webp'

/**
 * A drifting mountain horizon behind the footer.
 *
 * Four layers on one rule: everything repeats horizontally for ever, and the
 * only thing that separates them is how fast they move. The range does not move
 * at all, which is what makes it read as far away and fixed. Two cloud layers
 * pass *behind* it, nested among the peaks, and one passes *in front*, across
 * the slopes — and that one does most of the work. Clouds behind a mountain
 * only say the mountain is nearer than the sky, which the eye assumed anyway;
 * a cloud crossing the face of the range is the only thing on screen that says
 * where the front of the scene is.
 *
 * So the front layer is sparse and fast rather than dense and slow. A cloud
 * close enough to occlude a mountain is one you see one of at a time, and it
 * crosses quickly. It also has to be close to solid: it is the only
 * layer whose job is to *hide* something, and a cloud you can see a mountain
 * through is not in front of it.
 *
 * Nothing here is scroll-coupled — the two scroll lights already report
 * movement, and a third thing keyed to the scroll would be reporting it a third
 * time. This is weather. It happens whether or not you are doing anything.
 *
 * ## What was done to the source art
 *
 * Both files came in at 2172x724 with a great deal of empty space, and neither
 * could be tiled as it stood.
 *
 * **The range** was cropped to rows 342..591 of the original: the first row
 * carrying anything, down to the last *fully opaque* one. The four rows below
 * that are an antialiased hem, and left on they draw a pale line where the
 * range meets the floor of the footer. Its two vertical edges did not match —
 * 10.6 levels of mean difference, which reads as a visible join every time the
 * tile wraps — so the last 220px are cross-faded onto the first 220 in
 * premultiplied alpha, which costs 220px of width and buys a wrap that is
 * *smoother than the picture's own interior*: 1.46 levels across the join
 * against an interior mean of 2.93. The result is 1952x250 and tiles for ever.
 *
 * **The clouds** are one image cut into four pieces and dealt out three times. The
 * banks overlap horizontally the whole way across — there is not one empty
 * column in the source — so the cuts are at the three thinnest columns, which
 * carry 7, 12 and 27 covered pixels between them, and each cut edge is
 * feathered over 8px so what is severed reads as haze rather than as a tear.
 * The pieces are then laid out three times at different scales and in different
 * orders, which is what stops the layers ever settling into a pattern as they
 * slide past each other. The front strip takes only the two big banks, at 0.9
 * and 1580px apart in a 2900px tile — 20% covered, against roughly two thirds
 * for the layers behind. Every strip keeps transparent margins at both ends, so
 * none of them needs blending at all: nothing crosses the join.
 *
 * Encoded lossy at q88, which leaves alpha *exactly* intact — max error 0 —
 * and costs a mean of 1.8 to 2.6 levels of RGB. That matters more than it
 * sounds for pixel art: the silhouette is the whole shape of the thing, and it
 * is carried entirely by the alpha channel.
 */

/** Scene height. The range is drawn at the bottom of this, the clouds above. */
const SCENE_PX = 320

/**
 * Rendered size of each tile, and how long it takes to travel its own width.
 *
 * The two cloud rates are deliberately not a round ratio. At 90 and 150 seconds
 * the two layers realign every 450 seconds; at 90 and 180 they would realign
 * every three minutes and the pair would visibly repeat.
 */
const LAYERS = {
  far: { w: 1072, h: 110, bottom: 138, seconds: 150 },
  near: { w: 1466, h: 150, bottom: 86, seconds: 90 },
  range: { w: 1795, h: 230 },
  front: { w: 1714, h: 130, bottom: 110, seconds: 52 },
}

/**
 * The highest a cloud ever reaches, and the room the footer's text needs above
 * it.
 *
 * Derived rather than written down, because the first version was written down
 * and the copyright line ended up sitting on a white cloud on a white sky,
 * which is the one place in the scene with nothing to read against. The clouds
 * are set low enough to nest among the peaks — which is where clouds belong,
 * and what makes the range read as far away — and the footer is told how much
 * of itself to keep clear.
 */
export const FOOTER_SCENE_CLEAR_PX =
  Math.max(
    LAYERS.far.bottom + LAYERS.far.h,
    LAYERS.near.bottom + LAYERS.near.h,
    LAYERS.front.bottom + LAYERS.front.h,
  ) + 20

const CSS = `
.tpz-scene {
  /*
   * One number scales the whole vista. Every size below is a multiple of it,
   * including the distance each layer travels — the drift has to stay exactly
   * one tile wide or the loop stops being seamless, so it cannot be a constant
   * while the tile it is looping is not.
   */
  --tpz-scene-scale: 1;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(${SCENE_PX}px * var(--tpz-scene-scale));
  pointer-events: none;
  /* The layers are wider than the footer by one tile so they have somewhere to
     travel from. Without this they hang off the right edge and widen the page. */
  overflow: hidden;
}

/*
 * Sky, and it is not decoration.
 *
 * The clouds are white. On the light theme the page behind them is 252, so
 * without something to sit against they are invisible — the art would load, the
 * animation would run, and nothing would be on screen. This is the smallest
 * amount of colour that makes them exist: nothing at the top, a pale blue by
 * the time it reaches the ridge line, and it never touches the text above.
 */
.tpz-scene-sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(203, 220, 238, 0) 0%,
    rgba(203, 220, 238, 0.28) 46%,
    rgba(190, 212, 234, 0.55) 78%,
    rgba(184, 208, 232, 0.68) 100%
  );
}

/* Dark theme: the same gradient as a night sky rather than a day one. The
   range's own art is already a deep blue-green, so it needs less help here —
   what it needs is for the clouds to stop glaring, which the opacity below
   does. */
.dark .tpz-scene-sky {
  background: linear-gradient(
    to bottom,
    rgba(28, 44, 66, 0) 0%,
    rgba(28, 44, 66, 0.32) 46%,
    rgba(24, 40, 62, 0.6) 78%,
    rgba(20, 36, 58, 0.75) 100%
  );
}

.tpz-scene-layer {
  position: absolute;
  left: 0;
  background-repeat: repeat-x;
  background-position: left bottom;
  /* Pixel art, so it is scaled by whole pixels rather than resampled — the
     ridge line and the cloud edges are the whole style, and bilinear smoothing
     turns both into mush at anything other than 1:1. */
  image-rendering: pixelated;
  will-change: transform;
}

/*
 * Every layer travels exactly one tile width and starts again. Because the
 * background repeats, the frame at 100% is pixel-identical to the frame at 0%,
 * so the loop has no seam and needs no crossfade.
 */
@keyframes tpz-scene-drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(calc(var(--tpz-tile) * -1), 0, 0);
  }
}

.tpz-scene-clouds {
  animation: tpz-scene-drift var(--tpz-drift) linear infinite;
}

.tpz-scene-far {
  --tpz-tile: calc(${LAYERS.far.w}px * var(--tpz-scene-scale));
  --tpz-drift: ${LAYERS.far.seconds}s;
  bottom: calc(${LAYERS.far.bottom}px * var(--tpz-scene-scale));
  height: calc(${LAYERS.far.h}px * var(--tpz-scene-scale));
  width: calc(100% + var(--tpz-tile));
  background-image: url(${cloudsFar});
  background-size: var(--tpz-tile) calc(${LAYERS.far.h}px * var(--tpz-scene-scale));
  /* Further away, so paler and flatter. Depth here is opacity and speed rather
     than blur, which would cost a filter on a permanently animating element. */
  opacity: 0.55;
}

.tpz-scene-near {
  --tpz-tile: calc(${LAYERS.near.w}px * var(--tpz-scene-scale));
  --tpz-drift: ${LAYERS.near.seconds}s;
  bottom: calc(${LAYERS.near.bottom}px * var(--tpz-scene-scale));
  height: calc(${LAYERS.near.h}px * var(--tpz-scene-scale));
  width: calc(100% + var(--tpz-tile));
  background-image: url(${cloudsNear});
  background-size: var(--tpz-tile) calc(${LAYERS.near.h}px * var(--tpz-scene-scale));
  opacity: 0.8;
}

.dark .tpz-scene-far {
  opacity: 0.3;
}

.dark .tpz-scene-near {
  opacity: 0.42;
}

/*
 * In front of the range, and last in the file because that is what puts it
 * there. Set across the ridge line, so it cuts the skyline rather than
 * drifting under it or over it; quick, so it reads as the nearest thing in the
 * picture; and solid, because occlusion is the whole of what it is for.
 */
.tpz-scene-front {
  --tpz-tile: calc(${LAYERS.front.w}px * var(--tpz-scene-scale));
  --tpz-drift: ${LAYERS.front.seconds}s;
  bottom: calc(${LAYERS.front.bottom}px * var(--tpz-scene-scale));
  height: calc(${LAYERS.front.h}px * var(--tpz-scene-scale));
  width: calc(100% + var(--tpz-tile));
  background-image: url(${cloudsFront});
  background-size: var(--tpz-tile) calc(${LAYERS.front.h}px * var(--tpz-scene-scale));
  /* Solid enough to read as a cloud rather than as ground haze, which is what
     it looked like at half opacity eight pixels off the floor: it hugged the
     tree line and never touched a slope. It now sits at summit level — 110 to
     240 against a skyline that runs 124 to 165 — so it crosses the tops rather
     than the mid-slopes, which is where a cloud that near the viewer would
     actually be. At that height it has to be nearly as solid as the layers
     behind or the occlusion does not read. */
  opacity: 0.82;
}

.dark .tpz-scene-front {
  opacity: 0.5;
}

/*
 * The range. It does not move, and that is the point — it is the thing the
 * clouds are moving *against*, and a horizon that drifts is a horizon nobody
 * can read distance from.
 */
.tpz-scene-range {
  bottom: 0;
  height: calc(${LAYERS.range.h}px * var(--tpz-scene-scale));
  width: 100%;
  background-image: url(${range});
  background-size: calc(${LAYERS.range.w}px * var(--tpz-scene-scale))
    calc(${LAYERS.range.h}px * var(--tpz-scene-scale));
}

/* A phone gets the same vista at two thirds the size. Scaling rather than
   cropping, because the range is a silhouette and a cropped silhouette is a
   different shape. */
@media (max-width: 640px) {
  .tpz-scene {
    --tpz-scene-scale: 0.66;
  }
}

/*
 * The drift is the whole of the animation, so reduced motion stops it and keeps
 * the picture. Unlike the scroll lights, there is something worth looking at
 * here when nothing is moving.
 */
@media (prefers-reduced-motion: reduce) {
  .tpz-scene-clouds {
    animation: none;
  }
}
`

export function FooterSceneStyles() {
  return <style>{CSS}</style>
}

/**
 * Sits inside a `relative` footer. Everything is absolutely positioned against
 * it and nothing takes part in layout, so the footer's own text sets its height
 * and the range runs underneath whatever that turns out to be.
 */
export function FooterScene() {
  return (
    <div className="tpz-scene" aria-hidden="true">
      <div className="tpz-scene-sky" />
      <div className="tpz-scene-layer tpz-scene-clouds tpz-scene-far" />
      <div className="tpz-scene-layer tpz-scene-clouds tpz-scene-near" />
      <div className="tpz-scene-layer tpz-scene-range" />
      <div className="tpz-scene-layer tpz-scene-clouds tpz-scene-front" />
    </div>
  )
}

