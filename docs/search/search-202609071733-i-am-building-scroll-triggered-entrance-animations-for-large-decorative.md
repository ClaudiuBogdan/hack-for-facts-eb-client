# I am building scroll-triggered entrance animations for large decorative

<!--
@web-flow begin
kind: prompt
id: prompt-20260907173332622
timestamp: "2026-09-07T17:33:32.622Z"
schema: web-flow/research/v1
version: 1
-->
I am building scroll-triggered entrance animations for large decorative illustrations (statues, ~150KB WebP, ~760x1250) on a React 19 landing page. The app is TanStack Start, so it server-renders — client-only animation patterns that look fine in dev must not break SSR or cause hydration mismatches. The animation library available is Motion (motion.dev, the successor to Framer Motion, v12+).

Please answer with concrete, current (2025-2026) best practice, with code where useful. Cite sources.

PART 1 — Entrance animation for images revealed on scroll

1. What are the most effective/most-used entrance animations for hero-style images revealed on scroll, using Motion for React? I specifically want to evaluate combining BLUR + FADE (e.g. filter: blur(12px) -> blur(0) together with opacity 0 -> 1, possibly with a small scale or y translate). Is that combination considered good practice, and what parameter values (blur radius, duration, easing, stagger) do people actually use?

2. Which Motion APIs are the right ones here in v12: `whileInView` + `viewport={{ once: true, amount }}`, `useInView` + `animate`, variants with `staggerChildren`, or the newer scroll APIs? What are the tradeoffs? Please show idiomatic v12 code, not old Framer Motion 6/7 patterns.

3. Spring vs tween/duration-based easing for this specific case — what do practitioners recommend for an image entrance, and what easing curves are considered current (e.g. custom cubic-bezier, "easeOut", spring with bounce: 0)?

PART 2 — Performance of animating blur

4. Animating `filter: blur()` is widely said to be expensive because it repaints every frame and cannot be composited like transform/opacity. Is that still true in 2025-2026 Chromium/Safari? Is animated blur GPU-accelerated now? What are the measured costs on large images?

5. What are the recommended alternatives that get the same look more cheaply? I am specifically interested in:
   - the "blur-up" / progressive image technique: cross-fading a tiny pre-blurred LQIP placeholder into the full image, so nothing animates `filter` at all
   - BlurHash / ThumbHash
   - pre-rendering a blurred copy and animating only opacity between two stacked <img> elements
   - `will-change: filter` and whether it helps or hurts
   Which of these is considered best practice now, and what do the tradeoffs look like?

6. Does `prefers-reduced-motion` handling change any of these recommendations?

PART 3 — Image loading and web optimisation

7. Current best practice for lazy loading images below the fold in 2025-2026: `loading="lazy"` vs IntersectionObserver, `decoding="async"`, `fetchpriority`, and when each is appropriate. Any gotchas with `loading="lazy"` interacting with scroll-triggered animations (e.g. the image not being decoded when the animation fires, causing a flash or a pop-in)?

8. Preventing layout shift (CLS): `width`/`height` attributes vs CSS `aspect-ratio`, and how that interacts with `object-fit: cover`.

9. Format and delivery: AVIF vs WebP in 2025-2026 — real-world size and compatibility, and whether serving AVIF with a WebP fallback via `<picture>` is worth the complexity for a handful of decorative illustrations. Responsive `srcset`/`sizes` guidance for an image that renders at roughly 360 CSS px on desktop and 340 CSS px on mobile, on displays up to DPR 3.

10. Is `content-visibility: auto` or `contain-intrinsic-size` worth using for offscreen sections containing these images?

Please be concrete and flag anything where the common advice is outdated.
<!-- @web-flow end id=prompt-20260907173332622 -->

