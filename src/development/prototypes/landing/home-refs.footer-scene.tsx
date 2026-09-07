import { useEffect } from 'react'
import type { RefObject } from 'react'
import cloudsFar from '@/assets/images/landing-footer-clouds-far.webp'
import cloudsFront from '@/assets/images/landing-footer-clouds-front.webp'
import cloudsNear from '@/assets/images/landing-footer-clouds-near.webp'
import moon from '@/assets/images/landing-footer-moon.webp'
import range from '@/assets/images/landing-footer-range.webp'

/**
 * A drifting mountain horizon behind the footer.
 *
 * Four layers on one rule: everything repeats horizontally for ever, and the
 * only thing that separates them is how fast they move. The range does not
 * drift at all, and cannot be dragged either, which is what makes it read as
 * far away and fixed: it is the thing the clouds are measured against. Two cloud layers
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
 * The pieces are then laid out three times, and *every placement has its own
 * scale and its own handedness* — 0.40 to 1.00 across the twelve of them, half
 * of them mirrored. Dealing the same four shapes out at one scale per layer was
 * the first attempt and it read as four shapes repeating, because that is what
 * it was: the tile hides a repeat, but it cannot hide a silhouette you have
 * already seen at that size. A mirrored cloud at 0.42 is a different cloud.
 *
 * Sizes also carry depth within a layer, not only between layers. The front
 * strip stays the sparsest — 20% covered against about 28% behind — because a
 * cloud near enough to cross the summits is one you see one of at a time.
 *
 * Every strip keeps transparent margins at both ends, so none of them needs
 * blending at all: nothing crosses the join. Scaled down with Lanczos rather
 * than nearest, since CSS shrinks them again and two nearest passes turn a soft
 * cloud edge into a stair.
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
 * The three rates are deliberately not round ratios of each other. At the base
 * 52, 90 and 150 the pair behind realigns every 450 seconds and all three every
 * 39 minutes; at 60, 90 and 180 they would come back together every three
 * minutes and the sky would visibly repeat. `DRIFT_SCALE` stretches all three
 * by the same factor, so slowing the sky down leaves those periods intact
 * rather than collapsing them onto a common one.
 */
const LAYERS = {
  far: { w: 1072, h: 110, bottom: 138, seconds: 150 },
  near: { w: 1466, h: 150, bottom: 86, seconds: 90 },
  range: { w: 1795, h: 230 },
  front: { w: 1714, h: 130, bottom: 110, seconds: 52 },
}

/**
 * Two knobs over the whole sky, so the three layers can be moved and slowed
 * without disturbing what they are relative to each other.
 *
 * The heights above are what puts each layer where it belongs against the
 * range; this lifts the set of them off it. The seconds are what puts them in
 * depth order; this stretches all three by the same factor, which is the only
 * way to slow the sky down without changing which cloud is nearest.
 */
const CLOUD_LIFT_PX = 32
const DRIFT_SCALE = 2.5

type CloudLayer = { w: number; h: number; bottom: number; seconds: number }

const cloud = (layer: CloudLayer): CloudLayer => ({
  ...layer,
  bottom: layer.bottom + CLOUD_LIFT_PX,
  seconds: Math.round(layer.seconds * DRIFT_SCALE),
})

const FAR = cloud(LAYERS.far)
const NEAR = cloud(LAYERS.near)
const FRONT = cloud(LAYERS.front)

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
  Math.max(FAR.bottom + FAR.h, NEAR.bottom + NEAR.h, FRONT.bottom + FRONT.h) + 20

/**
 * The moon: size, and where it hangs.
 *
 * The art is 224px, which covers anything up to 112 here at device pixel ratio
 * 2, so the size can be tuned without re-encoding. 'top' is measured from the
 * top of the scene rather than the bottom like everything else in this file,
 * because what it has to stay clear of is the footer's text above it rather
 * than the ridge below.
 */
