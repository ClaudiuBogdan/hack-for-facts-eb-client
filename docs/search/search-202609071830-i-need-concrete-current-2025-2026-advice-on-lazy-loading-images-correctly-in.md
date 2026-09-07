# I need concrete, current (2025-2026) advice on lazy loading images correctly in

<!--
@web-flow begin
kind: prompt
id: prompt-20260907183012669
timestamp: "2026-09-07T18:30:12.669Z"
schema: web-flow/research/v1
version: 1
-->
I need concrete, current (2025-2026) advice on lazy loading images correctly in a **TanStack Start** app (React 19, Vite, server-side rendered with streaming SSR, hydrated on the client). Please be specific to this stack rather than generic, and cite sources.

## The concrete situation

Three decorative illustrations (~150KB WebP each, 760x1250, cut-outs on transparency) sit well below the fold on a long landing page. They are imported as Vite assets (`import leu from '@/assets/images/landing-leu.webp'`) and rendered as plain `<img loading="lazy" decoding="async" fetchpriority="low" width={760} height={1250}>`. They are `position: absolute; inset: 0` inside a cell with a fixed aspect ratio, so they cause no layout shift.

They also have a scroll-triggered entrance animation (opacity + translate + scale + a small blur), driven by my own IntersectionObserver, which sets a `pending` state client-side only for elements that are off screen and never for anything on screen (the codebase forbids shipping a hidden state in server HTML).

## What I measured, which is the reason I am asking

`loading="lazy"` is **not deferring these images**. On a 1440x900 viewport with the images at document y = 1230, 1805 and 2259, all three were requested about 950ms after navigation, before any scrolling — both with no network throttling and with Fast 4G emulation (9Mbps/60ms). Chrome fetched all three eagerly.

## Questions

1. **Why isn't `loading="lazy"` deferring them?** What are Chromium's actual current distance-from-viewport thresholds for lazy images, do they still vary by effective connection type, and did they change recently? Is ~1250px still the fast-connection threshold? Is there any way to observe or influence the threshold?

2. **Does the Vite dev server change this?** I measured on a Vite dev server, not a production build. Could dev-mode module loading, HTTP/1.1 vs HTTP/2, or the lack of resource prioritisation explain eager fetching that would not happen in production? How should I measure this honestly — should I be testing a `vite build` + preview instead?

3. **Does streaming SSR change it?** TanStack Start streams HTML. If the image markup arrives in an early chunk while the document is still streaming, does the preload scanner treat "distance from viewport" differently because layout is incomplete? Is there a known interaction where lazy images below the fold get fetched because the viewport/layout is not yet settled at parse time?

4. **Given all that, is a decode gate worth keeping?** My animation currently holds a picture's entrance until `img.decode()` resolves (raced against a 1200ms timeout), so the fade never resolves onto an image the browser has not finished reading. If images are in practice always loaded long before the user reaches them, is this dead weight? What is current best practice for coordinating a scroll-triggered entrance animation with image readiness — `decode()`, the `load` event, `complete`, or nothing at all?

5. **What is the *correct* way to lazy load in this stack if I actually want deferral?** Options I can see: leave `loading="lazy"` and accept Chrome's threshold; add my own IntersectionObserver that swaps `data-src` into `src`; use `fetchpriority="low"` (already doing); or something else. Which is recommended in 2025-2026, and what are the SSR implications of each — specifically, a `data-src` swap means the server HTML contains no real `src`, which breaks no-JS rendering and is exactly the kind of "hidden state in server HTML" my codebase forbids. Is there a pattern that defers loading without sacrificing the no-JS/server-rendered case?

6. **Vite specifics.** Are there gotchas with `import`ed assets and lazy loading, `?url` vs `?import` query suffixes, or asset inlining thresholds that affect any of this? Does anything change between dev and a production build?

7. **`<picture>` with AVIF + WebP in Vite.** I am about to add AVIF sources with a WebP fallback for these three images, hand-maintained (no image pipeline). Any pitfalls with `<picture>`/`srcset` and Vite asset imports, `loading="lazy"` on the inner `<img>`, or how `fetchpriority` and `decoding` interact with `<source>` elements?

