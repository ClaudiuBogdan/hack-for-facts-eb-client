# Landing — section text arriving on scroll

**Status: decided — CSS transitions driven by one IntersectionObserver.**

Reference: [mega.dev](https://mega.dev). What follows was measured off the live
site rather than eyeballed, because the interesting parts of the effect are the
timings and the failure mode, and neither is visible from a screenshot.

## What mega.dev actually does

Hooking `Element.animate` and scrolling the page reports 80 calls, all of them
`{ opacity: [0, 1] }`, against these options:

| | |
|---|---|
| Duration | 550–700ms (600 is the mode) |
| Easing | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Stagger between siblings | 60–80ms |
| Fill | `both`, one iteration |
| Trigger | first entry only; the inline style is removed once it has run |
| `prefers-reduced-motion: reduce` | **zero** `animate` calls — the effect is dropped, not shortened |

Two things it is *not*. It is not per-character or per-word: the targets are
whole blocks — a paragraph, a heading, a list item, the four corner marks around
the manifesto. And the stagger is not per-element triggering. Every element in a
group is called in the same millisecond (`t: 5819ms` for all five `program__day`
items) and separated by `delay` alone, which means one observer per *group*, not
per block. The rise comes from the pre-set hidden state, which carries
`translateY` of 10px, 12px, 14px or 18px depending on the block.

## The one thing not copied

mega.dev ships the hidden state in its server-rendered HTML — 114 elements
carrying `style="opacity:0;transform:translateY(…)"` before any script runs. If
the JavaScript fails, is blocked, or simply has not arrived yet, that text is
invisible and stays invisible.

On this site the text *is* the product, so the direction is inverted: the server
renders every block plainly visible, and the hidden state is applied by the
observer, client-side, only to groups it reports as off screen. Groups already
on screen go straight to their final state and are never hidden even for a
frame, so there is nothing to flash. No JavaScript therefore means no animation
and all of the words, which is the correct way round.

Verified: `javaScriptEnabled: false` renders all five section strings;
`data-reveal="pending"` never appears in server output; reloading parked at
`y=2400` shows zero frames with on-screen text hidden.

## CSS or `motion`

Both were built and both were measured. `motion` is already a dependency, but
nothing on this route loads it.

**Bundle**, bundled and minified through esbuild, React external:

| | raw | gzip | brotli |
|---|---|---|---|
| CSS transitions + `IntersectionObserver` | 1,748 B | **899 B** | 751 B |
| `motion` `inView` + `animate` | 64,600 B | **23,212 B** | 21,145 B |

**Runtime**, median of 5 runs, 60-step scroll of the whole page at 1440×900:

| | script | recalc style | layout | long frames | long-animation-frame blocking |
|---|---|---|---|---|---|
| CSS | 13.6ms | 60.4ms | 1.1ms | 0 | 0ms |
| `motion` | 17.2ms | 65.6ms | 0.4ms | 0 | 0ms |

The runtime difference is not the argument, and it would be dishonest to present
it as one: ~3.6ms of script across an entire page scroll is within the spread of
the runs, and neither variant produced a single long animation frame. The reason
is that `motion` 12.43 does not animate this on the main thread. Inspecting
`document.getAnimations()` mid-reveal returns real `KeyframeEffect`s for both
`opacity` and `transform`, so it hands the work to the compositor exactly as the
CSS does.

So the decision rests on the 25× bundle difference for an identical result, and
on not making a route depend on an animation library to interpolate two values
the compositor already interpolates. If something later needs springs,
interruption, or layout animation, that trade reverses and `motion` is already
installed.

## Shape

- `home-refs.reveal.tsx` owns the stylesheet and the hook. One observer for the
  whole landing, `unobserve` per group once it has arrived, so the callback stops
  being called at all when the last one lands.
- The page marks a `data-reveal-group` for what travels together and `data-reveal`
  on each block. The hook assigns `--tpz-reveal-delay` from the block's index
  within its group, so each group staggers from zero rather than continuing one
  counter down the page.
- The transition is declared on the destination state, so applying `pending` is
  an instant hide and only the arrival animates. Nothing ever fades out.
- The rise uses the independent `translate` property, and the transition names
  `translate` — **not** `transform`. Naming `transform` there animates opacity
  alone and silently drops the rise. Confirmed by sampling computed `translate`
  mid-flight: `12px → 11.57 → 4.55 → 1.56 → 0.48 → 0.12 → 0`.

## Where it is applied, and where it is not

The three bands below the fold: the national-figures strip, `01 / Ce găsești
aici`, and `02 / Proveniență`.

The hero is deliberately excluded. It is on screen at load, so "the first time
it is in view" means "at load", and hiding server-rendered text at load is the
exact failure this design is built to avoid. The hero already has its own
entrance in `home-refs.field-animation.tsx`. If it ever wants a copy reveal too,
mega.dev's *other* mechanism is the one to copy — a plain CSS keyframe with
`both` fill and staggered `animation-delay`, no JavaScript and no hidden state
in between.