const MOON = { w: 76, h: 75, top: 0 } as const

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
  /*
   * The one thing on this page you can put your hands on. It sits under the
   * footer's own text, which carries 'z-10' and takes its own clicks, so this
   * only ever catches the sky between the links.
   *
   * 'pan-y' rather than 'none': a horizontal drag here is ours, a vertical one
   * still scrolls the page. Without it a thumb on the vista traps the reader at
   * the bottom of the document.
   */
  touch-action: pan-y;
  user-select: none;
  /* The layers are wider than the footer by two tiles so they have somewhere to
     travel from. Without this they hang off the right edge and widen the page.
     Two rather than one because the drift owns the first — see the width on the
     layers themselves, and 'write' in the hook, for why a dragged layer needs
     the second. */
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
/* Only over a cloud. The cursor is the only affordance a decorative thing gets,
   and one that promises a grab over empty sky is worse than none. */
.tpz-scene.is-over-cloud {
  cursor: grab;
}

.tpz-scene.is-grabbed {
  cursor: grabbing;
}

.tpz-scene-sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
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

/*
 * The moon, which only exists at night.
 *
 * 'display: none' rather than 'opacity: 0' or a JS check on the theme: it is
 * the one form of hiding that also means the browser never fetches the file, so
 * the light theme does not pay 17KB for a picture it will not draw. It also
 * keeps the whole thing declarative, which matters more here than it looks —
 * the theme class lands on the document element, so anything conditional in
 * JavaScript would have to agree with the server about the theme before
 * hydration, and CSS simply does not have that problem.
 *
 * Desktop only. On a phone the scene is already at two thirds and the sky band
 * above the ridge is a couple of centimetres; a moon in it is not atmosphere,
 * it is clutter.
 */
.tpz-scene-moon {
  position: absolute;
  /* At the very top of the scene, which is 20px higher than the band the
     footer keeps clear — see 'FOOTER_SCENE_CLEAR_PX'. That overlap is fine
     because it is 20px of glow at the far right, where the footer's own text
     ends well short; the constant is deliberately not grown for it, since it
     pads every theme and this picture only exists in one. */
  top: calc(${MOON.top}px * var(--tpz-scene-scale));
  /* Centred on the page. A negative margin rather than a translate, because
     'transform' on a static element is a composited layer for nothing. */
  left: 50%;
  margin-left: calc(${MOON.w}px * var(--tpz-scene-scale) / -2);
  width: calc(${MOON.w}px * var(--tpz-scene-scale));
  height: calc(${MOON.h}px * var(--tpz-scene-scale));
  background-image: url(${moon});
  background-repeat: no-repeat;
  /* The box is cut to the art's own 224x222, so this is exact rather than a fit. */
  background-size: 100% 100%;
  /* Not quite full strength. At 1 it is the brightest thing on the page by some
     margin and the eye goes to it before the ridge line; this leaves it clearly
     the light source without letting it become the subject. */
  opacity: 0.88;
  pointer-events: none;
  display: none;
}

.dark .tpz-scene-moon {
  display: block;
}

/* After the rule above, so it wins on equal specificity. */
@media (max-width: 640px) {
  .dark .tpz-scene-moon {
    display: none;
  }
}

.tpz-scene-layer {
  position: absolute;
  left: 0;
  background-repeat: repeat-x;
  background-position: left bottom;
  pointer-events: none;
  /*
   * 'translate' as well as 'transform', and they are doing different jobs.
   *
   * The drift is a CSS animation on 'transform'. The drag is JavaScript writing
   * 'translate'. They are separate properties that compose — translate applies
   * before transform — so a shove can be added to a running animation without
   * either one having to know about the other, and letting go leaves the
   * animation exactly where it was rather than restarting it.
   */
  will-change: transform, translate;
}

/*
 * Only the range is drawn by whole pixels.
 *
 * It is rendered at 1795 of its own 1952, which is near enough 1:1 that
 * nearest-neighbour keeps the ridge crisp — and the ridge line is the whole
 * style. The cloud strips are scaled down much harder, 0.56 to 0.69, and
 * nearest-neighbour on a downscale does not preserve pixels, it throws them
 * away: the dropped column changes as the layer drifts, so the edges crawl.
 * Smoothing is the right answer for anything shrinking.
 */
