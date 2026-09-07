# Landing — section text arriving on scroll

**Status: decided — CSS transitions driven by IntersectionObserver, plus a
canvas-measured text decrypt on the section headings.**

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

What makes that safe is not the trigger but a separate check: a group is only
eligible to be hidden if its own rectangle is entirely outside the *real*
viewport. Nothing on screen can be hidden even for a frame, because the branch
that hides is not reachable for anything on screen.

Verified: `javaScriptEnabled: false` renders all five section strings;
`data-reveal="pending"` never appears in server output; and no on-screen text is
hidden across a swept range rather than a lucky sample — 124 viewport heights
from 500 to 1100 at four widths, and 31 scroll offsets from 0 to 3000, with the
observer confirmed armed on every load. `history.scrollRestoration` is `manual`
and TanStack restores before the effect runs, so restoration timing was never
the risk.

## CSS or `motion`

Both were built and both were measured. `motion` is already a dependency — five
files use it, all under `budget-2026` and `campaigns` — but nothing on this route
loads it, and `vite.config.ts` gives it a manual chunk of its own. So its cost is
not already amortised into a vendor bundle every visitor pays for: adding it here
would be a new chunk fetched and parsed on the landing. Checked rather than
assumed, by watching the network for `motion`/`motion-dom`/`framer-motion`
modules across a full scroll of the page — including the campaign card, which
shares a feature directory with one of the five: zero requests.

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

Both columns are mostly the page, not the mechanism. Isolated by A/B against a
no-op `IntersectionObserver` over the same scroll, the reveal's own cost is +164
style recalculations and about **0ms** of wall time; the ~60ms below belongs to
the landing's other animations. The table is here for scale, not as evidence.

The runtime difference is therefore not the argument, and it would be dishonest
to present it as one: ~3.6ms of script across an entire page scroll is within the spread of
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

`home-refs.reveal.tsx` owns the stylesheet and the hook; `home-refs.scramble.tsx`
owns the decrypt. Both are marker-driven — the page says *what*, the module owns
*when*.

- **Blocks are watched one by one, not in declared groups.** Groups came first
  and were wrong: a group fires everything the moment its *top* edge appears,
  and a lattice section is tall — an image and four stacked cells — so its lower
  cells arrived several hundred pixels below the fold and were settled before
  anyone saw them. `Investiții publice` began at 135% of the viewport height and
  was three quarters resolved by the time it rose into view. Watching each block
  puts every arrival on screen: 0 of 29 now finish below the fold.
- **Things that appear together still travel together**, because the stagger is
  applied per batch, in document order, rather than per declared group. The step
  is `min(70ms, 280ms / (n - 1))`, so it can only ever shrink — a short batch
  keeps the full 70ms and never slows down to fill the window, and eight cells
  landing at once do not run to 1090ms.
- **Two observers, with different jobs.** The first is the entrance, its trigger
  line held 140px inside the bottom edge so an arrival does not happen at the
  very lip of the screen; measured, an arrival becomes visible at a median 254px
  in. The second watches the *real* viewport edge, hears about a block the moment
  it is genuinely visible — including while it sits in the offset band, where the
  first stays silent — and starts a 700ms clock.

  That second observer is the whole reason the offset is allowed to exist. The
  `-12%` root margin that erased text (below) failed not because it was a margin
  but because it was the *only* thing that could reveal a block: one sitting in
  the band is on screen and hidden, the observer will not speak again until it
  crosses the line, and nothing bounded the wait. The offset shapes the entrance
  during a scroll; the clock guarantees it always ends. Verified by parking
  rather than scrolling, since parking is the case that broke — 57 offsets from
  0 to 3400, each left to settle, worst count of on-screen-and-hidden blocks: 0.
- The transition is declared on the destination state, so applying `pending` is
  an instant hide and only the arrival animates. Nothing ever fades out.
- The rise uses the independent `translate` property, and the transition names
  `translate` — **not** `transform`. Naming `transform` there animates opacity
  alone and silently drops the rise. Confirmed by measuring the *rendered* rise —
  the element's rect while `pending` against its rect plain — which is 12px on
  every block. Sampling computed `translate` mid-flight also shows the curve
  (`12px → 11.57 → 4.55 → 1.56 → 0.48 → 0`), but it is the wrong instrument and
  was how the inline-label bug survived: computed `translate` interpolates on an
  inline box whether or not the box moves.
- A reveal block must not be `display: inline`. `translate` has no effect on a
  non-replaced inline box, so an inline block fades without rising.
- Known residue, harmless today: a `shown` block keeps its `transition-property`
  and its inline `--tpz-reveal-delay` for good, so any *future* opacity or
  translate change on it would animate over 600ms unexpectedly.

## The decrypting headings