<!--
@web-flow begin
kind: response
status: completed
provider: chatgpt
url: "https://chatgpt.com/c/6a9ef59d-22f4-83ed-8878-8841fc33592c"
id: response-20260907173439993-chatgpt
prompt_id: prompt-20260907173332622
timestamp: "2026-09-07T17:43:25.704Z"
schema: web-flow/research/v1
version: 1
-->
For your exact case—large decorative ~760×1250 illustrations that enter once as the user scrolls—I would make **opacity + a small `y`/scale transform the primary animation**, and treat live `filter: blur()` as an optional enhancement. The highest-confidence performance version is a **tiny pre-blurred LQIP underneath the real image, cross-faded with opacity**, while the wrapper does the entrance transform.

## Part 1 — Entrance animation for images revealed on scroll

### 1. Blur + fade is a valid contemporary effect, but keep it restrained

Blur + fade is not an outdated pattern. Motion itself has a January 2026 “Scroll Zoom Hero” example combining **scale + blur + fade**, and its current scroll docs explicitly demonstrate `filter` moving between `blur(10px)` and `blur(0px)`. A June 2026 official Motion example also uses `opacity: 0` + `blur(8px)` for an entrance. ([Motion][1])

There is no authoritative dataset saying “most sites use 11.3px blur for 620ms”, so exact numbers you see online are largely design heuristics. For a large illustration, these are good starting points:

| Property       | Recommended starting point | Comments                                                 |
| -------------- | -------------------------: | -------------------------------------------------------- |
| Blur           |               `8–12px → 0` | I would start at **8px or 10px**                         |
| Opacity        |                    `0 → 1` | Always works well with blur                              |
| `y`            |              `16–24px → 0` | Enough to imply arrival without floating up dramatically |
| Scale          |          `0.985–0.995 → 1` | Subtle; avoid `0.9 → 1` for large artwork                |
| Duration       |               `0.55–0.75s` | Around **0.65s** is a good default                       |
| Blur duration  |                `0.4–0.55s` | Can finish before the positional motion                  |
| Easing         |        `[0.16, 1, 0.3, 1]` | Strong smooth ease-out                                   |
| Stagger        |               `0.08–0.14s` | For 2–4 adjacent illustrations                           |
| In-view amount |                 `0.15–0.3` | `0.2` is good for tall artwork                           |

For these statues I would **not** combine large blur + large translation + large scale. Blur already makes the entrance conspicuous. My default would be:

```text
opacity: 0 → 1
y: 20px → 0
scale: 0.985 → 1
blur: 8px → 0
```

If you're aiming for a quieter editorial appearance, remove the scale altogether.

### 2. The right Motion v12 API is usually `whileInView`

Motion's current documentation distinguishes two concepts very explicitly:

* **scroll-triggered**: enter/leave viewport → `whileInView` / `useInView`
* **scroll-linked**: animation continuously follows scroll position → `useScroll`

`whileInView` uses a pooled `IntersectionObserver`, whereas `useScroll` can use native `ScrollTimeline` where possible. ([Motion][2])

For your entrance animation, this is the idiomatic version:

```tsx
import { motion } from "motion/react"

export function Statue({
  src,
  alt = "",
}: {
  src: string
  alt?: string
}) {
  return (
    <motion.img
      src={src}
      alt={alt}
      width={760}
      height={1250}
      loading="lazy"
      decoding="async"
      initial={{
        opacity: 0,
        y: 20,
        scale: 0.985,
        filter: "blur(8px)",
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1],

        opacity: {
          duration: 0.5,
          ease: "easeOut",
        },

        filter: {
          duration: 0.5,
          ease: "easeOut",
        },
      }}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
      }}
    />
  )
}
```

Current Motion supports value-specific transitions exactly like this. Tween transitions accept named easings or cubic Bézier arrays. ([Motion][3])

For TanStack Start, **you do not need to make this component client-only just because it animates**. Motion explicitly says its components support SSR and that the `initial` state is reflected in generated server HTML. TanStack Start's requirement is that server HTML and the first client render remain deterministic. ([Motion][4])

So this is good:

```tsx
initial={{ opacity: 0, y: 20 }}
```

This is not:

```tsx
initial={{
  y: window.innerWidth < 768 ? 10 : 30
}}
```

