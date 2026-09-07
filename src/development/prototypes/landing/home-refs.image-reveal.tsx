import { useEffect } from 'react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'

/**
 * How the illustrations arrive.
 *
 * Everything else on this page arrives through `home-refs.reveal.tsx` — opacity
 * and a 12px rise, on a CSS transition, triggered by one IntersectionObserver
 * that also owns the stagger and the safety clock. The pictures were the one
 * thing left out: they snapped in at full strength beside text that faded, which
 * is the sort of omission you only notice once everything around it is right.
 *
 * The entrance is opacity, a rise and a scale just short of 1, with a small blur
 * unwinding underneath them. Three other candidates were built and compared
 * before this one was kept: opacity alone, the same without the blur, and a
 * pre-blurred placeholder cross-faded under the real picture. The last was the
 * cheapest and is worth remembering if this ever runs on a page with a dozen of
 * these rather than three — it animates nothing but opacity, and it cannot show
 * an empty box on a slow connection. It lost on appearance: the placeholder is a
 * cut-out on transparency like the art it stands in for, so its blurred edge
 * spreads past the real silhouette and haloes the statue.
 *
 * ## Why not `motion`
 *
 * `motion` is a dependency and `whileInView` is the idiomatic way to do this in
 * 2026 — its own examples pair `blur(8px)` with `opacity: 0` for exactly this
 * entrance. It is still the wrong tool here, for two local reasons:
 *
 * 1. Nothing on this route loads `motion`, and the reveal system this sits
 *    beside is a measured decision to use CSS transitions for properties the
 *    compositor already interpolates. See `docs/design/landing-reveal.md`.
 * 2. `motion` renders its `initial` state into the server HTML. That is a
 *    feature, and it is precisely what the reveal system here refuses to do: the
 *    server sends the visible state and the hidden one is applied client-side,
 *    only to what is off screen. The pictures are decorative so the stakes are
 *    lower than for text, but two rules about what the server may hide is worse
 *    than one.
 *
 * The parameters are the library's even though the mechanism is not.
 */

/** Marks a cell whose picture should arrive. */
export const PICTURE_ATTR = 'data-picture'

/**
 * The pictures' own arrival state, deliberately not the page's `data-reveal`.
 *
 * They started on the shared attribute, driven by the one observer that brings
 * in every other block, and that was the right shape until they wanted a
 * different *trigger* rather than a different appearance. The page's blocks
 * arrive 140px past the bottom edge; a picture the height of a section is still
 * mostly below the fold there, so it spends its entrance off screen and is
 * settled by the time you can see it. Their own attribute lets their own
 * observer hold them until they are properly in view, without moving text that
 * was tuned against a reference implementation.
 */
export const PICTURE_STATE_ATTR = 'data-pic-state'

/**
 * Blur radius at the start.
 *
 * Below the 8-12px the library's own examples use, and deliberately: the
 * entrance is the fade, the rise and the scale, and the blur is here to take the
 * hard edge off the first frame rather than to be the effect. At 8px the statue
 * arrived visibly out of focus and the blur became the thing you watched.
 *
 * It is also the only property here the compositor cannot simply interpolate.
 * Blur can be GPU-accelerated in current browsers, but the shader still runs
 * over the whole surface every frame and the cost scales with radius and area —
 * which is why the figure below is small, why it finishes early, and why the
 * phone gets less of it.
 */
const BLUR_PX = 5

const DURATION_MS = 820
const BLUR_DURATION_MS = 620

/**
 * A beat after the block has earned its entrance, before the picture starts.
 *
 * So the pictures come in behind the text of their own section rather than with
 * it. Without it a picture this size is the first thing to move in a band, which
 * puts the eye on the decoration instead of the words beside it.
 */
const ENTRANCE_DELAY_MS = 180

/** Between two pictures that land together. They rarely do — one per section. */
const STAGGER_MS = 90

/**
 * How far into the viewport a picture comes before it starts arriving.
 *
 * More than double the 140px the page's text uses, and the reason is height: a
 * paragraph is fully in view almost as soon as it is in view at all, while these
 * run most of a section. Triggered at 140px one of them is still four fifths
 * below the fold, so it does its whole entrance where nobody can see it — the
 * animation happens and nobody watches it.
 */