The five lattice section headings resolve out of a cipher. Measured off
mega.dev's CTA rather than copied by eye — `Become MEGA Dev` passes through
`M03LSS SMUW Z#J` and `BecomI 6@WT Z94` — which gives the rules: length and space
positions preserved exactly, resolution left to right, substitutes from
uppercase ASCII, and no substitution at all under `prefers-reduced-motion`, where
their page goes straight to the final string.

**A substitute is not the width of the character it replaces.** A free uppercase
cipher runs up to 74% wider than `Investiții publice` — measured — which in a
ruled grid is obvious and on a narrow column wraps the line and shoves the blurb
below it down the page.

The first fix pinned the box to its real width and clipped the overspill with
`clip-path` (not `overflow`: an inline-block whose overflow is not `visible`
takes its baseline from its bottom margin edge, so the text would drop a few
pixels the moment the scramble began). That held the width — 0 of 20 elements
changed — and was still wrong, because pinning forces `white-space: nowrap`, so a
title that legitimately wrapped onto two lines was forced onto one. Seven of
twenty changed height, and 390×844 scored 1.78 cumulative layout shift. Holding
one dimension by force broke the other.

So the alphabet is chosen per character instead: candidates are measured once per
font on a canvas and bucketed by advance width, and a character is only ever
replaced by one that occupies the same space. Nothing is pinned, nothing is
clipped, wrapping behaves as it does for the real text, and cumulative layout
shift is **0.00000** at both 1440×900 and 390×844.

That index is keyed per font and **extended per character**, which is not
fussiness. Keying on the font alone and keeping whatever the first caller needed
is a bug that hides well: every title shares one font, so `Buget național` built
the index, and `PNRR` then asked it for `P`, `N` and `R`, none of which that
title contains. Each missing character took the "nothing close enough, stand in
for itself" path, so PNRR substituted itself at every position and sat there —
the one title on the page that never decrypted, with no error to show for it.

Accessibility is mega.dev's structure, and is the one part of their
implementation worth copying verbatim: an `sr-only` copy carries the real text
and is never touched, the animated copy is `aria-hidden`. So the heading's
accessible name — which the section's `aria-labelledby` points at — stays the
heading throughout, and no screen reader hears the cipher.

## Two things review caught

Both were real, both are fixed, and both are worth recording because the first
one is the contract this whole design exists to keep.

**The trigger line was also deciding what was safe to hide.** `rootMargin` was
`0px 0px -12% 0px`, to hold the arrival back until a group was properly on
screen. But `isIntersecting` is reported against that *shrunk* viewport, so a
group sitting in the bottom 12% was simultaneously plainly visible and formally
"not intersecting" — and got hidden. Server-rendered text, erased about a second
after first paint, with no further callback coming to undo it. Measured: 70px of
the figures strip at 1440×760, and the statement band at 1440×1000. Parked
mid-page it was permanent — 42px of `01 / Ce găsești aici` at y=100.

A 900px-tall viewport falls in the gap between the two ranges where it bites,
which is the only reason the first round of checking came back clean. The lesson
is not "test more heights", it is that a single constant was answering two
different questions.

Fixed by separating the two questions. Hide-eligibility is now judged from
`entry.boundingClientRect` against the *real* viewport rather than from
`isIntersecting`, so nothing on screen can be hidden whatever the margin is set
to. The trigger line went to the viewport edge at the same time, and later came
back to a 140px offset once the safety observer above made an offset survivable —
that ordering matters, because the offset on its own is the bug.

Re-verified at each step: 124 viewport heights across four widths and 31 scroll
offsets with the observer confirmed armed on every load, then 57 parked offsets
after the offset returned. Zero cases of on-screen text hidden throughout.

**The rise was a no-op on the two eyebrow labels.** `MonoLabel` renders a bare
`span`, so `display: inline`, and `translate` does not apply to a non-replaced
inline box. The labels faded while the heading and paragraph beside them rose —
inconsistent motion beside the heading and paragraph, and invisible in code
review. They carry `block` now. Measured rendered rise, every block: 12px.

## Where it is applied, and where it is not

**Arriving:** the national-figures strip, both statement bands (`01 / Ce găsești
aici` and `02 / Proveniență`, including the coverage list), every lattice
section's heading row, and every lattice cell. The cell arrives as a whole rather
than its title and blurb separately — fading text inside a bordered box leaves
the box sitting there empty first, which reads as a loading state rather than as
an entrance.

**Decrypting:** the five lattice section headings only. It was briefly on the
entry titles and the two-line statement heading as well; those are proportional
sans in a ruled grid, and the effect belongs on the short monospace headings that
are its analogue on the reference.

The hero is deliberately excluded. It is on screen at load, so "the first time
it is in view" means "at load", and hiding server-rendered text at load is the
exact failure this design is built to avoid. The hero already has its own
entrance in `home-refs.field-animation.tsx`. If it ever wants a copy reveal too,
mega.dev's *other* mechanism is the one to copy — a plain CSS keyframe with
`both` fill and staggered `animation-delay`, no JavaScript and no hidden state
in between.