Please flag anywhere the common advice is outdated, and say clearly when something is browser-version-dependent.
<!-- @web-flow end id=prompt-20260907183012669 -->

<!--
@web-flow begin
kind: response
status: completed
provider: chatgpt
url: "https://chatgpt.com/c/6a9f02b9-cbd4-83eb-99fd-8bc0bca46116"
id: response-20260907183132111-chatgpt
prompt_id: prompt-20260907183012669
timestamp: "2026-09-07T18:42:25.671Z"
schema: web-flow/research/v1
version: 1
-->
Your current markup is fundamentally correct for TanStack Start + React 19 SSR. The behavior you measured is explainable, but there are **two separate things to check before concluding that Chrome fetched the actual image bytes eagerly**:

1. Two of your three images are already inside Chrome’s native lazy-load look-ahead margin.
2. In Vite dev, an asset import itself creates a small `*.webp?import` module request that is **not the image download**.

For these three decorative assets, I would keep native `loading="lazy"` rather than replace it with a JS `data-src` loader unless you have a hard requirement that the ~450 KB must not transfer before scrolling.

## 1. Why `loading="lazy"` is fetching so early

### Current Chromium defaults

As of current Chromium source in September 2026, the image lazy-loading margins are:

| Effective connection type | Vertical look-ahead |
| ------------------------- | ------------------: |
| Unknown                   |         **3000 px** |
| Offline                   |         **8000 px** |
| Slow 2G                   |         **8000 px** |
| 2G                        |         **6000 px** |
| 3G                        |         **2500 px** |
| 4G                        |         **1250 px** |

These are the actual current Blink defaults, not the old values copied around blog posts. ([Chromium Git Repositories][1])

So yes: **1250px is still the current 4G image margin**.

The commonly cited 2020 article says 1250px for 4G and 2500px for “3G or lower.” The 1250/2500 parts are still correct for 4G/3G, but “3G or lower = 2500” is now outdated: current Chromium uses 6000px for 2G and 8000px for Slow 2G. ([web.dev][2])

There was a relevant Chromium change in 2026, but it did **not** change these image margins: Blink unified image/audio/video lazy-loading into `LazyLoadMediaObserver` while explicitly reusing the existing network-aware image margin settings. ([Chromium Git Repositories][3])

### Your actual distances are smaller than the document-Y values

For a 900px-high viewport:

| Image top | Distance below initial viewport |
| --------: | ------------------------------: |
|      1230 |                      **330 px** |
|      1805 |                      **905 px** |
|      2259 |                     **1359 px** |

Therefore, on a true Chromium 4G classification:

* image 1: should request immediately
* image 2: should request immediately
* image 3: nominally should remain deferred, but is only **109px beyond the 1250px margin**

On `Unknown`, however, all three fall comfortably inside the **3000px** margin.

That matters particularly on localhost. Chromium's Network Quality Estimator deliberately does not normally use localhost requests as network-quality samples; its own current source exposes localhost sampling only as a testing option. ([Chromium Git Repositories][4])

So an unthrottled localhost test can plausibly have an `Unknown` ECT and therefore a **3000px** lazy-load margin.

You can use this only as a diagnostic:

```ts
console.log({
  effectiveType:
    (navigator as Navigator & {
      connection?: { effectiveType?: string }
    }).connection?.effectiveType,
})
```

Don't treat `navigator.connection.effectiveType` as a portable contract; the browser's internal policy is browser/version-dependent.

### Chrome 121+ also uses `scrollMargin`

One other modern-browser nuance: since Chrome 121, native lazy loading uses IntersectionObserver-style **scroll margin**, rather than only a root margin. This fixed premature/late behavior for images inside nested CSS scrollers such as carousels. Chromium explicitly says this is internal and exposes no developer API for changing it. ([Google Groups][5])

If you have nested clipping/scroll containers, geometry can therefore differ from the simple:

```text
img.top - viewport.height
```

calculation.

### Can you inspect or change Chrome's 1250px?

**Not through an HTML or web API.**

You can:

* inspect your element's actual `getBoundingClientRect()`
* inspect `navigator.connection?.effectiveType` where supported
* test different DevTools network profiles

But there is no:

```html
<img loading-distance="300px">
```

or native API for setting Chrome's lazy-load margin. The browser intentionally owns that heuristic. web.dev likewise describes the distance as browser-calculated and network-dependent. ([web.dev][2])

---

## 2. Vite dev mode: there is an important measurement trap

This may account for part or even all of what you observed.

Given:

```ts
import leu from '@/assets/images/landing-leu.webp'
```

Vite treats the image as an **ES module whose default export is a URL**. Official Vite documentation shows the resulting value is roughly:

```text
/src/assets/images/landing-leu.webp       // development
/assets/landing-leu.<hash>.webp           // production
```

([vitejs][6])

Internally in dev you can consequently see a network request resembling:

```text
landing-leu.webp?import
```

That request is part of Vite's ESM module graph. Current Vite source shows that its asset plugin turns the import into JavaScript equivalent to:

```js
export default "/src/assets/images/landing-leu.webp"
```

([GitHub][7])

**`loading="lazy"` cannot defer that JS module request.**

The native `<img>` lazy loader controls the subsequent actual image request:

```text
/src/assets/images/landing-leu.webp
```

So in DevTools inspect:

| Request                                             | Meaning                                         |
| --------------------------------------------------- | ----------------------------------------------- |
| `foo.webp?import`                                   | Vite asset **module**, expected to load with JS |
| `foo.webp` with `Content-Type: image/webp`, ~150 KB | actual image bytes                              |

Check **Type**, **Content-Type**, **Transferred**, and **Initiator**, not just the filename.

This distinction disappears conceptually in production because the import has been compiled into the JS bundle and points directly at the hashed asset.

### Should you test a production build?

Absolutely. For performance/waterfall conclusions, don't use Vite dev.

For a current TanStack Start Node/Nitro deployment, the documented shape is:

```bash
pnpm build
pnpm start
```

with typically:

```json
{
  "build": "vite build",
  "start": "node .output/server/index.mjs"
}
```

([TanStack][8])

`vite preview` is useful for checking a Vite production client build, but Vite explicitly says it is only a local preview server and isn't intended as a production server. For TanStack Start SSR, I'd preferentially run the actual built Start server matching your deployment adapter. ([vitejs][9])

HTTP/1.1 versus H2/H3 can substantially change **scheduling and transfer timing after a request exists**. It does not change the meaning of `loading="lazy"` or independently make an otherwise ineligible image eligible.

---

## 3. Streaming SSR does not inherently defeat lazy loading

TanStack Start currently does full-document SSR by default, streams the HTML, and then hydrates the resulting DOM. ([TanStack][10])

There isn't a known rule like:

> “The document hasn't finished streaming, therefore fetch all lazy images.”

Native lazy images deliberately differ from eager images: their request is held until the browser has enough layout information to determine proximity. Chrome's guidance specifically notes that native lazy loading depends on layout rather than simply allowing normal eager discovery to fetch the resource. ([web.dev][11])

### There is one streaming-specific edge case

Suppose the browser temporarily sees:

```text
hero
small Suspense fallback
your illustration at y=1000
```

and later React's streamed content replaces the fallback with something much taller:

```text
hero
2000px final content
your illustration at y=2800
```

The illustration may have been inside Chrome's lazy margin during the earlier layout. Once Chrome starts the request, moving the image farther away doesn't cancel it.

So the relevant question is not:

> “Was the final y=2259?”

but:

> “What was its minimum distance from the viewport during initial streaming/layout?”

Your fixed image aspect ratio protects against **the image itself** causing CLS. It doesn't guarantee that streamed/Suspense content **above it** never changes its position.

You can instrument this very easily:

```ts
const img = document.querySelector<HTMLImageElement>('[data-debug-image]')!

const log = () => {
  const r = img.getBoundingClientRect()

  console.log({
    t: performance.now(),
    top: r.top,
    viewportHeight: innerHeight,
    gap: r.top - innerHeight,
    src: img.currentSrc,
    complete: img.complete,
  })
}

log()
requestAnimationFrame(log)
setTimeout(log, 100)
setTimeout(log, 500)
setTimeout(log, 1000)
```

If the y-position is stable, streaming itself is not the explanation.

### React 19 resource preloading

This is also worth checking because you're on React 19.

React's SSR implementation can automatically produce image preload hints, but its current server renderer explicitly excludes images having:

```text
loading === "lazy"
OR
fetchPriority === "low"
OR
inside <picture>
```

from that automatic image-preload path. ([Develop][12])

So your current image should **not** be automatically preloaded by React.

Nevertheless, check the document/head and response `Link` headers for:

```html
<link rel="preload" as="image" ...>
```

If some framework/plugin/manual code adds one, that preload is an independent eager request and effectively defeats your lazy-loading intent. React 19 does support explicit resource preloading during SSR. ([React][13])

---

## 4. I would simplify your decode gate, but not because `decode()` is wrong

These four concepts mean different things:

* `load` — image transfer completed successfully enough for the image load event.
* `img.complete` — fetching is complete, **including failure cases**; it can even be true when there is no `src`. ([MDN Web Docs][14])
* `decoding="async"` — a **hint** that decoding shouldn't block presentation of other content. It doesn't mean “wait until decoded.” ([MDN Web Docs][15])
* `img.decode()` — Promise resolving when the selected image has actually been decoded and is ready to use/paint. ([MDN Web Docs][16])

Therefore, if your design requirement really is:

> Don't begin the reveal until pixels are ready to display.

`decode()` is the semantically best API.

I wouldn't use a `load` event instead just to avoid `decode()`.

### For your specific animation

Given ~150KB images plus Chrome's 1250–3000px look-ahead, the image will usually be fully ready by the time your animation's own viewport observer triggers. So I'd use a very lightweight gate:

```ts
async function waitForImage(img: HTMLImageElement) {
  try {
    await img.decode()
  } catch {
    // Broken request, src changed, or browser-specific failure.
    // Don't leave the entrance permanently blocked.
  }
}
```

Then only call it when **your animation observer** decides the illustration is about to enter.

I don't see much value in a fixed **1200ms race** unless that timeout expresses a deliberate UX requirement such as “never delay the reveal more than 1.2s.” It isn't an image-loading primitive.

If a tiny chance of the image appearing a frame late doesn't bother you, the simplest choice is even better:

```tsx
<img loading="lazy" decoding="async" ... />
```

and animate its containing element without readiness synchronization.

For decorative landing-page art, that would be my default.

If you need an immediate success check, use:

```ts
img.complete && img.naturalWidth > 0
```

rather than `complete` alone.

---

## 5. What to use if you *really* want later deferral

There is an unavoidable platform tradeoff here.

### Recommended default: keep native lazy loading

For your case:

```tsx
<img
  src={leu}
  alt=""
  width={760}
  height={1250}
  loading="lazy"
  decoding="async"
  fetchPriority="low"
/>
```

is good SSR HTML.

It:

* works immediately from server HTML
* doesn't require hydration
* doesn't cause a server/client mismatch
* keeps accessibility/no-JS behavior
* lets the browser adapt look-ahead to network conditions

Native lazy loading remains Google's recommended general mechanism for ordinary below-the-fold images. ([web.dev][2])

One nuance: `fetchPriority="low"` **does not increase the lazy distance or force deferral**. It only hints at priority once the resource becomes fetchable/eligible. ([web.dev][2])

For these purely decorative images, keeping it is reasonable if you want them to yield to other network work. It isn't required for lazy loading.

### Exact threshold requires hiding the URL from the browser

If you need:

> Never request until 300px from viewport

then your IntersectionObserver has to control when `src` appears:

```tsx
<img
  data-src={leu}
  width={760}
  height={1250}
  alt=""
/>
```

then:

```ts
img.src = img.dataset.src!
```

when your observer fires.

That's because as soon as real server HTML contains:

```html
src="/landing-leu.webp"
```

the browser owns discovery/loading and you cannot override its native lazy distance precisely.

### There is no way to satisfy both of these simultaneously

You specifically require:

1. real usable `src` in server HTML for no-JS rendering, **and**
2. a custom stricter loading distance.

The platform does not offer that combination.

In fact, the HTML standard explicitly specifies that native lazy loading is **not deferred when scripting is disabled**, as an anti-tracking measure. With JS disabled, `loading="lazy"` effectively doesn't provide the lazy deferral. ([html.spec.whatwg.org][17])

The conventional strict-loader fallback is:

```html
<img data-src="/image.webp" ...>

<noscript>
  <img src="/image.webp" ...>
</noscript>
```

That gives:

* JS enabled → exact IO-controlled loading
* JS disabled → functional image

but it still violates your architecture rule that the primary rendered image itself must have a genuine `src`.

So given your stated constraint, **native lazy loading is the correct answer**. Accept the browser margin rather than fighting it.

And for only three ~150KB decorative images, adding AVIF is probably a better optimization than introducing a second JS loading system.

---

## 6. Vite-specific answers

Your normal import is correct:

```ts
import leu from '@/assets/images/landing-leu.webp'
```

A normal recognized image asset already returns a URL. `?url` is therefore redundant:

```ts
import leu from './landing-leu.webp?url'
```

is mainly useful for file types Vite doesn't otherwise recognize as assets. ([vitejs][6])

`?import` is Vite's **internal dev-module machinery**. Don't put it in your application imports.

Vite also supports:

```ts
import image from './image.webp?inline'
import image from './image.webp?no-inline'
```

([vitejs][6])

The relevant rule is its `assetsInlineLimit`, currently **4096 bytes by default**. ([vitejs][9])

Your ~150KB files are nowhere near that, so they'll become normal emitted files in production.

This distinction matters conceptually:

```text
normal emitted URL
    ↓
<img loading=lazy>
    ↓
browser can defer network bytes

data: URL in JS
    ↓
bytes were already downloaded as part of JS
    ↓
loading=lazy cannot recover that bandwidth
```

So don't force `?inline` for images you want to lazy-load.

You don't need `?no-inline` for 150KB assets, although using it can make an invariant explicit.

Also avoid switching these SSR assets to:

```ts
new URL('./image.webp', import.meta.url)
```

without a good reason. Vite's own docs warn that this pattern does not work generically with SSR because `import.meta.url` semantics differ between browser and server. Static imports are a better fit for TanStack Start. ([vitejs][6])

---

## 7. AVIF + WebP `<picture>`: this is the pattern I'd use

For hand-maintained fixed-size variants:

```tsx
import leuAvif from '@/assets/images/landing-leu.avif'
import leuWebp from '@/assets/images/landing-leu.webp'

<picture>
  <source
    srcSet={leuAvif}
    type="image/avif"
  />

  <img
    src={leuWebp}
    alt=""
    width={760}
    height={1250}
    loading="lazy"
    decoding="async"
    fetchPriority="low"
  />
</picture>
```

You don't need:

```tsx
<source srcSet={leuWebp} type="image/webp" />
```

because the inner:

```tsx
<img src={leuWebp}>
```

already serves as your WebP fallback.

`loading="lazy"` belongs **only on the `<img>`**, not the `<source>` elements. Chrome's native-lazy-loading documentation explicitly shows this pattern: the browser selects among `<source>` candidates but the fallback `<img>` controls lazy-loading behavior. ([web.dev][2])

Likewise:

```text
loading
decoding
fetchPriority
width/height
alt
```

are fundamentally properties of the image element. Format selection comes from the `<source srcSet type>` candidates.

Your readiness code should also continue referencing the inner image:

```ts
await img.decode()

console.log(img.currentSrc)
```

`currentSrc` tells you whether AVIF or WebP was actually selected. ([MDN Web Docs][18])

And because these are decorative illustrations, `alt=""` is appropriate.

---

## What I would change in your implementation

I would keep this architecture:

```tsx
<picture>
  <source srcSet={leuAvif} type="image/avif" />
  <img
    src={leuWebp}
    alt=""
    width={760}
    height={1250}
    loading="lazy"
    decoding="async"
    fetchPriority="low"
  />
</picture>
```

Keep your **animation IntersectionObserver entirely separate from loading**. Don't make its SSR state responsible for image loading.

Then I'd probably remove the 1200ms decode race. Either:

```ts
// simplest
startEntrance()
```

or, if preventing an empty first animation frame is visually important:

```ts
try {
  await img.decode()
} catch {}

startEntrance()
```

Finally, before changing any code, rerun your measurement on the built TanStack Start app and distinguish these two requests:

```text
landing-leu.webp?import     ← Vite dev module; ignore for image lazy-loading
landing-leu.webp            ← actual ~150 KB image; inspect this one
```

My expectation is that this will explain at least some of the surprising waterfall. For the actual images, **#1 and #2 loading without scrolling is completely expected in current Chrome**, while #3 should be investigated using ECT + initial-layout geometry + Initiator; on localhost an `Unknown`/3000px margin is a particularly plausible explanation. ([Chromium Git Repositories][1])

[1]: https://chromium.googlesource.com/chromium/src/third_party/%2B/master/blink/renderer/core/frame/settings.json5 "https://chromium.googlesource.com/chromium/src/third_party/%2B/master/blink/renderer/core/frame/settings.json5"
[2]: https://web.dev/articles/browser-level-image-lazy-loading?authuser=00 "https://web.dev/articles/browser-level-image-lazy-loading?authuser=00"
[3]: https://chromium.googlesource.com/chromium/src/tools/%2B/7551b88134e987c544f2a2fdccd60fd9624ea8c6 "https://chromium.googlesource.com/chromium/src/tools/%2B/7551b88134e987c544f2a2fdccd60fd9624ea8c6"
[4]: https://chromium.googlesource.com/chromium/src/%2B/HEAD/net/nqe/network_quality_estimator.h "https://chromium.googlesource.com/chromium/src/%2B/HEAD/net/nqe/network_quality_estimator.h"
[5]: https://groups.google.com/a/chromium.org/g/blink-dev/c/cn9_443jGgI "https://groups.google.com/a/chromium.org/g/blink-dev/c/cn9_443jGgI"
[6]: https://vite.dev/guide/assets.html "https://vite.dev/guide/assets.html"
[7]: https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/asset.ts "https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/asset.ts"
[8]: https://tanstack.com/start/latest/docs/framework/react/guide/hosting "https://tanstack.com/start/latest/docs/framework/react/guide/hosting"
[9]: https://vite.dev/guide/cli "https://vite.dev/guide/cli"
[10]: https://tanstack.com/start/latest "https://tanstack.com/start/latest"
[11]: https://web.dev/learn/performance/lazy-load-images-and-iframe-elements "https://web.dev/learn/performance/lazy-load-images-and-iframe-elements"
[12]: https://develop.finki.ukim.mk/projects/NETIntel/browser/node_modules/react-dom/cjs/react-dom-server-legacy.node.production.js?order=author "https://develop.finki.ukim.mk/projects/NETIntel/browser/node_modules/react-dom/cjs/react-dom-server-legacy.node.production.js?order=author"
[13]: https://react.dev/reference/react-dom/preload "https://react.dev/reference/react-dom/preload"
[14]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement "https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement"
[15]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding "https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding"
[16]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode "https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode"
[17]: https://html.spec.whatwg.org/?userLang=en "https://html.spec.whatwg.org/?userLang=en"
[18]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/currentSrc "https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/currentSrc"

<!-- @web-flow end id=response-20260907183132111-chatgpt -->