Nor should initial state depend during render on `matchMedia`, `Date.now()`, randomness, local storage, etc. Those are exactly the kinds of divergent server/client inputs TanStack documents as hydration hazards. ([TanStack][5])

#### When to use the other Motion APIs

| API                           | Use it when                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| `whileInView` + `viewport`    | **Default choice** for your one-shot statue reveals                        |
| `useInView`                   | You need the visibility boolean for image decoding, analytics, state, etc. |
| `useAnimate` + `useInView`    | You need imperative sequencing across several descendants                  |
| Variants                      | Several related elements share entrance states                             |
| `delayChildren: stagger(...)` | Children should enter sequentially                                         |
| `useScroll` + `useTransform`  | Effect should continuously scrub with scroll                               |

`useInView` currently exposes `once`, `margin`, `amount`, `root`, and `initial`, while Motion's current `useAnimate` documentation explicitly demonstrates combining `useAnimate` and `useInView` for scroll-triggered animation. ([Motion][6])

For staggered illustrations, note that current Motion documentation demonstrates this form:

```tsx
import { motion, stagger } from "motion/react"

const container = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: stagger(0.1),
    },
  },
}

const statue = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
}

export function Statues() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.img variants={statue} />
      <motion.img variants={statue} />
      <motion.img variants={statue} />
    </motion.div>
  )
}
```

The current v12 docs use `delayChildren: stagger(0.1)`, so I would use that instead of copying old Framer Motion examples centered around `staggerChildren`. ([Motion][7])

### 3. Tween is usually better than spring here

For a large decorative image entering the page, I prefer a **duration-based tween**.

Why: opacity and blur are essentially cinematic transitions. A physical spring doesn't add much semantic value and can make the end of a blur/fade feel strangely elastic.

Motion currently supports both physics springs and duration-oriented springs, including `bounce` and `visualDuration`; `bounce: 0` explicitly means no bounce. ([Motion][3])

My choices would be:

```tsx
transition={{
  duration: 0.65,
  ease: [0.16, 1, 0.3, 1],
}}
```

or, if you particularly like spring motion:

```tsx
transition={{
  default: {
    type: "spring",
    visualDuration: 0.6,
    bounce: 0,
  },
  opacity: {
    type: "tween",
    duration: 0.5,
    ease: "easeOut",
  },
  filter: {
    type: "tween",
    duration: 0.45,
    ease: "easeOut",
  },
}}
```

That hybrid makes more sense than applying a bouncing spring to the blur itself.

---

# Part 2 — Performance of animating blur

### 4. “CSS blur always causes CPU repainting every frame” is outdated

That commonly repeated statement is now **too broad**.

Chromium has CPU and GPU paths for filters and its filter design documentation says animated filters can trigger the GPU path during the animation. Motion's current docs similarly state that browsers can animate properties including `filter` entirely on the GPU in appropriate circumstances. ([new.chromium.org][8])

But this does **not** mean:

> blur is now as cheap as opacity or transform.

Blur remains a convolution/filter operation over pixels. Chrome's own detailed explanation shows exactly why this can be expensive even when no CPU repaint occurs: the GPU may have to execute the blur shader over the image every frame, and cost rises with both the **blur radius** and **pixel area**. ([Chrome for Developers][9])

So the modern mental model should be:

**Old model:**
`filter: blur()` = CPU repaint every frame → always terrible.

**Better 2026 model:**
`filter: blur()` can be compositor/GPU accelerated → but the GPU still performs expensive image filtering every frame, so it can remain substantially more expensive than transform/opacity.

The compressed file being ~150KB is basically irrelevant to that animation cost. What matters after decoding is the raster area.

Your 760×1250 source is 950,000 source pixels. If displayed around 360 CSS px wide, it's roughly 360×592 CSS px. At DPR 3, that's approximately a **1080×1776 = 1.92-million-device-pixel surface**, before blur outsets and implementation details.

That is why an 8px blur on a 32×32 icon and an 8px blur on your statue are very different workloads.

