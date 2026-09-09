import type { CSSProperties, ReactNode } from 'react'
import orbit from '@/assets/images/people/orbit.svg'
import dashes from '@/assets/images/people/dashes.svg'
import { cn } from '@/lib/utils'
import { PICTURE_ATTR, PICTURE_STATE_ATTR } from './home-refs.image-reveal'
import { ShardBackdrop, type ShardCut } from './home-refs.shards'

/**
 * The people band's art, as a stack rather than a picture.
 *
 * Each piece — the shard backdrop, the orbit round the founder's chest, the
 * dashes at his sleeve — is a separate SVG layer, so each can move independently.
 * The portrait remains a raster cut-out from `scripts/build-people-art.py`.
 *
 * Two collages, one mechanism. The founder keeps the vocabulary his portrait was
 * made with — orbit and dashes over the backdrop — and the angels take the
 * backdrop alone, which is the same language at a lighter weight. The receipt
 * that used to hang at his shoulder is gone; `receipt` is no longer referenced.
 */

type Placement = {
  readonly key: string
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
}

type PictureLayer = Placement & {
  readonly src: string
  /** The art's own pixels, for the `img` attributes. */
  readonly width: number
  readonly height: number
}

/** The shared inline SVG backdrop. The foreground layers use SVG files. */
type ShardLayer = Placement & { readonly shards: true }

type Layer = PictureLayer | ShardLayer

const isShards = (layer: Layer): layer is ShardLayer => 'shards' in layer

const FOUNDER_LAYERS: readonly Layer[] = [
  { key: 'shards', shards: true, left: 3, top: 0, size: 94, depth: -1, z: 0 },
  /* Low enough to ring the chest. Higher up it crossed the chin, which reads
     as a scratch on the photograph rather than as an object in front of it. */
  { key: 'orbit', src: orbit, width: 520, height: 334,
    left: -3, bottom: 2, size: 68, depth: 1.4, z: 20 },
  { key: 'dashes', src: dashes, width: 420, height: 110,
    left: 57, bottom: 20, size: 42, depth: 2.4, z: 20 },
]

