import type { CSSProperties, ReactNode } from 'react'
import shards from '@/assets/images/people/shards.webp'
import shardsAvif from '@/assets/images/people/shards.avif'
import receipt from '@/assets/images/people/receipt.webp'
import receiptAvif from '@/assets/images/people/receipt.avif'
import orbit from '@/assets/images/people/orbit.webp'
import orbitAvif from '@/assets/images/people/orbit.avif'
import dashes from '@/assets/images/people/dashes.webp'
import dashesAvif from '@/assets/images/people/dashes.avif'
import wings from '@/assets/images/people/wings.webp'
import wingsAvif from '@/assets/images/people/wings.avif'
import halo from '@/assets/images/people/halo.webp'
import haloAvif from '@/assets/images/people/halo.avif'
import { cn } from '@/lib/utils'
import { PICTURE_ATTR, PICTURE_STATE_ATTR } from './home-refs.image-reveal'

/**
 * The people band's art, as a stack rather than a picture.
 *
 * Each piece — the shards behind the founder, the receipt at his shoulder, the
 * wings behind an angel, the halo over their head — is its own file and its own
 * element. That costs a handful of requests the flat composite did not, and buys
 * the only thing a flat composite can never give: the pieces can move
 * separately. `scripts/build-people-art.py` produces them.
 *
 * Two collages, one mechanism. The founder keeps the vocabulary his portrait was
 * made with; the angels get the wings and the halo, which is the whole joke of
 * calling them îngeri păzitori and the reason those two assets exist.
 */

type Layer = {
  readonly key: string
  readonly webp: string
  readonly avif: string
  /** The art's own pixels, for the `img` attributes. */
  readonly width: number
  readonly height: number
  /** Placement, as a share of the box — so 254px and 380px share one spec. */
  readonly left: number
  readonly top?: number
  readonly bottom?: number
  readonly size: number
  /**
   * How far this piece travels when the collage is hovered, in the same units
   * for every layer. Negative moves against the pointer, which is what makes a
   * flat stack read as having depth: the things behind lag, the things in front
   * lead.
   */
  readonly depth: number
  /** Draw order. The portrait is 10; behind is below, in front is above. */
  readonly z: number
  /** Absent at rest, revealed when the collage is hovered. */
  readonly hover?: boolean
}

const FOUNDER_LAYERS: readonly Layer[] = [
  { key: 'shards', webp: shards, avif: shardsAvif, width: 760, height: 931,
    left: 3, top: 0, size: 94, depth: -1, z: 0 },
  /* Low enough to ring the chest. Higher up it crossed the chin, which reads
     as a scratch on the photograph rather than as an object in front of it. */
  { key: 'orbit', webp: orbit, avif: orbitAvif, width: 520, height: 334,
    left: -3, bottom: 2, size: 68, depth: 1.4, z: 20 },
  { key: 'receipt', webp: receipt, avif: receiptAvif, width: 380, height: 525,
    left: -2, top: 30, size: 33, depth: 2, z: 20 },
  { key: 'dashes', webp: dashes, avif: dashesAvif, width: 420, height: 110,
    left: 57, bottom: 20, size: 42, depth: 2.4, z: 20 },
]

const ANGEL_LAYERS: readonly Layer[] = [
  /*
   * The same shard backdrop the founder stands against, so the three tiers share
   * one visual language rather than one of them being a different kind of
   * picture. It is the tallest asset in the set against the squarest box, so it
   * runs narrower here than it does behind him.
   */
  { key: 'shards', webp: shards, avif: shardsAvif, width: 760, height: 931,
    left: 10, top: -2, size: 82, depth: -1, z: 0 },
  /*
   * Wings and halo are the joke, and a joke told once is enough — at rest these
   * are four people, and only when you reach for one do they become îngeri
   * păzitori. The wings sit behind the portrait so they open from behind the
   * shoulders rather than landing on top of them.
   */
  { key: 'wings', webp: wings, avif: wingsAvif, width: 620, height: 499,
    left: -6, top: 16, size: 112, depth: -1.8, z: 5, hover: true },
  { key: 'halo', webp: halo, avif: haloAvif, width: 340, height: 120,
    left: 30, top: -1, size: 40, depth: 1.8, z: 20, hover: true },
]