#### What do current measurements show?

There isn't a credible 2025–2026 standardized benchmark I could find giving a portable answer like:

> “760×1250 WebP + blur(12px) costs precisely 3.4 ms in Chrome and 7.2 ms in Safari.”

Browser implementation, GPU, DPR, layer size, alpha transparency, clipping and surrounding content all affect it. Any such single number would be misleading.

There is, however, current evidence that blur remains problematic in edge cases. A Chromium issue filed in November 2025 reports increased GPU load/power associated with blur handling on Android. WebKit also has active 2026 regressions involving CSS blur: one July 2026 report describes ~20-second initial rendering stalls on iOS with very large fixed elements using `blur(100px/120px)`, and another August 2026 bug documents severe stalls in a particular blur-plus-SVG case. These are much more extreme than your `8–12px` entrance, but they demonstrate that “GPU accelerated” does not imply “performance solved.” ([Chromium Issues][10])

WebKit itself acknowledged another blur-performance regression in January 2026 after having to revert an optimization. ([WebKit Bugzilla][11])

So for your case:

**8–10px → 0 for 450–500ms, once, on one image at a time:** probably reasonable on modern hardware, but benchmark iPhones.

**20–40px on multiple large illustrations simultaneously:** I would avoid.

**60–120px decorative glowing layers:** definitely don't extrapolate desktop Chrome performance to iOS Safari.

---

## 5. Alternatives to live blur: ranked for your use case

### Best overall: tiny raster LQIP + opacity crossfade

For your handful of static illustrations, this is the option I would ship.

Create perhaps a 10–30px-wide version at build time, blur it during image generation, and use it as the initially visible image. Then reveal the real image using opacity only.

The technique is well established enough that current Next.js image tooling still implements this directly and recommends keeping blur placeholders extremely small—around 10px or less for its implementation—to keep their data cost negligible. ([Next.js][12])

The key distinction is:

**Do the blur once during your build pipeline, not every animation frame.**

A practical structure:

```tsx
import {
  motion,
  useReducedMotion,
} from "motion/react"
import {
  useEffect,
  useRef,
  useState,
} from "react"

export function Statue({
  src,
  placeholderSrc,
}: {
  src: string
  placeholderSrc: string
}) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [decoded, setDecoded] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    let cancelled = false

    const markDecoded = async () => {
      try {
        await img.decode()
      } catch {
        // decode() can reject after a failed/changed request.
      }

      if (!cancelled) setDecoded(true)
    }

    if (img.complete) {
      void markDecoded()
    } else {
      img.addEventListener("load", markDecoded, { once: true })
    }

    return () => {
      cancelled = true
      img.removeEventListener("load", markDecoded)
    }
  }, [])

  return (
    <motion.figure
      initial={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 20, scale: 0.985 }
      }
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.2 }}
      transition={
        reducedMotion
          ? { duration: 0.2 }
          : {
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1],
            }
      }
      style={{
        position: "relative",
        margin: 0,
      }}
    >
      <img
        src={placeholderSrc}
        alt=""
        aria-hidden="true"
        width={760}
        height={1250}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
        }}
      />

      <motion.img
        ref={imageRef}
        src={src}
        alt=""
        width={760}
        height={1250}
        loading="lazy"
        decoding="async"
        initial={false}
        animate={{ opacity: decoded ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </motion.figure>
  )
}
```

`HTMLImageElement.decode()` specifically gives you a promise that resolves once the image is decoded and ready to display, avoiding the situation where you trigger an animation and then stall a frame while the raster is decoded. ([MDN Web Docs][13])

This also gives a nice semantic effect:

**blurred artwork enters → detail resolves as image arrives.**

### Pre-rendered blurred full-resolution copy

Also fast during animation because you're cross-fading opacity, but I would usually **not** make the blurred copy full resolution.

A decoded 760×1250 32-bit raster is roughly 3.6 MiB. Two copies are around 7.2 MiB before browser/GPU overhead.