const ANGEL_LAYERS: readonly Layer[] = [
  /*
   * The same shard backdrop the founder stands against, so the three tiers share
   * one visual language rather than one of them being a different kind of
   * picture. It is the tallest asset in the set against the squarest box, so it
   * runs narrower here than it does behind him.
   *
   * There were wings and a halo here, revealed on hover — the joke in "îngeri
   * păzitori" made literal. They are gone: `wings` and `halo` are no longer
   * referenced by anything, and the hold-until-hover machinery went with them,
   * because a mechanism kept for one absent caller is a mechanism nobody
   * maintains.
   */
  { key: 'shards', shards: true, left: 10, top: -2, size: 82, depth: -1, z: 0 },
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

function LayerPicture({ layer }: { readonly layer: PictureLayer }) {
  return (
    <img
        src={layer.src}
        alt=""
        width={layer.width}
        height={layer.height}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        draggable={false}
        className="tpz-layer block h-auto w-full select-none"
      />
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
  cut,
  className,
}: {
  readonly variant: 'founder' | 'angel'
  /** Which cut of the backdrop this person stands against. */
  readonly cut?: ShardCut
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
         still without a photograph is left with nothing to wait for. */
      {...(portrait === undefined ? {} : { [PICTURE_ATTR]: '' })}
      className={cn('tpz-collage relative isolate', className)}
    >
      {layers.map((layer) => (
        <div key={layer.key} className="absolute" style={layerStyle(layer)}>
          {isShards(layer) ? (
            <ShardBackdrop cut={cut} className="tpz-layer select-none" />
          ) : (
            <LayerPicture layer={layer} />
          )}
        </div>
      ))}
      {/* The wrapper carries the cast shadow and the hover lift; the image
          inside it is left to the reveal hook, which owns its filter. */}
      <div className="tpz-cast absolute" style={slot}>
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
 * observer. The props are held a beat behind the face — a prop that lands before
 * the person it belongs to reads as a separate object that happens to be
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
  /*
   * And not the phone's closer crop either. The hook's CSS multiplies a
   * viewport factor of 1.16 into every '.tpz-pic-img' below 40rem, which is
   * right for a group picture in a cell that clips and wrong for a portrait
   * whose box is the collage: measured at 390 the founder rendered 390 by 471
   * in a 336 by 406 slot, ran 20px past the frame on both sides and 32px over
   * his own name. Both factors are pinned to 1 here at the same specificity
   * that pins the layout, so the slot decides the size on every screen.
   */
  --tpz-pic-zoom-base: 1;
  --tpz-pic-zoom-viewport: 1;
}

/*
 * The person casts onto the backdrop behind them.
 *
 * On the wrapper, not on the image, and that is not a preference. The picture
 * reveal owns 'filter' on '.tpz-pic-img' — it animates a blur out as the
 * portrait arrives — and its selector carries the state attribute, so it wins on
 * specificity. A shadow declared on the image was simply not applied at rest:
 * the computed value read 'blur(0px)'. Filters on nested elements compose rather
 * than compete, so the image resolves its own blur and the wrapper casts the
 * result.
 *
 * 'drop-shadow' follows the alpha, so it is the silhouette that casts and not a
 * rectangle — the whole reason it is this and not 'box-shadow'. It paints under
 * the portrait and over the shards, because those are two elements and the
 * portrait is the higher one; that is what separates the person from the facets
 * instead of leaving them pasted flat against each other.
 *
 * 'DESIGN.md' §Property budget puts blur outside the free list and asks for
 * radii at or under 8. This is over that, deliberately: at 8 the shadow did not
 * read against the darker facets. It is one element per collage and static at
 * rest, so it rasterises once and is cached; the only time it re-runs is the
 * hover transition.
 */
.tpz-collage .tpz-cast {
  filter: drop-shadow(10px 14px 12px rgb(2 6 23 / 0.55));
  transform-origin: 50% 100%;
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tpz-collage .tpz-layer {
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* The props arrive with the block, a beat after the face. */
[${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='pending'] .tpz-layer:not(.tpz-pic-img) {
  opacity: 0;
  translate: 0 14px;
  scale: 0.97;
}

[${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='shown'] .tpz-layer:not(.tpz-pic-img) {
  opacity: 1;
  translate: 0 0;
  scale: 1;
  transition:
    opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--tpz-pic-delay, 0ms) + 160ms),
    translate 700ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--tpz-pic-delay, 0ms) + 160ms),
    scale 700ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--tpz-pic-delay, 0ms) + 160ms),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .tpz-collage:hover .tpz-layer {
    transform: translate3d(
      calc(var(--tpz-depth, 0) * 5px),
      calc(var(--tpz-depth, 0) * -4px),
      0
    );
  }

  /*
   * Hovering lifts the person off the backdrop.
   *
   * Three things move together, which is what makes it read as depth rather
   * than as three separate animations: the portrait grows a little, its shadow
   * travels further and darkens, and the shards behind it slide the other way.
   * A shadow that changed direction under the pointer would read as a second
   * light source, so it is the same shadow further out.
   *
   * The scale is on the wrapper and the parallax is on the image inside it, so
   * neither has to know about the other. Origin at the foot: a bust that grows
   * from its centre floats, and one that grows from its base steps forward.
   *
   * (Backticks are a syntax error in this block, not a style choice: the whole
   * thing is a template literal.)
   */
  .tpz-collage:hover .tpz-cast {
    transform: scale(1.045);
    filter: drop-shadow(16px 22px 15px rgb(2 6 23 / 0.6));
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

  /* The cast shadow stays. It is depth, not motion, and reduce asks for the
     flourish to go rather than for the picture to flatten. */
  .tpz-collage .tpz-cast {
    transform: none;
    transition: none;
    filter: drop-shadow(10px 14px 12px rgb(2 6 23 / 0.55));
  }
}
`}</style>
  )
}