const TRIGGER_OFFSET_PX = 320

/**
 * The same, on a phone.
 *
 * 320 is 38% of an 844px screen, which stops being "a little way in" and starts
 * being "over a third of the way up". The offset should be a fraction of the
 * screen rather than a constant, and on the only two screen sizes that matter
 * here a constant per breakpoint says that more plainly than arithmetic would.
 */
const MOBILE_TRIGGER_OFFSET_PX = 180

/** Matches the scene's own breakpoint and Tailwind's `sm`. */
const MOBILE_QUERY = '(max-width: 640px)'

/**
 * The longest a picture may be visible and still waiting.
 *
 * The same guarantee the page's own reveal makes, and for the same reason: an
 * offset trigger on its own is a trap. A reader who stops scrolling with a
 * picture parked in the offset band is looking at something the observer will
 * not speak about again until it moves. This clock ends it.
 */
const SAFETY_MS = 900

/** The library's standard ease-out for entrances. */
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Longest an arrival waits for its own picture to be readable.
 *
 * 'decoding=async' is a hint about scheduling, not a promise that a decode has
 * happened by the time the observer fires, and a fade resolving onto an image
 * the browser has not finished reading is an empty box that then snaps.
 * `decode()` is the API that actually answers "are the pixels ready", so the
 * arrival waits on it.
 *
 * The clock starts when the picture is *reached*. It used to start at mount, in
 * an effect beside the picture, and that version could not work: these sit below
 * the fold, so the grace had always expired long before anyone scrolled to them
 * and the gate was never closed when it mattered.
 *
 * The bound is a *product* decision rather than an image-loading one, and it is
 * worth saying so because `decode()` already rejects on a broken image and the
 * catch below covers that. What this covers is the request that stalls without
 * ever failing, and the rule it encodes is the page's own: nothing waits
 * indefinitely to be shown. `home-refs.reveal.tsx` bounds its offset trigger the
 * same way and for the same reason. Half a second would be too eager on a slow
 * connection and three would be long enough to read as broken.
 */
const DECODE_GRACE_MS = 1200

const CSS = `
.tpz-pic {
  position: absolute;
  inset: 0;
}

.tpz-pic-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/*
 * The cell itself does not move.
 *
 * It carries the grid's border, and a border that rises leaves a seam against
 * the cells beside it for the length of the transition. So the arrival is
 * expressed on the picture inside rather than on the block.
 */
[${PICTURE_ATTR}] {
  --tpz-pic-delay: 0ms;
  --tpz-pic-rise: 20px;
  --tpz-pic-blur: ${BLUR_PX}px;
}

[${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='pending'] .tpz-pic-img {
  opacity: 0;
  translate: 0 var(--tpz-pic-rise);
  scale: 0.985;
  filter: blur(var(--tpz-pic-blur));
}

/*
 * The transition lives on the destination state, so applying 'pending' is an
 * instant hide and only the arrival is animated. Nothing ever fades out.
 *
 * The blur finishes early, at 620ms against 820ms. A picture still fractionally
 * soft while it settles reads as out of focus rather than as arriving; letting
 * it sharpen first and travel the last of the distance clear is the difference.
 */
[${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='shown'] .tpz-pic-img {
  opacity: 1;
  translate: none;
  scale: 1;
  filter: blur(0px);
  transition:
    opacity ${DURATION_MS}ms ${EASE} var(--tpz-pic-delay),
    translate ${DURATION_MS}ms ${EASE} var(--tpz-pic-delay),
    scale ${DURATION_MS}ms ${EASE} var(--tpz-pic-delay),
    filter ${BLUR_DURATION_MS}ms ${EASE} var(--tpz-pic-delay);
}

/*
 * Less of everything on a phone.
 *
 * The rise is a proportion of the screen rather than an absolute: 20px off an
 * 844px viewport reads as further than 20px off 900 because the picture beside
 * it is bigger relative to the page. And the blur is the expensive one — a
 * picture that renders 349 CSS px wide at device pixel ratio 3 is a surface of
 * about 1050 by 1750 device pixels, and the blur shader covers all of it every
 * frame. Halving the radius is most of the look for a fraction of the work on
 * the hardware least able to spare it.
 */
@media ${MOBILE_QUERY} {
  [${PICTURE_ATTR}] {
    --tpz-pic-rise: 14px;
    --tpz-pic-blur: 3px;
  }
}

/* The flourish is the flourish; the picture is the point. */
@media (prefers-reduced-motion: reduce) {
  [${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='pending'] .tpz-pic-img,
  [${PICTURE_ATTR}][${PICTURE_STATE_ATTR}='shown'] .tpz-pic-img {
    opacity: 1;
    translate: none;
    scale: 1;
    filter: none;
    transition: none;
  }
}
`