A 20–40px LQIP gets almost the same perceptual result with essentially none of that cost.

Chrome's older but still architecturally useful blur analysis demonstrated why pre-rasterizing blur and animating opacity can outperform recomputing blur every frame. ([Chrome for Developers][14])

### ThumbHash

Good if you're building a generic image infrastructure.

ThumbHash stores a tiny representation and, compared with BlurHash, encodes approximate aspect ratio, alpha, more image detail and more accurate colors. ([GitHub][15])

For dynamically sourced images:

**ThumbHash > maintaining separate LQIP files** can be attractive.

For four static statues in your Git repository:

**a tiny WebP/AVIF/JPEG placeholder is simpler.**

### BlurHash

Also excellent for dynamic media systems. BlurHash encodes the placeholder into a roughly 20–30-character string that can accompany image metadata. ([GitHub][16])

Its disadvantage here is that you need JS to decode/render it somewhere. A static tiny raster can simply be part of your SSR HTML.

So my ranking for your landing page is:

1. **Build-time raster LQIP**
2. **ThumbHash**, if you're creating reusable image infrastructure
3. **BlurHash**, similar use case
4. Full-resolution preblurred duplicate
5. Live animated CSS blur

### `will-change: filter`

Do not add this blindly.

MDN's current documentation explicitly says `will-change` should be a **last resort**, that overuse consumes resources/memory, and that properties already actively being animated are treated as changing anyway. ([MDN Web Docs][17])

So this:

```css
.statue {
  will-change: filter, transform, opacity;
}
```

permanently on twenty sections is not a modern optimization strategy.

`will-change: filter` can change layer/rasterization decisions but **cannot remove the computational cost of the blur shader itself**.

If profiling reveals a real benefit, apply it shortly before the animation and remove it afterwards. Otherwise let Motion/browser heuristics handle it.

---

## 6. `prefers-reduced-motion`

Yes, it changes the recommendation slightly.

For reduced-motion users, Motion recommends replacing large-element transforms with opacity and disabling things such as parallax. `MotionConfig reducedMotion="user"` automatically suppresses transform/layout animations but deliberately allows values such as opacity to continue. ([Motion][18])

One subtlety: **`filter` isn't one of the values automatically disabled by that policy**. If you want blur disabled too, use `useReducedMotion()` and explicitly omit it. Motion provides that hook specifically for bespoke behavior. ([Motion][19])

For these illustrations I would use:

```text
normal:
opacity + y + optional tiny scale + LQIP/sharpen

reduced:
opacity only, 0–200ms
```

Or simply reveal immediately.

---

# Part 3 — Loading and image optimization

## 7. Native `loading="lazy"` is the 2026 default

For ordinary below-the-fold `<img>` elements:

```tsx
<img
  loading="lazy"
  decoding="async"
  ...
/>
```

is the right baseline.

All major browsers support native lazy loading, and current web.dev guidance explicitly says there is generally no reason to recreate image lazy loading with JavaScript/IntersectionObserver. ([MDN Web Docs][20])

Use IntersectionObserver yourself when you need something **beyond loading**, such as:

* entering Motion state
* pre-initializing a WebGL widget
* loading non-image content
* controlling exact prefetch distance
* coordinating decoding with an animation

Motion's own `whileInView` already uses IntersectionObserver, so don't build another one just to detect the same entrance. ([Motion][2])

### `decoding="async"`

This is a scheduling hint, not a “decode faster” switch.

Current MDN says it tells the browser whether presentation should wait for decoding. It does **not** guarantee that the image will already be decoded when your entrance animation begins. ([MDN Web Docs][21])

For guaranteed coordination, use:

```ts
await image.decode()
```

([MDN Web Docs][13])

### `fetchpriority`

For below-the-fold statues, leave it at:

```html
fetchpriority="auto"
```

most of the time.

You can use `"low"` if you have many decorative images competing with important page assets.

For the actual LCP/above-fold hero:

```html
loading="eager"
fetchpriority="high"
```

