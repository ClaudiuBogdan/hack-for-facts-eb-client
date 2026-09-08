# Two questions about implementing motion blur on animated numbers in the

<!--
@web-flow begin
kind: prompt
id: prompt-20260907105538932
timestamp: "2026-09-07T10:55:38.932Z"
schema: web-flow/research/v1
version: 1
-->
Two questions about implementing motion blur on animated numbers in the browser, in 2026.

1. Does the `motion` library (motion.dev, v12.x, formerly Framer Motion) have any built-in motion-blur / directional-blur capability — for example on `animate()`, on springs, or on its number/counter helpers? If not built in, what is the idiomatic way people do it with motion? Be specific about APIs that actually exist in v12; do not invent them.

2. What is the current best-practice technique for DIRECTIONAL (motion) blur on text in a browser?
   - CSS `filter: blur()` is isotropic (blurs both axes). Is there any CSS-only way to get a directional blur?
   - The usual answer is an inline SVG filter with `<feGaussianBlur stdDeviation="Nx Ny">` referenced via `filter: url(#id)`. Confirm whether `stdDeviation` accepts two values for x and y separately, and whether animating it (via JS setAttribute or SMIL) is viable.
   - Performance: how expensive is `filter: url(#svgfilter)` on text compared with `filter: blur()`? Is it composited or does it force main-thread paint each frame? Any known Chrome/Safari/Firefox differences or gotchas (e.g. filter regions clipping, blurry text rasterisation, `will-change` interactions)?
   - Are there cheaper fakes that read as motion blur — layered text-shadow, stacked semi-transparent copies offset along the motion axis, or `backdrop-filter`? What do real production sites use?

3. Specifically: how do polished sites implement SPEED-PROPORTIONAL motion blur on count-up numbers (an odometer/counter that smears while the digits race and sharpens as it settles)? Which axis do they blur — vertical (digits rolling like an odometer) or horizontal (value racing)? Cite concrete examples or libraries if you can.

Please give concrete code snippets and be explicit about what is verified versus what you are inferring.
<!-- @web-flow end id=prompt-20260907105538932 -->

<!--
@web-flow begin
kind: response
status: completed
provider: chatgpt
url: "https://chatgpt.com/c/6a9e9834-ae7c-83eb-acb1-5de3e0de5022"
id: response-20260907105622172-chatgpt
prompt_id: prompt-20260907105538932
timestamp: "2026-09-07T11:02:18.498Z"
schema: web-flow/research/v1
version: 1
-->
As of **September 7, 2026**, Motion itself is already on **13.2.0**, but **12.43.0 (July 27, 2026)** was the final v12 release, so I checked the v12-era/current API surface against that. ([Motion][1])

## 1. Motion v12: no built-in motion blur

**Verified:** Motion v12 does **not expose a dedicated `motionBlur`, directional-blur, velocity-blur, or spring-blur feature**. Neither `animate()`, spring transitions, nor Motion+'s `AnimateNumber` have a blur option that automatically derives blur from velocity.

`AnimateNumber` specifically exposes ordinary Motion transitions, including value-specific transitions for `layout`, `y`, and `opacity`; there is no documented blur/motion-blur prop. ([Motion][2])

What Motion *does* give you are exactly the primitives needed to implement it yourself:

* `useVelocity(motionValue)` → current velocity of a numeric MotionValue. ([Motion][3])
* `useTransform(...)` → map that velocity to a blur amount.
* `useMotionTemplate` → construct dynamic CSS strings like `blur(${sigma}px)`. ([Motion][4])
* `animate()` / springs → animate the underlying numeric or positional MotionValue. ([Motion][5])
* SVG elements are Motion components, including **`<motion.feGaussianBlur>`**. Motion's own documentation literally demonstrates animating its `stdDeviation`. ([Motion][6])

So the idiomatic Motion implementation for an ordinary isotropic speed blur is:

```tsx
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  useVelocity,
} from "motion/react"
import { useEffect } from "react"

function Counter({ value }: { value: number }) {
  const count = useMotionValue(0)
  const velocity = useVelocity(count)

  const displayed = useTransform(() => Math.round(count.get()))

  // Tune this relationship visually.
  const blur = useTransform(() =>
    Math.min(8, Math.abs(velocity.get()) / 700)
  )

  const filter = useMotionTemplate`blur(${blur}px)`

  useEffect(() => {
    const controls = animate(count, value, {
      type: "spring",
      stiffness: 120,
      damping: 22,
    })

    return () => controls.stop()
  }, [value, count])

  return (
    <motion.span style={{ filter }}>
      {displayed}
    </motion.span>
  )
}
```

That is **Motion-native**, but it is still ordinary CSS Gaussian blur, therefore isotropic.

One important distinction: Motion spring transitions have concepts like initial velocity, but that is **not** a motion-blur API. `useVelocity()` is the API you want when the blur amount needs to respond continuously to current speed.

---

# 2. Directional blur on text

## CSS `blur()` cannot do it

**Verified:** CSS `filter: blur()` accepts one `<length>`. There is no `blurX()`, `blurY()`, or two-axis form in CSS Filter Effects. It is isotropic. ([MDN Web Docs][7])

So there is currently **no true CSS-only directional Gaussian blur**.

You can fake directional blur with shadows/copies, but for an actual anisotropic Gaussian blur, the standard browser technique remains an SVG filter.

## `<feGaussianBlur stdDeviation="x y">` is the correct technique

**Verified:** `stdDeviation` accepts either one or two numbers:

```html
<feGaussianBlur stdDeviation="5" />
```

means:

```text
X sigma = 5
Y sigma = 5
```

while:

```html
<feGaussianBlur stdDeviation="0 8" />
```

means essentially:

```text
X sigma = 0
Y sigma = 8
```

and therefore a **vertical-only blur**.

Likewise:

```html
<feGaussianBlur stdDeviation="8 0" />
```

is horizontal-only. MDN explicitly documents both components and says that if one axis is zero, only the other axis is blurred. `stdDeviation` is also explicitly marked **animatable**. ([MDN Web Docs][8])

A minimal filter:

```html
<svg
  width="0"
  height="0"
  aria-hidden="true"
  style="position:absolute"
>
  <defs>
    <filter
      id="vertical-motion-blur"
      x="-30%"
      y="-100%"
      width="160%"
      height="300%"
      color-interpolation-filters="sRGB"
    >
      <feGaussianBlur
        id="vertical-motion-blur-node"
        in="SourceGraphic"
        stdDeviation="0 0"
      />
    </filter>
  </defs>
</svg>

<span style="filter: url(#vertical-motion-blur)">
  12,345
</span>
```

The expanded filter bounds matter: Gaussian blur can extend outside the source, and pixels outside the SVG filter region are clipped. The default region is only `-10%/-10%/120%/120%`. ([MDN Web Docs][9])

### Updating it from JavaScript

You don't even have to use `setAttribute()`. The browser exposes a dedicated API:

```ts
const blur = document.querySelector(
  "#vertical-motion-blur-node",
) as SVGFEGaussianBlurElement

blur.setStdDeviation(0, 7.5)
```

`SVGFEGaussianBlurElement.setStdDeviation(x, y)` is standardized and broadly available. ([MDN Web Docs][10])

This works too:

```ts
blur.setAttribute("stdDeviation", `0 ${sigmaY}`)
```

but `setStdDeviation()` is the cleaner dedicated DOM API.

### SMIL also works

Because the attribute is animatable, you can declaratively animate it:

```html
<feGaussianBlur
  in="SourceGraphic"
  stdDeviation="0 0"
>
  <animate
    attributeName="stdDeviation"
    values="0 0; 0 8; 0 0"
    dur="500ms"
    fill="freeze"
  />
</feGaussianBlur>
```

For a predetermined “accelerate → blur → settle” animation, this is viable.

For **live speed-proportional blur**, though, SMIL is awkward because your sigma depends on instantaneous velocity. JS/MotionValues are much easier.

---

# Motion + directional SVG blur

Motion supports the SVG primitive directly:

```tsx
const y = useMotionValue(0)
const velocityY = useVelocity(y)

const stdDeviation = useTransform(() => {
  const sigmaY = Math.min(
    10,
    Math.abs(velocityY.get()) * 0.006,
  )

  return `0 ${sigmaY}`
})

return (
  <>
    <svg
      width="0"
      height="0"
      aria-hidden
      style={{ position: "absolute" }}
    >
      <defs>
        <filter
          id="counter-motion-blur"
          x="-25%"
          y="-100%"
          width="150%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          <motion.feGaussianBlur
            in="SourceGraphic"
            stdDeviation={stdDeviation}
          />
        </filter>
      </defs>
    </svg>

    <motion.span
      style={{
        y,
        filter: "url(#counter-motion-blur)",
      }}
    >
      8
    </motion.span>
  </>
)
```

`<motion.feGaussianBlur>` is not a workaround or an invented API; Motion documents it explicitly. MotionValues can update SVG attributes through Motion's renderer. ([Motion][6])

### Safari compatibility detail

There was a **2026 WebKit regression** where paired `stdDeviation` values containing a literal zero, such as:

```html
stdDeviation="0 5"
stdDeviation="5 0"
```

failed entirely. WebKit bug **315522**, reported May 25, 2026, is marked **RESOLVED FIXED**. The bug report itself demonstrated `0.0001 5` as a workaround. ([WebKit Bugzilla][11])

So if you have to support Safari/WebKit builds affected by that regression, this is defensively safer:

```ts
const epsilon = 0.0001

const stdDeviation = useTransform(() => {
  const sy = Math.max(
    epsilon,
    Math.min(10, Math.abs(velocityY.get()) * 0.006),
  )

  return `${epsilon} ${sy}`
})
```

And when the animation has fully settled, ideally remove the SVG filter entirely rather than leaving an epsilon blur:

```tsx
filter: moving ? "url(#counter-motion-blur)" : "none"
```

That last recommendation is an engineering choice rather than something required by the spec.

---

# 3. Performance: CSS blur vs SVG directional blur

There isn't a clean rule saying:

> SVG filter = main-thread repaint every frame.

That would be too strong.

Motion's current performance documentation says that **Chrome and Firefox can handle `filter` and SVG on the compositor**, while also stressing that browser acceleration rules remain conditional and browser-dependent. Motion 12.43.0 specifically added hardware acceleration for SVG elements “in supported browsers.” ([Motion][12])

But there are two separate costs:

| Technique                      | Directional?         | Practical performance                                                                |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------ |
| `filter: blur()`               | No                   | Usually the simplest and best-optimized blur path                                    |
| SVG `feGaussianBlur`           | Yes                  | More flexible; acceleration varies more by filter graph/browser                      |
| JS changing `stdDeviation`     | Yes                  | JS update occurs on main thread; actual filtering may still be GPU/compositor-backed |
| Transform/opacity ghost copies | Fake                 | Most predictable fast option                                                         |
| `text-shadow` streaks          | Fake                 | Often involves painting; don't assume it is cheaper                                  |
| `backdrop-filter`              | No/use-case mismatch | Blurs what's *behind* the element, not the glyph itself                              |

The key distinction is that **JS driving the value** and **rendering the filter** are different things. Calling `setStdDeviation()` or computing `useVelocity()` happens in JS. The browser may subsequently perform the actual filter operation on a composited/GPU surface.

Motion's own SVG guide is cautious: generic SVG attribute animation is usually paint-triggering, whereas transform/opacity are the guaranteed fast path. ([Motion][13])

And compositor acceleration doesn't make Gaussian blur free. Motion's text-performance guide calls blur a “classic trap”: increasing blur expands what were tiny character-sized surfaces, causing them to overlap and dramatically increasing the GPU surface area being processed. Their recommendation is effectively to blur fewer/larger groups rather than dozens of independently blurred glyphs. ([Motion][14])

For a counter, therefore, I'd prefer:

```text
one SVG blur on the entire number
```

over:

```text
12 separate independently blurred glyphs
```

unless the digits truly need different velocities.

### Safari

Safari/WebKit is the engine I would test most aggressively for SVG filters. The 2026 zero-component regression above is concrete evidence that edge cases still arise. ([WebKit Bugzilla][11])

Chrome/Firefox have better current compositor claims in Motion's own performance documentation. That still isn't a promise that every arbitrary `url(#filter)` graph plus continuously mutated SVG primitive stays off-main-thread. ([Motion][12])

### `will-change`

Don't add:

```css
will-change: filter;
```

by default and assume you've solved it.