export function PictureRevealStyles() {
  return <style>{CSS}</style>
}

/**
 * Brings the illustrations in.
 *
 * Structurally the page's own reveal hook with a longer offset: one observer for
 * the entrance, a second at the real viewport edge that bounds it, and the
 * hidden state applied client-side only to what is genuinely off screen. That
 * last rule is the important one — a picture that is on screen is never hidden,
 * so nothing the server drew can vanish after hydration.
 *
 * The whole thing is rebuilt when the phone breakpoint changes, because the
 * offset is baked into a `rootMargin` at construction and an observer cannot be
 * retuned in place. Rotating a phone is the case that needs it.
 */
export function usePictureReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const phone = window.matchMedia(MOBILE_QUERY)
    let teardown: (() => void) | undefined

    const build = () => {
      /*
       * Re-queried on every build rather than captured once. Groups on this page
       * can be gated, so the set is not knowable at mount, and a rebuild after a
       * rotation must see whatever is in the document now.
       */
      const blocks = [...root.querySelectorAll<HTMLElement>(`[${PICTURE_ATTR}]`)]
      if (blocks.length === 0) return undefined

      const waiting = new Map<Element, ReturnType<typeof setTimeout>>()
      /** Arrivals held waiting on a decode, so a teardown can cancel them. */
      const graceTimers = new Set<ReturnType<typeof setTimeout>>()

      /*
       * Defined before the two observers it unobserves from, which is safe
       * because it only ever runs from inside their callbacks — by the time any
       * entry is delivered, both bindings are initialised.
       */
      const show = (block: HTMLElement, delay: number) => {
        block.style.setProperty('--tpz-pic-delay', `${delay}ms`)
        block.setAttribute(PICTURE_STATE_ATTR, 'shown')
      }

      const arrive = (batch: HTMLElement[]) => {
        if (batch.length === 0) return
        batch.sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        )
        batch.forEach((block, index) => {
          const timer = waiting.get(block)
          if (timer !== undefined) {
            clearTimeout(timer)
            waiting.delete(block)
          }
          trigger.unobserve(block)
          safety.unobserve(block)
          const delay = ENTRANCE_DELAY_MS + index * STAGGER_MS

          const img = block.querySelector<HTMLImageElement>('.tpz-pic-img')
          if (!img || (img.complete && img.naturalWidth > 0)) {
            show(block, delay)
            return
          }
          /*
           * Not readable yet. Hold the arrival rather than fading onto nothing —
           * the block is already hidden, so waiting costs nothing visible, and
           * the picture then enters as a picture rather than as an empty box
           * that fills in afterwards.
           */
          let settled = false
          const go = () => {
            if (settled) return
            settled = true
            clearTimeout(grace)
            graceTimers.delete(grace)
            show(block, delay)
          }
          const grace = setTimeout(go, DECODE_GRACE_MS)
          graceTimers.add(grace)
          void img.decode().then(go).catch(go)
        })
      }

      const offset = phone.matches ? MOBILE_TRIGGER_OFFSET_PX : TRIGGER_OFFSET_PX

      const trigger = new IntersectionObserver(
        (entries) => {
          const viewportHeight = document.documentElement.clientHeight || window.innerHeight
          const ready: HTMLElement[] = []
          for (const entry of entries) {
            const block = entry.target as HTMLElement
            if (entry.isIntersecting) {
              ready.push(block)
              continue
            }
            const rect = entry.boundingClientRect
            /* Only ever hidden while completely off screen. Anything else would
               mean taking away something the reader is already looking at. */
            if (rect.bottom <= 0 || rect.top >= viewportHeight) {
              block.setAttribute(PICTURE_STATE_ATTR, 'pending')
            }
          }
          arrive(ready)
        },
        { rootMargin: `0px 0px -${offset}px 0px` },
      )

      /* The bound on the offset above. */
      const safety = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const block = entry.target as HTMLElement
          if (!entry.isIntersecting) {
            const timer = waiting.get(block)
            if (timer !== undefined) {
              clearTimeout(timer)
              waiting.delete(block)
            }
            continue
          }
          if (waiting.has(block)) continue
          waiting.set(block, setTimeout(() => arrive([block]), SAFETY_MS))
        }
      })

      for (const block of blocks) {
        trigger.observe(block)
        safety.observe(block)
      }

      return () => {
        trigger.disconnect()
        safety.disconnect()
        for (const timer of waiting.values()) clearTimeout(timer)
        for (const timer of graceTimers) clearTimeout(timer)
      }
    }

    teardown = build()
    const rebuild = () => {
      teardown?.()
      teardown = build()
    }
    phone.addEventListener('change', rebuild)

    return () => {
      phone.removeEventListener('change', rebuild)
      teardown?.()
    }
  }, [rootRef])
}