and preferably don't scroll-trigger its initial visibility at all. Current performance guidance explicitly says **never lazy-load an LCP image**. ([web.dev][22])

Also, `fetchpriority="high"` does not cancel lazy loading. A lazy image still waits until it approaches the viewport before getting fetched. ([web.dev][23])

### Lazy loading + Motion gotcha

Yes, the race you described is real in principle:

```text
element reaches Motion's intersection threshold
        ↓
animation starts
        ↓
image network/decode isn't finished
        ↓
blank/partial frame
        ↓
image suddenly appears
```

Native lazy-loading intentionally starts fetching *before* the image becomes visible, and Chrome telemetry cited by web.dev showed the overwhelming majority of lazy images being available by visibility time, but it is not a synchronization guarantee. ([web.dev][23])

This is another reason the **LQIP underlay is the strongest approach**. Your entrance can happen on schedule even on slow network; the high-resolution version simply resolves afterwards.

---

# 8. CLS: use `width` and `height`, even with responsive CSS

Use:

```html
<img
  width="760"
  height="1250"
  ...
>
```

Then:

```css
.statue {
  width: 100%;
  height: auto;
}
```

Modern browsers derive an intrinsic aspect ratio directly from the HTML width/height attributes before the image has downloaded. Current web.dev guidance calls this the modern best practice for preventing image CLS. ([web.dev][24])

CSS `aspect-ratio` is useful too, especially on a **wrapper whose dimensions deliberately differ from the source**:

```css
.crop {
  aspect-ratio: 3 / 4;
  overflow: hidden;
}

.crop img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

`object-fit: cover` preserves the media's intrinsic ratio while filling and clipping within the already-defined box. It doesn't itself reserve the layout space. ([MDN Web Docs][25])

So:

**Known source dimensions:** HTML `width`/`height`.

**Designed fixed/cropped container:** CSS `aspect-ratio`.

Often use both.

Transforms such as `translateY()` and `scale()` don't alter document layout, so your Motion transform entrance itself shouldn't create CLS.

---

# 9. AVIF vs WebP in 2026

AVIF is no longer an exotic format. Current support includes Chrome, Firefox, Edge and Safari; full Safari support starts at 16.4, with earlier 16.1–16.3 support being partial. Current Can I Use data puts AVIF around 93% global support. ([Can I Use][26])

AVIF generally achieves somewhat better compression than WebP, although the exact difference varies substantially by image. MDN currently describes AVIF as offering slightly better compression while noting WebP's deeper historical support and AVIF's lack of progressive rendering. ([MDN Web Docs][27])

For your handful of ~150KB decorative assets:

**I would add AVIF only if your build pipeline generates it automatically.**

If:

```text
statue.webp = 150 KB
statue.avif = 85 KB
```

then it's an obvious win.

If:

```text
statue.webp = 150 KB
statue.avif = 137 KB
```

I wouldn't add manual asset-maintenance complexity just for that.

With automated Sharp/ImageMagick/CDN processing, `<picture>` is cheap insurance:

```tsx
<picture>
  <source
    type="image/avif"
    srcSet="
      /statue-360.avif 360w,
      /statue-720.avif 720w,
      /statue-1080.avif 1080w
    "
    sizes="(max-width: 767px) 340px, 360px"
  />

  <img
    src="/statue-720.webp"
    srcSet="
      /statue-360.webp 360w,
      /statue-720.webp 720w,
      /statue-1080.webp 1080w
    "
    sizes="(max-width: 767px) 340px, 360px"
    width={760}
    height={1250}
    loading="lazy"
    decoding="async"
    alt=""
  />