/** Where the person stands in their own collage. */
const FOUNDER_PORTRAIT_SLOT: CSSProperties = { left: '2%', bottom: 0, width: '96%', zIndex: 10, ['--tpz-depth' as string]: 0.6 }
/*
 * Anchored at the foot, because the generated set is all one shape — 520 wide by
 * about 625 — so the feet line up and the heads follow. A set framed on the face
 * instead would want the opposite.
 */
const ANGEL_PORTRAIT_SLOT: CSSProperties = { left: '11%', bottom: 0, width: '78%', zIndex: 10, ['--tpz-depth' as string]: 0.6 }

/**
 * The layer's own box.
 *
 * Width is a share of the collage and the height follows from the art's ratio,
 * so a layer never needs a second number kept in step with the first.
 */
function layerStyle(layer: Layer): CSSProperties {
  return {
    left: `${layer.left}%`,
    top: layer.top === undefined ? undefined : `${layer.top}%`,
    bottom: layer.bottom === undefined ? undefined : `${layer.bottom}%`,
    width: `${layer.size}%`,
    zIndex: layer.z,
    ['--tpz-depth' as string]: layer.depth,
  }
}

function LayerPicture({ layer }: { readonly layer: Layer }) {
  return (
    <picture>
      <source type="image/avif" srcSet={layer.avif} />
      <img
        src={layer.webp}
        alt=""
        width={layer.width}
        height={layer.height}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        draggable={false}
        className={cn(
          'tpz-layer block h-auto w-full select-none',
          /* On the image, not on its wrapper: every rule that holds these back
             or lets them in selects '.tpz-layer', and a class on the div would
             never be matched by any of them. */
          layer.hover === true && 'tpz-layer-held',
        )}
      />
    </picture>
  )
}

/**
 * One person's art.
 *
 * The cell is the same `[data-picture]` block the single-image version used, so
 * `usePictureReveal` still owns the arrival and nothing about the hook changed.
 * It waits on one image — `block.querySelector('.tpz-pic-img')` — which is the
 * portrait, deliberately: the props are decoration and are not worth holding the
 * face for. They ride the same `data-pic-state` the hook sets, on their own
 * stagger.
 */
export function PersonCollage({
  variant,
  portrait,
  fallback,
  className,
}: {
  readonly variant: 'founder' | 'angel'
  readonly portrait?: { readonly webp: string; readonly avif?: string; readonly width: number; readonly height: number }
  /** Drawn in the portrait's slot when there is no cut-out yet. */
  readonly fallback?: ReactNode
  readonly className?: string
}) {
  /*
   * No photograph, no props. The shard backdrop is vivid enough to carry a cell
   * on its own, and behind the pale silhouette it read as a picture that had
   * failed to load rather than as a seat nobody has sat in yet. An empty seat
   * should be quiet.
   */
  const layers = portrait === undefined ? [] : variant === 'founder' ? FOUNDER_LAYERS : ANGEL_LAYERS
  const slot = variant === 'founder' ? FOUNDER_PORTRAIT_SLOT : ANGEL_PORTRAIT_SLOT

  return (
    <div
      /* Only a real image gets the reveal attribute. The hook waits on
         '.tpz-pic-img' and there is none without one, so marking the cell would
         be asking it to wait for something that will never arrive. An angel
         still without a photograph shows their wings and halo immediately. */
      {...(portrait === undefined ? {} : { [PICTURE_ATTR]: '' })}
      className={cn('tpz-collage relative isolate', className)}
    >
      {layers.map((layer) => (
        <div key={layer.key} className="absolute" style={layerStyle(layer)}>
          <LayerPicture layer={layer} />
        </div>
      ))}
      <div className="absolute" style={slot}>
        {portrait === undefined ? (
          fallback
        ) : (
          <picture>
            <source type="image/avif" srcSet={portrait.avif ?? portrait.webp} />
            <img
              src={portrait.webp}
              alt=""
              width={portrait.width}
              height={portrait.height}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={false}
              className="tpz-pic-img tpz-layer block h-auto w-full select-none"
            />
          </picture>
        )}
      </div>
    </div>
  )
}