.tpz-scene-range {
  image-rendering: pixelated;
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
  --tpz-tile: calc(${FAR.w}px * var(--tpz-scene-scale));
  --tpz-drift: ${FAR.seconds}s;
  bottom: calc(${FAR.bottom}px * var(--tpz-scene-scale));
  height: calc(${FAR.h}px * var(--tpz-scene-scale));
  width: calc(100% + var(--tpz-tile) * 2);
  background-image: url(${cloudsFar});
  background-size: var(--tpz-tile) calc(${FAR.h}px * var(--tpz-scene-scale));
  /* Further away, so slightly the palest of the three. Depth here is opacity
     and speed rather than blur, which would cost a filter on a permanently
     animating element — but the spread between the layers is small now. Solid
     clouds with a little transparency read as weather; translucent ones read as
     a wash laid over the picture. */
  opacity: 0.85;
}

.tpz-scene-near {
  --tpz-tile: calc(${NEAR.w}px * var(--tpz-scene-scale));
  --tpz-drift: ${NEAR.seconds}s;
  bottom: calc(${NEAR.bottom}px * var(--tpz-scene-scale));
  height: calc(${NEAR.h}px * var(--tpz-scene-scale));
  width: calc(100% + var(--tpz-tile) * 2);
  background-image: url(${cloudsNear});
  background-size: var(--tpz-tile) calc(${NEAR.h}px * var(--tpz-scene-scale));
  opacity: 0.94;
}

.dark .tpz-scene-far {
  opacity: 0.5;
}

.dark .tpz-scene-near {
  opacity: 0.65;
}

/*
 * In front of the range, and last in the file because that is what puts it
 * there. Set across the ridge line, so it cuts the skyline rather than
 * drifting under it or over it; quick, so it reads as the nearest thing in the
 * picture; and solid, because occlusion is the whole of what it is for.
 */
.tpz-scene-front {
  --tpz-tile: calc(${FRONT.w}px * var(--tpz-scene-scale));
  --tpz-drift: ${FRONT.seconds}s;
  bottom: calc(${FRONT.bottom}px * var(--tpz-scene-scale));
  height: calc(${FRONT.h}px * var(--tpz-scene-scale));
  width: calc(100% + var(--tpz-tile) * 2);
  background-image: url(${cloudsFront});
  background-size: var(--tpz-tile) calc(${FRONT.h}px * var(--tpz-scene-scale));
  /* Solid enough to read as a cloud rather than as ground haze, which is what
     it looked like at half opacity eight pixels off the floor: it hugged the
     tree line and never touched a slope. It now sits at summit level — see
     'CLOUD_LIFT_PX' — so it crosses the tops rather
     than the mid-slopes, which is where a cloud that near the viewer would
     actually be. At that height it has to be nearly as solid as the layers
     behind or the occlusion does not read. */
  opacity: 0.97;
}

.dark .tpz-scene-front {
  opacity: 0.78;
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
 * The cloud layers you can take hold of, nearest first, with the strip each one
 * is drawn from.
 *
 * The range is not here on purpose. It is the horizon — the thing the clouds
 * are measured against — and a horizon you can shove is not one you can read
 * distance from. It also has no gaps, so "grab the cloud under the pointer"
 * would always end at the range and nothing else would ever be reachable.
 */
const GRABBABLE = [
  { selector: '.tpz-scene-front', src: cloudsFront, front: true },
  { selector: '.tpz-scene-near', src: cloudsNear, front: false },
  { selector: '.tpz-scene-far', src: cloudsFar, front: false },
] as const

/** Alpha above which a pixel of the strip counts as cloud rather than sky. */
const CLOUD_ALPHA = 40

/** Width the alpha map is sampled at. Enough to tell one cloud from the gap. */
const ALPHA_SAMPLES = 512

/**
 * Velocity left per frame once the reader lets go.
 *
 * The clouds do not spring back — where they end up is where they stay, which
 * is free because the strips repeat for ever. What decays is the *speed*, from
 * whatever the throw was down to the drift the CSS animation is already running
 * underneath. So letting go does not stop the sky, it hands it back.
 */
const THROW_DECAY = 0.94

/** Below this the throw is no longer worth a frame. */
const THROW_FLOOR_PX = 0.12

type Grabbable = {
  readonly element: HTMLElement
  /** Alpha of the strip, downsampled, so a pointer can be tested against it. */
  readonly alpha: { readonly w: number; readonly h: number; readonly data: Uint8Array }
  /** In front of the range, and so reachable even where the mountain is solid. */
  readonly front: boolean
  /** Rendered width of one repeat, and so the period the offset wraps on. */
  tile: number
  offset: number
  velocity: number
}

/**
 * Reads one layer's silhouette into an array the pointer can be tested against.
 *
 * Only the alpha channel, and only at 512 wide: the question is "is there a
 * cloud here", which the shape answers and the colour does not. A full-size RGBA
 * copy of three strips would be about nine megabytes to answer it.
 */
async function loadAlpha(src: string) {
  const image = new Image()
  image.src = src
  await image.decode()
  const w = Math.min(ALPHA_SAMPLES, image.naturalWidth)
  const h = Math.max(1, Math.round((image.naturalHeight * w) / image.naturalWidth))
  const canvas = new OffscreenCanvas(w, h)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0, w, h)
  const rgba = context.getImageData(0, 0, w, h).data
  const data = new Uint8Array(w * h)
  for (let i = 0; i < data.length; i += 1) data[i] = rgba[i * 4 + 3]
  return { w, h, data }
}

