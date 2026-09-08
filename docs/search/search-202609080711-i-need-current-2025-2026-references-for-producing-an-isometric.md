# I need current (2025-2026) references for producing an **isometric /

<!--
@web-flow begin
kind: prompt
id: prompt-20260908071135502
timestamp: "2026-09-08T07:11:35.502Z"
schema: web-flow/research/v1
version: 1
-->
I need current (2025-2026) references for producing an **isometric / axonometric "device mockup" look for a UI panel in pure CSS**, on a real production web app (React 19 + Tailwind v4).

Context: I have a card (a list of links) sitting in a hero, already rendered inside a `perspective: 1150px` scene and transformed with `rotateY(-26.5deg) rotateX(-5.3deg)` and `transform-origin: right center`. It reads as a window turned toward the page's headline/search field. I now want to push it toward an **isometric** look rather than a pure one-point-perspective rotation.

Please cover:

1. **Named libraries / tools that do this, with links to their source**, so I can read the actual implementation rather than a blog description. Specifically anything like: isometric CSS generators, "device mockup" / "3D screenshot" CSS libraries, Tailwind plugins, React components, Figma-to-CSS isometric exporters, CSS-only isometric grid frameworks. For each: what transform chain do they actually emit?

2. **The concrete transform recipes.** What is the canonical true-isometric CSS transform (the one equivalent to a 30°/30° axonometric projection), and how is it usually written — `rotateX() rotateZ()`, a `matrix3d()`, or `skewY() + scaleY()`? Give the actual numbers and explain what each term contributes.

3. **Perspective vs parallel projection.** True isometric is a *parallel* projection, so it should have no `perspective`. What do real implementations do in practice — do they keep a very large perspective value to fake parallel, or drop it entirely? What breaks if you mix `perspective` with an isometric transform chain?

4. **The "half-isometric" / 2.5D look** that many SaaS landing pages use for hero screenshots — a slight skew rather than a full 30/30 projection. What transform chain produces that, and what are typical angle ranges that still keep body text legible?

5. **Cast shadows for a transformed panel.** How do these implementations produce a convincing shadow behind/below a 3D-transformed card? `box-shadow` vs `filter: drop-shadow()` vs a separate transformed pseudo-element "ground shadow". Which survives a 3D transform correctly, and what are the performance implications of each (especially `filter: drop-shadow` on a large surface)?

6. **Text rendering pitfalls.** Skewed/rotated text and subpixel antialiasing, blurriness on non-integer transforms, `will-change` / `backface-visibility` / `transform-style: preserve-3d` interactions, and anything about how these degrade on Safari specifically.

Prefer primary sources: GitHub repos, the actual CSS in a library's dist, MDN, and spec text. Include URLs. If a technique is widely repeated but actually wrong or outdated in 2026, say so.
<!-- @web-flow end id=prompt-20260908071135502 -->

<!--
@web-flow begin
kind: response
status: completed
provider: chatgpt
url: "https://chatgpt.com/c/6a9fb52d-9328-83eb-9d0b-29bdd449a156"
id: response-20260908071230333-chatgpt
prompt_id: prompt-20260908071135502
timestamp: "2026-09-08T07:28:23.450Z"
schema: web-flow/research/v1
version: 1
-->
For a **real HTML panel containing readable text**, I would distinguish two targets:

* **True isometric:** use an orthographic/affine transform, with **no perspective**. For a vertical UI face, the cleanest CSS is a `matrix()` or `skewY() + scaleX()`.
* **SaaS “isometric-ish” hero:** keep a **weak perspective**, use roughly 12–20° yaw, 3–8° pitch, optionally a small skew. This is probably the better direction for your link card.

Your current `perspective: 1150px; rotateY(-26.5deg) rotateX(-5.3deg)` is fairly perspective-heavy. Moving toward **~2400–4000px perspective, ~15–18° Y rotation, and a small affine skew** would move it toward the modern 2.5D screenshot style while preserving legibility.

## 1. Actual libraries and implementations