/**
 * Arrival and hover, for the layers the reveal hook does not itself touch.
 *
 * The hook's own CSS covers `.tpz-pic-img`; this covers everything else in the
 * stack, keyed off the same attribute so there is one state and no second
 * observer. The props are held a beat behind the face — a receipt that lands
 * before the person it belongs to reads as a separate object that happens to be
 * nearby.
 *
 * Hover writes `transform` and the arrival writes `translate` and `scale`.
 * `DESIGN.md` §Property budget: those are separate properties that compose, so
 * the two never argue — a piece can still be arriving while the pointer moves
 * over it, and both are compositor-only.
 *
 * The shadow is `drop-shadow` and not `box-shadow`, which would draw a rectangle
 * around a cut-out. It is the one thing here outside the free list, so it is on
 * one layer — the silhouette, which is the only one whose shadow reads — and
 * only while hovered.
 */
export function PeopleArtStyles() {
  return (
    <style>{`
/*
 * The portrait keeps '.tpz-pic-img' because that is the selector the reveal hook
 * waits on — 'block.querySelector(".tpz-pic-img")', then 'img.decode()'. It does
 * not keep that class's *layout*: the hook's CSS pins it 'absolute; inset: 0;
 * height: 100%', which is right for a picture that fills a cell and wrong for a
 * layer whose own box is a share of the collage. Pinned, the layer's div has no
 * height and the face renders at zero pixels. Two classes beat one, so this
 * wins without touching the hook.
 */
.tpz-collage .tpz-pic-img {
  position: static;
  inset: auto;
  width: 100%;
  height: auto;
}

.tpz-collage .tpz-layer {
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tpz-collage .tpz-pic-img {
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

/*
 * Held layers are out of the arrival entirely — they are not late, they are
 * absent. 'opacity' and 'scale' are theirs alone, which is why the entrance
 * rules below exclude them: two owners of one property is the bug that always
 * shows up on the frame where both are mid-transition.
 */
.tpz-collage .tpz-layer-held {
  opacity: 0;
  scale: 0.92;
  transition:
    opacity 260ms cubic-bezier(0.22, 1, 0.36, 1),
    scale 380ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* The props arrive with the block, a beat after the face. */
[${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='pending'] .tpz-layer:not(.tpz-pic-img):not(.tpz-layer-held) {
  opacity: 0;
  translate: 0 14px;
  scale: 0.97;
}

[${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='shown'] .tpz-layer:not(.tpz-pic-img):not(.tpz-layer-held) {
  opacity: 1;
  translate: 0 0;
  scale: 1;
  transition:
    opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--tpz-pic-delay, 0ms) + 160ms),
    translate 700ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--tpz-pic-delay, 0ms) + 160ms),
    scale 700ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--tpz-pic-delay, 0ms) + 160ms),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .tpz-collage:hover .tpz-layer-held,
  .tpz-collage:focus-within .tpz-layer-held {
    opacity: 1;
    scale: 1;
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .tpz-collage:hover .tpz-layer {
    transform: translate3d(
      calc(var(--tpz-depth, 0) * 5px),
      calc(var(--tpz-depth, 0) * -4px),
      0
    );
  }

  .tpz-collage:hover .tpz-pic-img {
    filter: drop-shadow(0 18px 22px rgb(0 0 0 / 0.18));
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Nothing is ever hidden, and nothing moves. The hook does not arm under
     reduce, so 'pending' is never applied — this is the other half of that,
     stated independently, per DESIGN.md's third rule. */
  .tpz-collage .tpz-layer,
  [${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='pending'] .tpz-layer:not(.tpz-pic-img) {
    opacity: 1;
    translate: 0 0;
    scale: 1;
    transform: none;
    transition: none;
  }

  /* Held layers still appear on hover under reduce — the wings are content of a
     sort, not a flourish — they simply appear rather than growing into place. */
  .tpz-collage .tpz-layer-held {
    transition: none;
    scale: 1;
  }
}
`}</style>
  )
}