/**
 * Lets the reader take hold of one cloud and throw it.
 *
 * One cloud, not the sky: the layer that moves is the one with something under
 * the pointer, tested against its own silhouette rather than its bounding box —
 * which for a full-width repeating strip would be the whole footer and would
 * mean the front layer always won. Grab a gap and nothing happens, and the
 * cursor says so before you press.
 *
 * The drift stays a CSS animation throughout. This never pauses it, never reads
 * its progress and never restarts it: it writes `translate`, the drift owns
 * `transform`, and the browser composes the two. That is the whole reason a
 * throw can decay into the ambient drift without a seam — there is nothing to
 * blend, because the drift never stopped.
 */
export function useFooterScene(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const scene = root.querySelector<HTMLElement>('.tpz-scene')
    if (!scene) return

    let live = true

    /*
     * Stop the drift when the scene is not on screen.
     *
     * This buys nothing on any frame metric and it is not meant to: measured
     * against a paused arm, frame median, p95 and long-animation-frame count
     * were identical in every run of every series, and the cost while the
     * footer is *visible* came out below the noise floor. Anyone re-checking
     * this with a frame profiler will find it did nothing, and that is the
     * expected result — do not delete it on that basis.
     *
     * What it fixes is idleness. With the drift running the renderer's
     * Compositor and Viz threads tick at 60Hz drawing zero pixels; with the
     * clouds paused the compositor logged no tasks at all in 37 of 40 runs and
     * the display link sat at 0Hz in 45 of 48. This scene is the only thing on
     * the page that never stops — the scroll lights go quiet the moment you
     * stop scrolling — so it is the only thing keeping the page from reaching
     * true idle, which on a laptop is a battery cost rather than a frame one.
     *
     * Chromium already solves the far case: past about 2000px below the fold it
     * throttles the animation to ~7Hz on its own. What it leaves is the band
     * from the fold out to ~1800px, which on this page is most of the scroll
     * range. That band is all this observer is for.
     */
    const drifting = [...scene.querySelectorAll<HTMLElement>('.tpz-scene-clouds')]
    const onScreen = new IntersectionObserver(([entry]) => {
      if (!entry) return
      // Cleared rather than set to 'running', so the stylesheet stays in charge
      // — 'prefers-reduced-motion' turns the animation off entirely and an
      // inline 'running' would have nothing to say about it either way.
      const state = entry.isIntersecting ? '' : 'paused'
      for (const layer of drifting) layer.style.animationPlayState = state
    })
    onScreen.observe(scene)

    /**
     * Rendered width of one repeat of a layer's strip.
     *
     * `background-size` carries it, and it is a multiple of `--tpz-scene-scale`,
     * so it changes at the mobile breakpoint and nowhere else — which is why it
     * is cached and refreshed on resize rather than read per frame.
     */
    const tileOf = (element: HTMLElement) => {
      const tile = Number.parseFloat(getComputedStyle(element).backgroundSize)
      return Number.isFinite(tile) && tile > 0 ? tile : 0
    }

    /** Nearest first, so the topmost cloud under the pointer wins. */
    const layers: Grabbable[] = []

    /** The mountain's own silhouette, so it can block what passes behind it. */
    let rangeAlpha: Awaited<ReturnType<typeof loadAlpha>> = null
    let rangeElement: HTMLElement | null = null

    // The tile is the wrap period, so a stale one after a breakpoint change
    // would let the offset walk past the element's slack again.
    const resized = new ResizeObserver(() => {
      for (const layer of layers) layer.tile = tileOf(layer.element)
    })
    resized.observe(scene)
    let dragging: Grabbable | null = null
    let lastX = 0
    /** Movement seen since the last frame, so the writes stay one per frame. */
    let pending = 0
    let frame = 0

    /**
     * Which layer, if any, has a cloud under this point.
     *
     * `getBoundingClientRect` already carries the drift transform and the
     * layer's own offset, so the pointer maps into the strip without either
     * having to be tracked: x within the element, wrapped by the tile width,
     * scaled into the alpha map.
     */
    /**
     * Whether the mountain covers this point.
     *
     * Against the range's own silhouette rather than its box: the box is the
     * bottom 230px of the footer edge to edge, and most of that is sky between
     * peaks that a cloud behind is plainly visible through. The strip repeats,
     * so the pointer is wrapped by the tile before it is sampled — the same
     * arithmetic the cloud layers use.
     */
    const onRange = (clientX: number, clientY: number) => {
      if (!rangeAlpha || !rangeElement) return false
      const rect = rangeElement.getBoundingClientRect()
      const y = clientY - rect.top
      if (y < 0 || y >= rect.height) return false
      const tile = Number.parseFloat(getComputedStyle(rangeElement).backgroundSize)
      if (!Number.isFinite(tile) || tile <= 0) return false
      const within = (((clientX - rect.left) % tile) + tile) % tile
      const sx = Math.min(rangeAlpha.w - 1, Math.floor((within / tile) * rangeAlpha.w))
      const sy = Math.min(rangeAlpha.h - 1, Math.floor((y / rect.height) * rangeAlpha.h))
      return rangeAlpha.data[sy * rangeAlpha.w + sx] > CLOUD_ALPHA
    }

    const layerAt = (clientX: number, clientY: number) => {
      /* Computed at most once per test, and only if a layer behind the range is
         in the running at all. */
      let rock: boolean | null = null
      for (const layer of layers) {
        /*
         * The mountain blocks.
         *
         * Two of the three cloud layers pass behind it, and a cloud you cannot
         * see is not one you can take hold of — offering a grab over solid rock
         * reads as an invitation to drag the mountain, and dragging there moves
         * something hidden, which looks like the mountain moving. The range
         * itself was never in this list; that turned out not to be enough.
         */
        if (!layer.front) {
          rock ??= onRange(clientX, clientY)
          if (rock) continue
        }
        const rect = layer.element.getBoundingClientRect()
        const y = clientY - rect.top
        if (y < 0 || y >= rect.height) continue
        const tile = layer.tile
        if (tile <= 0) continue
        const x = clientX - rect.left
        const within = ((x % tile) + tile) % tile
        const sx = Math.min(layer.alpha.w - 1, Math.floor((within / tile) * layer.alpha.w))
        const sy = Math.min(layer.alpha.h - 1, Math.floor((y / rect.height) * layer.alpha.h))
        if (layer.alpha.data[sy * layer.alpha.w + sx] > CLOUD_ALPHA) return layer
      }
      return null
    }

    /**
     * Moves one layer, and keeps it over the scene while doing it.
     *
     * The wrap is not a nicety. A shove adds to `offset` and nothing ever took
     * it away again — the clouds do not spring back, which is the intended
     * behaviour — so a reader who keeps pushing the sky the way it is already
     * going walks the offset past a whole tile. The element is only the footer
     * plus two tiles wide, and at that point its right edge crosses into the
     * scene: everything beyond it has no background to paint, and the sky ends
     * in a straight vertical line with cloud on one side and nothing on the
     * other. It then stays that way for as long as the page is open, because
     * the offset is never reduced.
     *
     * The strip repeats every tile, so `offset` and `offset` plus a whole tile
     * are the same picture. Only one of them is in a position to be drawn.
     * Folding it back into (-tile, 0] every write costs a subtraction and means
     * the total displacement — this plus the drift's own, which the CSS keeps
     * within one tile — can never exceed the two tiles of slack the element
     * carries.
     */
    const write = (layer: Grabbable, dx: number) => {
      layer.offset += dx
      if (layer.tile > 0) {
        layer.offset -= Math.ceil(layer.offset / layer.tile) * layer.tile
      }
      layer.element.style.translate = `${layer.offset.toFixed(1)}px`
    }

    const step = () => {
      frame = 0
      let busy = false
      if (dragging) {
        if (pending !== 0) {
          write(dragging, pending)
          pending = 0
        }
        busy = true
      }
      // Every layer decays, not just the one in hand: a cloud thrown a moment
      // ago keeps going while the reader takes hold of another.
      for (const layer of layers) {
        if (layer === dragging || layer.velocity === 0) continue
        layer.velocity *= THROW_DECAY
        if (Math.abs(layer.velocity) < THROW_FLOOR_PX) {
          layer.velocity = 0
          continue
        }
        write(layer, layer.velocity)
        busy = true
      }
      if (busy) frame = requestAnimationFrame(step)
    }

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(step)
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const layer = layerAt(event.clientX, event.clientY)
      if (!layer) return
      dragging = layer
      layer.velocity = 0
      lastX = event.clientX
      pending = 0
      scene.setPointerCapture(event.pointerId)
      scene.classList.add('is-grabbed')
      schedule()
    }

    const onMove = (event: PointerEvent) => {
      if (!dragging) {
        // The cursor is the only affordance a decorative thing gets, so it has
        // to be honest about where the clouds actually are.
        scene.classList.toggle('is-over-cloud', layerAt(event.clientX, event.clientY) !== null)
        return
      }
      const dx = event.clientX - lastX
      lastX = event.clientX
      pending += dx
      // Exponentially smoothed, so the throw follows the gesture rather than
      // whichever single event happened to land last before the finger lifted.
      dragging.velocity = dragging.velocity * 0.7 + dx * 0.3
      schedule()
    }

    const onUp = (event: PointerEvent) => {
      if (!dragging) return
      if (pending !== 0) {
        write(dragging, pending)
        pending = 0
      }
      dragging = null
      scene.classList.remove('is-grabbed')
      if (scene.hasPointerCapture(event.pointerId)) {
        scene.releasePointerCapture(event.pointerId)
      }
      schedule()
    }

    void Promise.all([
      loadAlpha(range).then((alpha) => {
        rangeAlpha = alpha
      }),
      ...GRABBABLE.map(async ({ selector, src, front }) => {
        const element = scene.querySelector<HTMLElement>(selector)
        if (!element) return
        const alpha = await loadAlpha(src)
        if (!alpha || !live) return
        layers.push({ element, alpha, front, tile: tileOf(element), offset: 0, velocity: 0 })
      }),
    ]).then(() => {
      if (!live) return
      rangeElement = scene.querySelector<HTMLElement>('.tpz-scene-range')
      // Restored to the declared order: `Promise.all` settles in whatever order
      // the decodes finish, and this list is searched nearest-first.
      layers.sort(
        (a, b) =>
          GRABBABLE.findIndex((g) => a.element.matches(g.selector)) -
          GRABBABLE.findIndex((g) => b.element.matches(g.selector)),
      )
      scene.addEventListener('pointerdown', onDown)
      scene.addEventListener('pointermove', onMove)
      scene.addEventListener('pointerup', onUp)
      scene.addEventListener('pointercancel', onUp)
    })

    return () => {
      live = false
      onScreen.disconnect()
      resized.disconnect()
      scene.removeEventListener('pointerdown', onDown)
      scene.removeEventListener('pointermove', onMove)
      scene.removeEventListener('pointerup', onUp)
      scene.removeEventListener('pointercancel', onUp)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootRef])
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
      {/* Straight after the sky and before every cloud, which is what puts the
          weather in front of it. A moon the clouds passed behind would be a
          lamp hanging in the room. */}
      <div className="tpz-scene-moon" />
      <div className="tpz-scene-layer tpz-scene-clouds tpz-scene-far" />
      <div className="tpz-scene-layer tpz-scene-clouds tpz-scene-near" />
      <div className="tpz-scene-layer tpz-scene-range" />
      <div className="tpz-scene-layer tpz-scene-clouds tpz-scene-front" />
    </div>
  )
}