Layer promotion consumes GPU memory, and acceleration remains browser-dependent. Interestingly, the current NumberFlow library keeps its own `willChange` option **off by default**, explicitly warning about excessive memory usage. ([NumberFlow][15])

Profile before enabling it.

### Two other SVG gotchas

First, increase the filter region or directional smearing will get clipped. ([MDN Web Docs][9])

Second, SVG filter primitives default to **`linearRGB`**, whereas that may not give you the exact visual appearance you expect from CSS filtering. For UI text I would generally specify:

```html
color-interpolation-filters="sRGB"
```

unless linear-light filtering is intentional. ([MDN Web Docs][9])

---

# 4. Cheaper motion-blur fakes

For production UI, the most useful fake is usually **multiple transform/opacity copies**, not `text-shadow`.

For example:

```tsx
<div className="number">
  <span aria-hidden className="ghost ghost-1">
    12,345
  </span>
  <span aria-hidden className="ghost ghost-2">
    12,345
  </span>
  <span aria-hidden className="ghost ghost-3">
    12,345
  </span>

  <span>12,345</span>
</div>
```

with the ghost distance driven by speed:

```css
.number {
  position: relative;
}

.ghost {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ghost-1 {
  opacity: 0.20;
  transform: translateY(calc(var(--smear) * -0.35px));
}

.ghost-2 {
  opacity: 0.12;
  transform: translateY(calc(var(--smear) * -0.7px));
}

.ghost-3 {
  opacity: 0.06;
  transform: translateY(calc(var(--smear) * -1px));
}
```

This isn't Gaussian blur, but it reads surprisingly well as temporal smearing. Because it is fundamentally `transform + opacity`, it uses the browser's safest compositor properties. ([Motion][12])

`text-shadow` can approximate the same look:

```css
text-shadow:
  0 -2px 0 rgb(255 255 255 / 20%),
  0 -5px 0 rgb(255 255 255 / 12%),
  0 -9px 2px rgb(255 255 255 / 6%);
```

but I'd prefer transform copies when performance is important.

`backdrop-filter` is the wrong tool: it filters the backdrop behind the element rather than smearing the text itself.

---

# 5. What polished number counters actually do

This is where the evidence is useful.

### NumberFlow

Current **NumberFlow** is probably the best reference for polished browser number transitions. Its model is rolling/spinning digits with `trend` controlling whether digits move upward or downward, plus a `continuous` mode that visually passes through intermediate numbers. It also uses masking around the edges and intentionally keeps `will-change` opt-in. ([NumberFlow][15])

Notably, it does **not** expose a true motion-blur option.

So the modern production pattern is closer to:

```text
vertical digit translation
+ opacity
+ clipping/masking
+ good easing
```

than:

```text
expensive true SVG motion blur on every digit
```

Motion+'s `AnimateNumber` similarly focuses on `layout`, `y`, and `opacity`, rather than true blur. ([Motion][2])

### SmoothUI

A concrete current counter implementation from SmoothUI does use blur. Its number-flow animation combines:

```css
transform: translateY(50px);
filter: blur(5px);
```

and animates both back to zero, with the inverse on exit. So this is a **vertical rolling animation plus ordinary isotropic CSS blur**. ([SmoothUI][16])

That's probably the sweet spot for many apps: CSS blur is cheaper/simpler and a vertical translation gives the brain enough directional information that the isotropic blur still reads as motion blur.

### True SVG motion blur exists, but it is niche

`bounty.js` is a concrete library specifically described as:

> an SVG odometer/slot-machine transition with motion blur

and it implements the effect internally using SVG. It is old—npm `1.3.0` is years old—so I would treat it as a useful implementation reference rather than a library to adopt in a new 2026 React app. ([CSS Script][17])

That contrast is telling: modern number libraries generally optimize around transforms/masks; one of the most explicit “true motion blur” odometer libraries is an older SVG implementation.

---

# Which direction should a count-up blur?

For an **odometer/slot-machine counter**, **vertical**.

If the digit itself is moving vertically:

```text
7
↓
8
↓
9
```

the physically coherent blur is:

```html
stdDeviation="0 Ny"
```

where `Ny` scales with the vertical pixel velocity.

The key point is to derive blur from the velocity of the **visual motion**, not simply from the numeric rate.