type GroupPictureProps = {
  /** WebP. The `img`'s own source, and so the one every browser can read. */
  readonly src: string
  /** The same picture in AVIF, offered first. Same crop, same pixel size. */
  readonly avif: string
  readonly fit: 'cover' | 'contain'
  readonly position: string
  /** The art's own pixels, so the box is reserved before the bytes arrive. */
  readonly width: number
  readonly height: number
}

/**
 * One illustration.
 *
 * No JavaScript of its own: the arrival is CSS keyed off the state the hook
 * above sets, and waiting for the bytes belongs to the hook too, because only it
 * knows when the picture has actually been reached.
 */
export function GroupPicture({ src, avif, fit, position, width, height }: GroupPictureProps) {
  return (
    <div className="tpz-pic">
      {/*
        AVIF first, WebP behind it.

        Everything that configures loading stays on the 'img'. 'loading',
        'decoding', 'fetchpriority', 'width' and 'height' are the image's own
        properties and a 'source' has no say in them — the browser picks a
        source and then applies the image's attributes to whichever it took.

        The two are interchangeable on purpose: same crop, same 760px width,
        same height to the pixel. A source whose intrinsic ratio differed from
        the image's would change the framing depending on which format the
        reader's browser happened to support, which is the sort of difference
        nobody would think to look for.

        Worth the second file because the saving is measured: 267KB against
        404KB, a third off, for a colour error within half a level of the WebP
        and an alpha error of at most 5. That last number is the one that
        mattered — these are cut-outs, so the alpha channel *is* the
        silhouette. A first attempt that re-encoded the shipped WebP rather
        than the original art cost 18 levels of it, which is why these are
        built from the sources and why the alpha plane is kept at 90 rather
        than the 80 that would have saved another 10KB.
      */}
      <picture>
        <source type="image/avif" srcSet={avif} />
        <img
          src={src}
          /* Decorative: the group heading beside it already names the section,
             so announcing the picture would only make a screen reader say the
             same thing twice. */
          alt=""
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          /*
           * Three decorative pictures below the fold, with no claim on
           * bandwidth the rest of the page wants first.
           *
           * 'lazy' does less here than it looks. Chromium's look-ahead is
           * 1250px on 4G, and measured from a 900px viewport these sit 354,
           * 928 and 1381px below the fold — so the first two are *meant* to
           * fetch before any scrolling and only the third defers. On localhost
           * the margin is likely the 3000px 'unknown' one, because the network
           * quality estimator does not sample loopback, which is why all three
           * load early in local testing and why that is not evidence of a bug.
           */
          fetchPriority="low"
          className={cn(
            'tpz-pic-img',
            // Padding on the element rather than the cell: the image is
            // absolutely positioned, so the cell's own padding would not reach
            // it, but `object-contain` fits inside the content box.
            fit === 'contain' ? 'object-contain p-2' : 'object-cover',
          )}
          style={{ objectPosition: position }}
        />
      </picture>
    </div>
  )
}