| Source                              | Current relevance                                                                                                                     | What the source actually does                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **isometric-css**                   | Actively maintained in 2026; probably the best source here for the actual projection math. ([GitHub][1])                              | Calculates 3D rotation matrices using `rotateX(atan(√2))` and `rotateZ(±45°)`, then emits a **2D `matrix(a,b,c,d,0,0)` plus `scale(sqrt(3/2))`**. ([GitHub][2])                                                               |
| **Screenshot Studio**               | Very relevant: 2026 app, Next 16 / React 19 / Tailwind 4. ([Screenshot Studio][3])                                                    | Its preset literally named **“Isometric”** uses `rotateX:22`, `rotateY:-22`, `scale:.95`, `perspective:2400`; “Showcase Tilt” uses Y=18°, X=6°, P=2400px. So it is perspective 2.5D, not mathematical isometry. ([GitHub][4]) |
| **Styly CSS 3D iPhone**             | Current Next.js 16 + Tailwind 4 example.                                                                                              | Parent `perspective:1200px`; device `rotateY(...) rotateX(...) scale(...)`; `preserve-3d`; large `box-shadow`. ([GitHub][5])                                                                                                  |
| **Page UI**                         | Excellent landing-page reference, although its current repo still says Tailwind v3, so copy the CSS idea rather than the integration. | `perspective(400em) rotateY(-15deg) rotateX(6deg) skew(-8deg,4deg) translate3d(...) scale(.8)`. This is almost exactly the “SaaS hero 2.5D” category you describe. ([GitHub][6])                                              |
| **Codrops IsometricGrids**          | Old, 2016; useful as implementation archaeology, not something I would adopt today.                                                   | Defaults `perspective:0`, and only prepends `perspective(...)` when explicitly requested. One demo uses `rotateX(45deg) rotateZ(45deg)`. ([GitHub][7])                                                                        |
| **TailwindCSS 3D plugin**           | Historical only.                                                                                                                      | Implements `rotate-x-*`, `rotate-y-*`, perspective, backface etc.; its maintainer explicitly says it **will not support Tailwind v4 because v4 has native 3D utilities**. ([GitHub][8])                                       |
| **Tailwind v4 itself**              | What you should use.                                                                                                                  | Native X/Y/Z rotations, perspective, transform-style; arbitrary `transform-[...]` supports exact matrices. ([Tailwind CSS][9])                                                                                                |
| **CSS Grid three-plane experiment** | Old experiment, but useful to see the classic affine construction.                                                                    | Left/right planes use `skewY(-30deg)` / `skewY(30deg)`; third plane uses `rotateZ(-60deg) skewY(30deg)`. ([Gist][10])                                                                                                         |

Source links:

[isometric-css repository](https://github.com/elchininet/isometric-css?utm_source=chatgpt.com)
[isometric-css projection matrices](https://github.com/elchininet/isometric-css/blob/master/src/utilities/matrix.ts)
[isometric-css generated CSS matrix code](https://github.com/elchininet/isometric-css/blob/master/src/classes/styles.ts)
[Screenshot Studio preset source](https://github.com/KartikLabhshetwar/screenshot-studio/blob/main/lib/animation/presets.ts)
[Styly iPhone component source](https://github.com/tercumantanumut/phone3d-css-styly-io/blob/main/src/components/IPhoneMockup.tsx)
[Page UI source/repository](https://github.com/danmindru/page-ui?utm_source=chatgpt.com)
[Codrops IsometricGrids source](https://github.com/codrops/IsometricGrids/blob/master/js/main.js)
[Tailwind v4 3D transforms](https://tailwindcss.com/blog/tailwindcss-v4?utm_source=chatgpt.com)

### Figma → CSS

I did **not** find a credible maintained open-source Figma plugin whose job is specifically “take an isometric Figma projection and emit equivalent CSS isometric transforms.”

There are maintained general exporters such as **Fubuki CSS Tool**, which exports CSS/Tailwind/UnoCSS, but it doesn't synthesize an axonometric projection. ([GitHub][11]) `figma2html` similarly handles ordinary rotation/shadows but isn't an isometric projection exporter. ([GitHub][12])

So I would not add a Figma exporter to this pipeline. The CSS math is simple enough to own directly.

---

# 2. The actual true-isometric math

There are several formulas online because people mean different **faces** when they say “isometric.”

### Exact top/horizontal plane

For an isometric top plane whose two axes appear at ±30°:

```css
transform: matrix(
  0.8660254,  0.5,
 -0.8660254,  0.5,
  0, 0
);
```

That means the two local axes project to:

```text
x → ( cos 30°,  sin 30°) = ( .8660254, .5)
y → (-cos 30°,  sin 30°) = (-.8660254, .5)
```

Both projected axes have length exactly `1`, and both are ±30°.

For a **vertical panel face**, which is more relevant to your UI card:

```css
/* one side */
transform: matrix(
  0.8660254, -0.5,
  0,          1,
  0,          0
);
```

which has the much nicer equivalent:

```css
transform: skewY(-30deg) scaleX(0.8660254);
```

For the opposite side:

```css
transform: skewY(30deg) scaleX(0.8660254);
```

The `scaleX(cos(30°)) = 0.8660254` is important. **`skewY(30deg)` by itself is not an equal-scale isometric projection.**

### Exact 3D rotation formulation

For a horizontal plane, an equivalent orthographic orientation is:

```css
transform:
  rotateX(54.7356103deg)
  rotateZ(45deg)
  scale(1.2247449);
```

with **no `perspective()`**.

The source of those two “magic” numbers is:

```text
54.7356103° = atan(√2)
1.2247449    = √(3/2)
```

That is exactly what `isometric-css` uses internally: `ROT_CMA = atan(sqrt(2))` and `SCALE = sqrt(3/2)`. ([GitHub][13])

You will also encounter:

```text
35.2643897°
```

That is not contradictory:

```text
35.2643897° + 54.7356103° = 90°
```

`35.264°` is the classic **camera elevation above the horizontal**. `54.736°` is the complementary rotation applied to the plane.

An equivalent unscaled `matrix3d()` for:

```css
rotateX(54.7356103deg) rotateZ(45deg)
```

is approximately:

```css
matrix3d(
   0.70710678, 0.40824829, 0.57735027, 0,
  -0.70710678, 0.40824829, 0.57735027, 0,
   0,         -0.81649658, 0.57735027, 0,
   0,          0,          0,          1
)
```

But for a normal DOM card, **there is almost no reason to store this as `matrix3d()`**. The 2D `matrix()` is simpler, easier to reason about and avoids creating unnecessary 3D composition concerns.

### A widespread recipe that isn't actually exact

This:

```css
transform: rotateX(60deg) rotateZ(45deg);
```

is continually called “isometric.”

It is **not true 30°/30° isometric**. Its projected axes land at approximately:

```text
±26.565°
```

That's essentially the familiar **2:1 dimetric/pixel-isometric aesthetic**.

Likewise:

```css
rotateX(45deg) rotateZ(45deg)
```

produces approximately ±35.264°, not ±30°.

Codrops' old “isometric” demo uses the 45°/45° variant, illustrating that “isometric” in front-end design has historically often meant *isometric-looking*, not mathematically isometric. ([GitHub][14])

---

# 3. Perspective versus actual isometric projection

True isometry is **parallel projection**. Therefore:

```css
perspective: none;
```

is the mathematically correct choice.

CSS perspective explicitly introduces distance-dependent scaling: positive-Z objects appear larger and negative-Z objects smaller. ([GitHub][15]) The CSS Transforms spec defines `perspective: none` as the initial value. ([CSS Editor Drafts][16])

Without perspective:

```text
parallel lines → remain parallel
same world length → same projected scale
no vanishing point
```

With perspective:

```text
parallel edges → may converge
near edge → larger
far edge → smaller
scale varies with z
```

So once you add:

```css
perspective: 1150px;
```

to an isometric 3D rotation, it is **no longer an isometric projection**.

That doesn't mean it looks bad.

In fact, current UI/mockup tools deliberately do this:

* Screenshot Studio: `2400px`. ([GitHub][4])
* Page UI: `400em`, roughly 6400px at a 16px font size. ([GitHub][6])
* Styly's full 3D phone: `1200px`. ([GitHub][17])

Those values reveal the distinction nicely:

```text
1200px    obvious perspective / physical device
2400px    subtle product-shot perspective
~6400px   near-parallel landing-page tilt
∞         exact orthographic/isometric
```

For your existing `1150px`, increasing it substantially is probably the **single easiest change** to make it feel more axonometric.

I'd test:

```css
.hero-scene {
  perspective: 2800px;
}
```

then roughly:

```css
.card {
  transform:
    rotateY(-16deg)
    rotateX(-5deg);
}
```

before adding any skew.

---

# 4. The “half-isometric” SaaS hero look

There isn't a formal projection called “half-isometric.” It's a visual design category.

The strongest current source example I found is Page UI:

```css
transform:
  perspective(400em)
  rotateY(-15deg)
  rotateX(6deg)
  skew(-8deg, 4deg)
  translate3d(-4%, -2%, 0)
  scale(0.8);
```

([GitHub][6])

Screenshot Studio independently arrives in almost the same area:

```text
Showcase Tilt:
rotateY(18°)
rotateX(6°)
perspective 2400px
```

([GitHub][4])

Its more aggressive “Isometric” preset is:

```text
rotateX(22°)
rotateY(-22°)
scale .95
perspective 2400px
```

([GitHub][4])

From those actual implementations, a useful **UI-text-friendly working range**, not a standard, is:

| Parameter   | Subtle/readable | Strong mockup |
| ----------- | --------------: | ------------: |
| `rotateY`   |          10–18° |        18–25° |
| `rotateX`   |            2–7° |         8–20° |
| skew        |            2–7° |         8–12° |
| perspective |     2400–6000px |   1200–2400px |

Once you get around **30° of skew or large simultaneous X/Y rotations**, I would treat body text as decorative rather than something people are expected to scan quickly.

### A useful parallel “iso-lite” formula

You can generalize the exact isometric vertical-face formula:

```css
transform:
  skewY(var(--angle))
  scaleX(cos(var(--angle)));
```

Modern CSS supports trig functions, but hard-coded values are easy:

```text
8°  → scaleX(.9903)
10° → scaleX(.9848)
12° → scaleX(.9781)
15° → scaleX(.9659)
18° → scaleX(.9511)
20° → scaleX(.9397)
30° → scaleX(.8660)  ← true iso
```

So a highly legible **parallel 2.5D** treatment would be:

```css
.card {
  transform-origin: right center;
  transform: skewY(-12deg) scaleX(0.9781);
}
```

No perspective, no 3D rasterization requirement, no vanishing point.

### For your particular card

I would first try the more conventional SaaS version:

```css
.scene {
  perspective: 2800px;
}

.card {
  transform-origin: right center;
  transform:
    rotateY(-16deg)
    rotateX(-5deg)
    skew(-5deg, 2deg)
    scale(.97);
}
```

Compared with your current:

```css
perspective: 1150px;
rotateY(-26.5deg) rotateX(-5.3deg);
```

this does three things:

1. cuts the strong one-point-perspective effect,
2. makes the face substantially easier to read,
3. uses the skew to supply the “axonometric graphic” cue.

If you want a **clearly true-isometric visual**, use the affine `matrix()` approach instead of trying to tune `rotateX/Y + perspective`.

---

# 5. Shadows

The three techniques solve slightly different problems.

| Technique               | Behavior                                                                        | Use here                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `box-shadow`            | Shadow of the box/border box; gets transformed together with the panel.         | Good ambient/contact shadow.                                                             |
| `filter: drop-shadow()` | Shadow of the rendered alpha mask, including transparent/nonrectangular shapes. | Useful for transparent device shells/screenshots; unnecessary for a normal rounded card. |
| Separate shadow element | Independent geometry, so it can represent a floor/world-space cast shadow.      | **Best visual result** for an isometric floating card.                                   |

CSS defines `box-shadow` relative to the element's box; rounded corners are incorporated. ([CSS Editor Drafts][18])

`drop-shadow()` instead operates on the input image's **alpha mask**. ([CSS Editor Drafts][19])

So with:

```css
.card {
  transform: ...;
  box-shadow: 20px 30px 60px rgb(0 0 0 / .2);
}
```

the shadow is essentially another painted part of that tilted card. It looks like the card has depth/ambient shading, but it is not an independent cast shadow on an imaginary floor.

For a convincing mockup, use:

```html
<div class="mockup">
  <div class="mockup-shadow" />
  <div class="mockup-card">...</div>
</div>
```

where only the card gets the panel transform.

For example:

```css
.mockup {
  position: relative;
}

.mockup-shadow {
  position: absolute;
  z-index: -1;
  left: 12%;
  right: -8%;
  bottom: -8%;
  height: 24%;
  border-radius: 50%;
  background: rgb(0 0 0 / 22%);
  filter: blur(24px);
  transform: translate(18px, 22px) scaleX(.9);
  pointer-events: none;
}
```

The critical part is that the shadow is **not a child of the already-transformed panel** if you want independent world-space geometry.

### `drop-shadow()` performance

The 2026 Filter Effects spec describes filters conceptually as rendering the element/children into an image buffer and processing that buffer before compositing. `drop-shadow()` includes a blur of the alpha mask. ([CSS Editor Drafts][19])

That means a:

```css
filter: drop-shadow(0 40px 60px ...)
```

on a 1000×800-ish surface is potentially much more expensive than it looks. Blur work grows with the affected area and blur radius; GPU acceleration is implementation-dependent. ([web.dev][20])

For a large hero:

* static `box-shadow`: generally the simplest choice;
* static blurred ground-shadow leaf: good;
* `drop-shadow()` on a huge live DOM subtree: use only if its alpha-aware behavior is actually needed;
* **do not animate a large blur radius every frame**; animate `opacity` and `transform` on an already-blurred shadow instead.

There's another important interaction: **`filter` is a grouping property that forces `transform-style: preserve-3d` to flatten on that element.** The same is true for `opacity < 1`, clipping/masking, paint containment, etc. ([CSS Editor Drafts][16])

So don't do:

```css
.scene3d {
  transform-style: preserve-3d;
  filter: drop-shadow(...);
}
```

when `.scene3d` needs descendants to remain at independent Z depths.

Put the filter on a leaf or separate shadow layer instead.

---

# 6. Text rendering and Safari

This is where I would be conservative for your list of links.

### Transformed text can become softer

A rotated/skewed glyph generally doesn't map its edges to the device pixel grid anymore. There's no CSS promise that transformed text retains the exact rasterization it had when axis-aligned.

A few practical consequences:

**Fractional coordinates are not inherently bad.** The old advice “always round transforms to integer pixels” is oversimplified. At DPR=2, for example, `0.5 CSS px` is a physical pixel. Once you've rotated a glyph, much of it is fractional anyway.

**Scaling is usually more visibly harmful than translation.** In particular, avoid rendering text at one raster scale and subsequently magnifying it.

**Ending an animation at `scale(1)` is generally preferable** to leaving live text at e.g. `scale(.83)` or `scale(1.07)` if crispness matters.

### Don't blindly add `will-change`

MDN explicitly warns that `will-change` should be a last resort and can consume substantial resources when left on many or large elements. ([MDN Web Docs][21])

More importantly for this particular problem, forcing a compositor layer can sometimes make text **softer**, not sharper.

So this folklore:

```css
will-change: transform;
```

or:

```css
transform: translateZ(0);
```

is **not a universal “fix blurry text” recipe**.

Tailwind v4's:

```html
transform-gpu
```

literally prepends:

```css
translateZ(0)
```

to the transform. ([Tailwind CSS][22])

I would **not** apply `transform-gpu` by default to your text-heavy card. Benchmark it.

### `backface-visibility: hidden`

Also not a text-quality hack.

Its semantic purpose is simply to hide an element when its back face points toward the viewer. ([MDN Web Docs][23])

If your card never rotates near/through 90°:

```css
backface-visibility: hidden;
```

is unnecessary.

### `preserve-3d`

Same story.

Tailwind's:

```html
transform-3d
```

is simply:

```css
transform-style: preserve-3d;
```

and is useful when **children themselves occupy different Z positions**. ([Tailwind CSS][24])

A single transformed panel doesn't need it.

Reducing unnecessary 3D contexts is particularly sensible on Safari.

### Safari/WebKit has real outstanding edge cases

There are concrete WebKit reports rather than just Stack Overflow folklore.

WebKit bug **278043** reports a case where a **3D-rotated sibling causes text under a scaled parent to be bitmap-scaled/blurry** in Safari Technology Preview while Chrome/Firefox remain crisp. ([WebKit Bugzilla][25])

WebKit bug **290389**, filed in March 2025, reports **pixelated scrolling text when `overflow:auto` and a scale transform are combined**, again reported Safari-only. ([WebKit Bugzilla][26])

And a February 2026 WebKit report documents visible **quantization/jitter with fractional text positioning** in Safari/macOS that the reporter does not see in Chrome/Firefox. ([WebKit Bugzilla][27])

These are specific reproduction cases, not evidence that “all Safari transforms are blurry,” but they're sufficient reason not to build a text-heavy hero out of gratuitous compositing layers.

### `-webkit-font-smoothing` isn't the solution

`font-smooth` / `-webkit-font-smoothing` is **non-standard**; MDN explicitly recommends against relying on it as a normal production CSS feature. ([MDN Web Docs][28])

So I would reject:

```css
-webkit-font-smoothing: antialiased;
```

as a generic “fix my transformed card” recommendation.

---

## What I would ship in your case

Because the card contains a **list of actual links**, not just a screenshot, I would not use full 30° isometry.

My first candidate would be:

```css
.hero-device-scene {
  perspective: 2800px;
}

.hero-device {
  transform-origin: right center;
  transform:
    rotateY(-16deg)
    rotateX(-4deg)
    skew(-5deg, 2deg);
}
```

With a conventional `box-shadow` on the card plus a **separate blurred ground-shadow element**.

If you want it more graphic/axonometric and less photographic, I'd go all the way to **parallel projection**, but only around 10–15° rather than 30°:

```css
.hero-device-scene {
  perspective: none;
}

.hero-device {
  transform-origin: right center;

  /* θ = -12°, scaleX = cos(12°) */
  transform: skewY(-12deg) scaleX(0.978148);
}
```

And if you want the mathematically exact vertical isometric face for comparison:

```css
.hero-device {
  transform-origin: right center;
  transform: skewY(-30deg) scaleX(0.8660254);
}
```

For Tailwind v4, I would use an arbitrary transform for the exact compound value rather than install any plugin:

```tsx
<div
  className="
    origin-right
    transform-[skewY(-12deg)_scaleX(0.978148)]
  "
>
  ...
</div>
```

Tailwind v4 natively supports arbitrary transform values and native 3D utilities, so the older `tailwindcss-3d` plugin is now obsolete for your stack. ([Tailwind CSS][22])

The key correction to most CSS-isometric tutorials is: **30° visual isometry is not `rotateX(60deg) rotateZ(45deg)`; true orthographic isometry uses the 54.7356° complementary angle or, much more conveniently for a live UI face, the exact affine `skewY(30deg) scaleX(.8660254)` / `matrix()` form.**

[1]: https://github.com/elchininet/isometric-css?utm_source=chatgpt.com "GitHub - elchininet/isometric-css: Isometric-CSS is a lightweight JavaScript library to build isometric projections through declarative HTML attributes. · GitHub"
[2]: https://github.com/elchininet/isometric-css/blob/master/src/utilities/matrix.ts "isometric-css/src/utilities/matrix.ts at master · elchininet/isometric-css · GitHub"
[3]: https://www.screenshot-studio.com/changelog?utm_source=chatgpt.com "Changelog - Latest Updates & Features | Screenshot Studio"
[4]: https://github.com/KartikLabhshetwar/screenshot-studio/blob/main/lib/animation/presets.ts "screenshot-studio/lib/animation/presets.ts at main · opennookorg/screenshot-studio · GitHub"
[5]: https://github.com/tercumantanumut/phone3d-css-styly-io "https://github.com/tercumantanumut/phone3d-css-styly-io"
[6]: https://github.com/danmindru/page-ui?utm_source=chatgpt.com "GitHub - PageAI-Pro/page-ui: 📃 Landing page UI components for React & Next.js, built on top of TailwindCSS · GitHub"
[7]: https://github.com/codrops/IsometricGrids/blob/master/js/main.js "IsometricGrids/js/main.js at master · codrops/IsometricGrids · GitHub"
[8]: https://github.com/sambauers/tailwindcss-3d?utm_source=chatgpt.com "GitHub - sambauers/tailwindcss-3d: Add 3D transforms to your TailwindCSS v3 project · GitHub"
[9]: https://tailwindcss.com/blog/tailwindcss-v4?utm_source=chatgpt.com "Tailwind CSS v4.0 - Tailwind CSS"
[10]: https://gist.github.com/abbijamal/d2e3769b16789cd3174e9a7880235fbb?utm_source=chatgpt.com "Isometric CSS Grid experiment in three planes · GitHub"
[11]: https://github.com/zouhangwithsweet/fubukicss-tool "https://github.com/zouhangwithsweet/fubukicss-tool"
[12]: https://github.com/the-dataface/figma2html "https://github.com/the-dataface/figma2html"
[13]: https://github.com/elchininet/isometric-css/blob/master/src/constants/index.ts "isometric-css/src/constants/index.ts at master · elchininet/isometric-css · GitHub"
[14]: https://github.com/codrops/IsometricGrids/blob/master/index.html "IsometricGrids/index.html at master · codrops/IsometricGrids · GitHub"
[15]: https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/values/transform-function/perspective/index.md?plain=1 "https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/values/transform-function/perspective/index.md?plain=1"
[16]: https://drafts.csswg.org/css-transforms-2/?utm_source=chatgpt.com "CSS Transforms Module Level 2"
[17]: https://github.com/tercumantanumut/phone3d-css-styly-io/blob/main/src/components/IPhoneMockup.tsx "phone3d-css-styly-io/src/components/IPhoneMockup.tsx at main · tercumantanumut/phone3d-css-styly-io · GitHub"
[18]: https://drafts.csswg.org/css-backgrounds/?utm_source=chatgpt.com "CSS Backgrounds and Borders Module Level 3"
[19]: https://drafts.csswg.org/filter-effects/?utm_source=chatgpt.com "Filter Effects Module Level 1"
[20]: https://web.dev/articles/understanding-css?hl=en "https://web.dev/articles/understanding-css?hl=en"
[21]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change"
[22]: https://tailwindcss.com/docs/transform?utm_source=chatgpt.com "transform - Transforms - Tailwind CSS"
[23]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backface-visibility?utm_source=chatgpt.com "backface-visibility CSS property - CSS | MDN"
[24]: https://tailwindcss.com/docs/transform-style?utm_source=chatgpt.com "transform-style - Transforms - Tailwind CSS"
[25]: https://bugs.webkit.org/show_bug.cgi?id=278043 "https://bugs.webkit.org/show_bug.cgi?id=278043"
[26]: https://bugs.webkit.org/show_bug.cgi?id=290389 "https://bugs.webkit.org/show_bug.cgi?id=290389"
[27]: https://bugs.webkit.org/show_bug.cgi?id=308463 "https://bugs.webkit.org/show_bug.cgi?id=308463"
[28]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth"

<!-- @web-flow end id=response-20260908071230333-chatgpt -->