For example, this:

```ts
blur = abs(valuePerSecond)
```

isn't really physically meaningful. Going from `1` to `1,000,000` doesn't tell you how many pixels the glyph moves.

For an odometer, better:

```ts
const velocityPxPerSecond = Math.abs(yVelocity)
const sigmaY = clamp(
  velocityPxPerSecond * 0.005,
  0,
  10,
)
```

Then:

```html
stdDeviation="0 sigmaY"
```

That mapping is my recommended implementation, not a standardized formula.

A **horizontal** smear makes sense if your visual design deliberately presents the number as streaking laterally—a speedometer/racing aesthetic—or if the whole number actually moves horizontally. But if digits roll vertically while you blur horizontally, you're creating a stylistic speed-line effect rather than motion blur corresponding to the actual motion.

## What I would ship

For a polished React/Motion counter in 2026:

**Default / best performance:** use vertical per-digit translation like NumberFlow, clipping/masks, opacity, and no true blur.

**More cinematic:** add a small **isotropic CSS `blur()`** proportional to vertical velocity. In practice, because the actual movement is clearly vertical, this usually sells the effect well while remaining simpler.

**Highest-fidelity:** one `feGaussianBlur` with:

```html
stdDeviation="0 Ny"
```

driven from `useVelocity(y)`, preferably applied to as few filter surfaces as possible. Remove `filter:url(...)` completely once velocity approaches zero.

I would reserve the SVG version for a prominent hero/KPI animation where the extra fidelity is actually visible. For ordinary dashboards, NumberFlow-style transforms/masks—or a tiny `blur(0–3px)`—are likely the better production tradeoff.

[1]: https://motion.dev/changelog?lib=motion&utm_source=chatgpt.com "Changelog | Motion"
[2]: https://motion.dev/docs/react-animate-number?utm_source=chatgpt.com "Animate numbers | Counters and countdowns | Motion for React"
[3]: https://motion.dev/docs/react-use-velocity?utm_source=chatgpt.com "useVelocity | React velocity-based animations | Motion for React"
[4]: https://motion.dev/docs/react-use-motion-template?utm_source=chatgpt.com "useMotionTemplate (React) | Motion for React"
[5]: https://motion.dev/docs/animate?utm_source=chatgpt.com "animate() | Create JavaScript, SVG animations | Motion"
[6]: https://motion.dev/docs/react-gestures?utm_source=chatgpt.com "React gesture animations | hover, drag, press | Motion for React"
[7]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/blur?utm_source=chatgpt.com "blur() CSS function - CSS | MDN"
[8]: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stdDeviation?utm_source=chatgpt.com "stdDeviation - SVG | MDN"
[9]: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feGaussianBlur?utm_source=chatgpt.com "<feGaussianBlur> - SVG | MDN"
[10]: https://developer.mozilla.org/en-US/docs/Web/API/SVGFEGaussianBlurElement/setStdDeviation?utm_source=chatgpt.com "SVGFEGaussianBlurElement: setStdDeviation() method - Web APIs | MDN"
[11]: https://bugs.webkit.org/show_bug.cgi?id=315522&utm_source=chatgpt.com "315522 – [regression] feGaussianBlur in filter is not applied if the stdDeviation contains a 0 in the pair"
[12]: https://motion.dev/docs/performance?utm_source=chatgpt.com "Animation performance guide | Motion"
[13]: https://motion.dev/docs/svg-animation?utm_source=chatgpt.com "SVG animation: SMIL vs CSS vs JavaScript compared | Motion"
[14]: https://motion.dev/docs/text-animation?utm_source=chatgpt.com "Text animation | Split text, typewriter and scramble effects | Motion for React"
[15]: https://number-flow.barvian.me/?utm_source=chatgpt.com "NumberFlow for React - An animated number component"
[16]: https://www.smoothui.dev/doc/number-flow?utm_source=chatgpt.com "Number Flow - React Component | SmoothUI"
[17]: https://www.cssscript.com/svg-based-odometer-motion-blur-effect-bounty-js/?utm_source=chatgpt.com "SVG Based Odometer Motion Blur Effect - bounty.js | CSS Script"

<!-- @web-flow end id=response-20260907105622172-chatgpt -->