</picture>
```

The browser checks `type` and selects the first supported `<source>`, otherwise it falls back to `<img>`. ([MDN Web Docs][28])

### Your `srcset` dimensions

At ~360 CSS px:

| DPR | Ideal physical width |
| --: | -------------------: |
|  1× |               360 px |
|  2× |               720 px |
|  3× |              1080 px |

So:

```text
360w
720w
1080w
```

is almost ideal.

On mobile at 340px the corresponding targets are:

```text
340
680
1020
```

The same 360/720/1080 candidate set handles both nicely.

One important issue: your existing source is **only 760px wide**. Generating a 1080px derivative from a 760px master creates no new detail. If you genuinely want clean DPR3 output at a 360px rendered width, retain/generate a source of at least ~1080px width.

If these statues are deliberately soft/decorative, your current 760px master is probably perfectly acceptable at ~2.1 physical pixels per CSS pixel on a 360px slot, and the network saving may be more useful than chasing theoretical 3× resolution.

With width descriptors, `sizes` is important because the browser combines slot size with DPR when selecting a candidate. ([MDN Web Docs][29])

---

# 10. `content-visibility: auto`

It is now broadly practical. MDN marks `content-visibility` as Baseline 2024, and browsers can skip layout/painting work for offscreen content until it becomes relevant. ([MDN Web Docs][30])

For a long landing page with expensive sections:

```css
.marketing-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 900px;
}
```

is reasonable.

`auto 900px` means roughly “use 900px as the initial estimate; after the element has actually been rendered, remember its real size.” That's specifically what current `contain-intrinsic-size` is designed to do alongside `content-visibility`. ([MDN Web Docs][31])

But for a landing page made mostly of static text + a few images, I would consider it a **secondary optimization**, not a baseline requirement.

Also be aware of the interaction with IntersectionObserver. By specification, descendants of content currently skipped by `content-visibility` are treated as non-intersecting. Browsers have had fixes around this behavior. ([Bugzilla][32])

Therefore I would put `content-visibility` on the **same high-level section that approaches the viewport**, not wrap a Motion target several skipped ancestor levels deep and depend on a delicate sequence of nested observers.

For example:

```tsx
<section className="marketing-section">
  <Statue />
</section>
```

rather than aggressively applying `content-visibility: auto` on every nested wrapper.

And don't use it on your initial LCP/hero section.

---

# Recommended configuration for your statues

For this particular React 19 / TanStack Start / Motion v12 landing page, I would ship this stack:

```text
Entrance
  opacity: 0 → 1
  y: 20px → 0
  scale: 0.985 → 1
  0.6–0.7s
  ease: [0.16, 1, 0.3, 1]
  viewport: { once: true, amount: 0.2 }

Blur appearance
  tiny build-time LQIP
  → crossfade to decoded full image
  → do NOT animate CSS blur

Loading
  below fold: loading="lazy"
  decoding="async"
  fetchpriority="auto"

Sizing
  width="760"
  height="1250"

Responsive
  ~360w / 720w / 1080w variants
  sizes="(max-width: 767px) 340px, 360px"

Formats
  AVIF + WebP if generation is automatic
  otherwise a well-compressed WebP alone is perfectly defensible

Accessibility
  prefers-reduced-motion:
      opacity only / nearly instant

SSR
  keep initial Motion props deterministic
  no ClientOnly necessary
```

If you prefer the visual character of a **real animated blur**, I would still be comfortable testing `blur(8px) → blur(0)` for about `450–500ms` on one 360px-wide statue at a time. The advice that it inevitably CPU-repaints is outdated; the reason I'd choose LQIP anyway is that **opacity + transform gives you a much more predictable performance envelope across iOS Safari and low-power/mobile GPUs**. ([new.chromium.org][8])

[1]: https://motion.dev/examples/react-scroll-zoom-hero?utm_source=chatgpt.com "Scroll Zoom Hero example & tutorial for React | Motion"
[2]: https://motion.dev/docs/react-scroll-animations "React scroll animation | scroll-linked & parallax | Motion for React"
[3]: https://motion.dev/docs/react-transitions?utm_source=chatgpt.com "React transitions | Configure Motion animations | Motion for React"
[4]: https://motion.dev/docs/react-motion-component?utm_source=chatgpt.com "React motion component | Motion for React"
[5]: https://tanstack.com/start/latest/docs/framework/react/guide/hydration-errors?utm_source=chatgpt.com "Hydration Errors | TanStack Start React Docs"
[6]: https://motion.dev/docs/react-use-in-view?utm_source=chatgpt.com "useInView | React scroll-triggered state | Motion for React"
[7]: https://motion.dev/docs/stagger?utm_source=chatgpt.com "stagger | Stagger the delay of multiple animations | Motion"
[8]: https://new.chromium.org/developers/design-documents/image-filters/?utm_source=chatgpt.com "Filter Effects"
[9]: https://developer.chrome.com/blog/animated-blur/?utm_source=chatgpt.com "Animating a blur  |  Blog  |  Chrome for Developers"
[10]: https://issues.chromium.org/issues/464519399?utm_source=chatgpt.com "[464519399] - Chromium"
[11]: https://bugs.webkit.org/show_bug.cgi?id=228312&utm_source=chatgpt.com "228312 – CSS blur() filter performance leads to breaking pages"
[12]: https://nextjs.org/docs/app/api-reference/components/image?utm_source=chatgpt.com "Components: Image Component | Next.js"
[13]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode?utm_source=chatgpt.com "HTMLImageElement: decode() method - Web APIs | MDN"
[14]: https://developer.chrome.com/blog/animated-blur?utm_source=chatgpt.com "Animating a blur  |  Blog  |  Chrome for Developers"
[15]: https://github.com/evanw/thumbhash?utm_source=chatgpt.com "GitHub - evanw/thumbhash: A very compact representation of an image placeholder · GitHub"
[16]: https://github.com/woltapp/blurhash?utm_source=chatgpt.com "GitHub - woltapp/blurhash: A very compact representation of a placeholder for an image. · GitHub"
[17]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change?utm_source=chatgpt.com "will-change CSS property - CSS | MDN"
[18]: https://motion.dev/docs/react-accessibility?utm_source=chatgpt.com "Create accessible animations in React | Guide | Motion for React"
[19]: https://motion.dev/docs/react-use-reduced-motion?utm_source=chatgpt.com "useReducedMotion | Accessible React animations | Motion for React"
[20]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading?utm_source=chatgpt.com "HTMLImageElement: loading property - Web APIs | MDN"
[21]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding?utm_source=chatgpt.com "HTMLImageElement: decoding property - Web APIs | MDN"
[22]: https://web.dev/articles/fetch-priority?utm_source=chatgpt.com "Optimize resource loading with the Fetch Priority API  |  Articles  |  web.dev"
[23]: https://web.dev/articles/browser-level-image-lazy-loading?authuser=6&utm_source=chatgpt.com "Browser-level image lazy loading for the web  |  Articles  |  web.dev"
[24]: https://web.dev/articles/optimize-cls?hl=en&utm_source=chatgpt.com "Optimize Cumulative Layout Shift  |  Articles  |  web.dev"
[25]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Images/Replaced_element_properties?utm_source=chatgpt.com "Styling replaced elements - CSS | MDN"
[26]: https://caniuse.com/avif?a481a4c1_page=5&d4197795_page=2&type=Case+studies&v=1706622854597&utm_source=chatgpt.com "AVIF image format | Can I use... Support tables for HTML5, CSS3, etc"
[27]: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types?utm_source=chatgpt.com "Image file type and format guide - Media | MDN"
[28]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/source?utm_source=chatgpt.com "<source> HTML media or image source element - HTML | MDN"
[29]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture?utm_source=chatgpt.com "<picture> HTML picture element - HTML | MDN"
[30]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility?utm_source=chatgpt.com "content-visibility CSS property - CSS | MDN"
[31]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain-intrinsic-size?utm_source=chatgpt.com "contain-intrinsic-size CSS property - CSS | MDN"
[32]: https://bugzilla.mozilla.org/show_bug.cgi?id=1766265&utm_source=chatgpt.com "1766265 - Content hidden by `content-visibility` should not trigger intersection observers"

<!-- @web-flow end id=response-20260907173439993-chatgpt -->
