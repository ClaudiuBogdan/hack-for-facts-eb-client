---
version: alpha
name: Transparenta.eu
description: Investigative work surfaces for Romanian public-money transparency
colors:
  background: "hsl(0 0% 99%)"
  foreground: "hsl(0 0% 12%)"
  card: "hsl(0 0% 100%)"
  card-foreground: "hsl(0 0% 12%)"
  popover: "hsl(0 0% 100%)"
  popover-foreground: "hsl(0 0% 12%)"
  primary: "hsl(220 80% 35%)"
  primary-foreground: "hsl(0 0% 98%)"
  primary-hover: "hsl(220 80% 30%)"
  secondary: "hsl(0 0% 96%)"
  secondary-foreground: "hsl(0 0% 10%)"
  muted: "hsl(0 0% 96%)"
  muted-foreground: "hsl(0 0% 45%)"
  accent: "hsl(0 0% 0%)"
  accent-foreground: "hsl(0 0% 100%)"
  destructive: "hsl(0 72% 41%)"
  destructive-foreground: "hsl(0 0% 98%)"
  border: "hsl(0 0% 90%)"
  input: "hsl(0 0% 90%)"
  ring: "hsl(220 80% 35%)"
  sidebar: "hsl(0 0% 98%)"
  sidebar-foreground: "hsl(0 0% 26%)"
  sidebar-primary: "hsl(222 47% 20%)"
  sidebar-primary-foreground: "hsl(0 0% 98%)"
  status-live-bg: "hsl(142 60% 94%)"
  status-live-fg: "hsl(142 70% 25%)"
  status-mock-bg: "hsl(0 0% 95%)"
  status-mock-fg: "hsl(0 0% 25%)"
  status-partial-bg: "hsl(35 90% 93%)"
  status-partial-fg: "hsl(28 90% 28%)"
  status-blocked-bg: "hsl(0 80% 96%)"
  status-blocked-fg: "hsl(0 72% 38%)"
  pnrr-bg: "#fafaf8"
  pnrr-fg: "#1f1f1f"
  pnrr-border: "#1f1f1f"
  pnrr-green: "#b6ff00"
typography:
  page-title:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  section-title:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.02em
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  numeric:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  sm: 4px
  md: 6px
  lg: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
components:
  page-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    padding: 24px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: 12px
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-foreground}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: 12px
  badge-live:
    backgroundColor: "{colors.status-live-bg}"
    textColor: "{colors.status-live-fg}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  badge-mock:
    backgroundColor: "{colors.status-mock-bg}"
    textColor: "{colors.status-mock-fg}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  badge-partial:
    backgroundColor: "{colors.status-partial-bg}"
    textColor: "{colors.status-partial-fg}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  badge-blocked:
    backgroundColor: "{colors.status-blocked-bg}"
    textColor: "{colors.status-blocked-fg}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  sidebar-item:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    padding: 8px
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-primary}"
    textColor: "{colors.sidebar-primary-foreground}"
    rounded: "{rounded.md}"
---

## Overview

Transparenta.eu turns Romanian public-money data into **investigative work
surfaces**: dense, scannable pages that let public-sector analysts and journalists
find and verify anomalies in public spending. This file is the root design
contract for the whole client. It exists in the
[`google-labs-code/design.md`](https://github.com/google-labs-code/design.md)
format so the YAML tokens above are machine-checkable (structure, broken token
references, and WCAG AA contrast) and the prose below tells agents and humans
*why* each decision exists.

**This is a living document.** When we make a design decision while building, we
record it here — update the relevant section and add a line to the
[Decision Log](#decision-log). The deeper, per-domain handoff specs live under
[`docs/design/`](docs/design/README.md); this file is the layer above them: the
shared visual system, the cross-cutting principles, and the index into the domains.

- **Audience:** public-sector analysts, investigative journalists, and the
  implementation agents building for them.
- **Language:** Romanian-first (primary production language), English via Lingui.
- **Stack it targets:** React 19 · TypeScript · TanStack Router · TanStack Query ·
  Tailwind v4 · shadcn/ui (new-york, zinc base) · Recharts/Visx/D3-Sankey ·
  Leaflet + MapLibre.
- **Canonical sources this consolidates:** `src/index.css` (tokens),
  `docs/design/README.md` (foundation), `docs/mock-first-ui-development.md`
  (method), and the eight `docs/design/<domain>/` specs shipped 2026-06-26.

## Design Principles

The non-negotiables. Every page and component is judged against these.

1. **Clean and clear over noisy.** A page surfaces the few things that matter, in
   a strict visual hierarchy, and pushes everything else behind progressive
   disclosure. Three text tiers, not four: a muted label, a strong value, quiet
   metadata. One accent per page. Borders, not shadows. Numbers in tabular figures.
   If an element doesn't change a decision, demote it to metadata or cut it. Dense
   *with signal* is good; noisy is not — density comes from packing relevant
   information efficiently, never from decoration or competing emphasis. The
   **Parliament** and **PNRR** pages are our worked references for this — see
   [Reference Patterns](#reference-patterns-parliament--pnrr).
2. **Work surfaces, not marketing.** Lists, tables, maps, timelines, evidence
   panels, and entity-centric profiles — not decorative dashboards. Scannable
   beats impressive.
3. **Provenance is part of the data.** Every source-derived claim shows its
   source, its publication/retrieval date, and its confidence/coverage caveats
   *next to the result*, never buried in docs. If we can't cite it, we don't
   assert it.
4. **Honest uncertainty is a designed state.** Partial, mock, stale, blocked, and
   name-only data each have an explicit visual treatment. Absence of data renders
   a labeled placeholder, never a blank. Weak or name-based joins are flagged at
   the point of use.
5. **Neutral language, never accusation.** Use `semnal`, `necesită verificare`,
   `diferență`, `concentrare`, `necorelare`. Never wrongdoing labels or guilt
   iconography. A review signal is a prompt to verify, not a conclusion.
6. **Privacy boundaries are structural.** For justice and NGO identity, public
   entities and institutions surface first; individuals are aggregated or redacted
   where exposure isn't essential, and the boundary is explained. This is enforced
   in the Zod schema layer, not just the UI — there is no shape that can render a
   named natural person where the boundary forbids it.
7. **Identity confidence is visible.** When records are linked across sources
   (CUI, SIRUTA, names), the certainty tier — confirmed / candidate / unconfirmed
   / rejected — is shown, and "candidate" matches never masquerade as confirmed.
8. **Mock-first, API-shaped.** Build the best UI before the serving API exists;
   shape mock data like the scraper/source contracts so going live is an adapter
   swap, not a UI rewrite. Join only on stable keys (CUI, SIRUTA, CPV) — never on
   names.
9. **Color encodes status only when redundant.** Any meaning carried by color is
   *also* carried by text, icon, or position. Badges are never the only signal.
10. **Restraint.** Neutral backgrounds, subtle borders, one accent (navy). No
    gradient orbs, bokeh, decorative blobs, or stock atmosphere. No nested cards.
    Large type for page titles only.
11. **Shareable by URL.** Filters, tabs, selected geography, sort, and comparison
    state live in TanStack Router search params with predictable names; the
    default view renders with no params.

## Colors

A high-contrast neutral system with a single navy accent. Color is a status
channel, not decoration.

- **Primary — navy `hsl(220 80% 35%)` (≈ `#1241A1`).** The only brand accent:
  primary actions, links, focus ring, and the first chart series. Dark mode lifts
  it to `hsl(220 80% 64%)` for contrast on dark surfaces.
- **Foreground / background.** Near-black text `hsl(0 0% 12%)` on off-white
  `hsl(0 0% 99%)`. Cards step up to pure white.
- **Accent — pure black/white.** Reserved for the hardest-contrast elements
  (e.g. high-emphasis chips). Not a second brand color.
- **Muted.** `hsl(0 0% 96%)` surfaces with `hsl(0 0% 45%)` text for metadata and
  secondary labels.
- **Destructive.** Used sparingly — this is public-data, not a transactional app.
  Risk/destructive actions are generally kept off these surfaces.

**Status palette (data-trust system).** Each state pairs a tinted container with
a dark label so it reads at AA on any surface and never relies on hue alone:

| State    | Meaning                              | Token pair                            |
| -------- | ------------------------------------ | ------------------------------------- |
| live     | served from a production API         | `status-live-*` (green)               |
| mock     | fixture data, not live evidence      | `status-mock-*` (neutral)             |
| partial  | covered, but with known gaps         | `status-partial-*` (amber)            |
| stale    | live but past its freshness window   | `status-partial-*` (amber) + date     |
| blocked  | source unreachable / access-gated    | `status-blocked-*` (red)              |
| unverified | present but not yet corroborated   | `status-mock-*` + caveat text         |

**Chart colors** are navy-first then neutral steps (`--chart-1…5`): one accent,
then greys, so a series chart never becomes a rainbow. Per-series color is
user-overridable. Maps and charts always ship an adjacent textual/tabular summary.

**Dark mode** uses the same hues at inverted lightness (`.dark` class, SSR-safe
via theme cookie to avoid FOUC). Source of truth for all values: `src/index.css`.

**PNRR brutalist exception.** The PNRR dashboard runs a deliberately separate
token set (`--pnrr-*`): warm off-white, thick black borders, hard offset shadows,
0 radius, and an electric-green `#b6ff00` accent. It is the one sanctioned
departure from the system — quarantined to PNRR surfaces, never leaking into the
neutral investigative pages.

## Typography

One typeface — **Inter** (variable, self-hosted; Noto Sans is the diacritic/IPA
fallback). No second display font, no Google Fonts CDN. Base 16px / 1.5 line
height / `0.02em` tracking.

| Role          | Token          | Tailwind                          | Use                                   |
| ------------- | -------------- | --------------------------------- | ------------------------------------- |
| Page title    | `page-title`   | `text-2xl font-semibold tracking-tight` | First-level H1 only             |
| Section title | `section-title`| `text-lg font-semibold`           | Section/band headers                  |
| Body          | `body-sm`      | `text-sm`                         | Default operational text              |
| Body (long)   | `body-md`      | `text-base`                       | Reading surfaces (legal acts, prose)  |
| Label / meta  | `label`        | `text-xs text-muted-foreground`   | Badges, captions, source chips        |
| Numeric       | `numeric`      | `tabular-nums`                    | Money, CUI, SIRUTA, CPV, vote counts  |

- Reserve large type for page titles. Operational density comes from `text-sm`
  defaults, not from shrinking everything.
- Codes and identifiers (CUI, SIRUTA, CPV, matrix codes like `POP107D`) use
  tabular figures and appear in provenance/secondary text — never as a record's
  primary human label.
- All money, dates, numbers, and percentages use locale-aware formatting (Lingui /
  `Intl`), keyed to the active locale — never hardcoded `ro-RO`.

## Layout

Pages are composed as full-width bands or unframed constrained columns. Cards are
for *repeated records, modals, and genuinely framed tools* — not page scaffolding.

**Canonical page shell** (every domain page follows this spine):

```
PageHeader            — H1, status/family badges, breadcrumb
  → CoverageRibbon    — source · freshness · DataStatusBadge · known gaps
    → Primary band    — winner/summary, list, table, or map
      → Tabs / sections (Radix) — detail behind tabs, never a wall
        → RelatedLinksRail      — narrow cross-entity / cross-domain links
          → Source footer       — provenance, retrieval dates
```

**Container widths:**

| Surface                        | Width                          |
| ------------------------------ | ------------------------------ |
| Reading (acts, profiles, prose)| `max-w-5xl mx-auto px-6`       |
| Search / listing with facets   | `max-w-6xl` (two-column shell) |
| Map / geographic discovery     | `max-w-7xl`                    |

- **Spacing** is an 8px rhythm (`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32`).
- **Filter bars** on list-heavy pages are compact and sticky.
- **Geography domains** use the `MapListSync` pattern: a faceted list and a map
  bound to the same filter/selection state.
- A scrollbar gutter is reserved globally so content width stays stable across
  pages and scroll-locking dialogs.

## Elevation & Depth

Flat by default. Hierarchy comes from **borders and spacing, not shadows**.

- Separation is a 1px `border` (`hsl(0 0% 90%)`), not a drop shadow.
- Shadows are reserved for genuinely floating layers — popovers, dropdowns,
  sheets, dialogs, tooltips — using shadcn defaults.
- No ambient/decorative shadows, no glow, no layered "depth for depth's sake."
- Focus is a 2px `ring` (navy) at `2px` offset, visible for keyboard users and
  suppressed for mouse users (`:focus-visible`).
- The PNRR surface is the exception: it uses hard, offset, non-blurred shadows as
  a brutalist motif — confined to PNRR.

## Shapes

- **Radius caps at 8px** (`rounded.lg`). Scale: `sm 4 · md 6 · lg 8`. Sharper,
  more document-like than a consumer app — appropriate for an evidence surface.
- Pills/fully-rounded shapes are avoided except where a shadcn primitive enforces
  its own local style (e.g. switches, avatars).
- PNRR uses `0` radius by design (see Colors → brutalist exception).

## Motion

Motion here is **arrival and orientation, never decoration**. Three things are
allowed to move: content arriving as the reader reaches it, an indicator
reporting where they are, and ambient scene-setting that is not keyed to
anything they do. Nothing else moves. A page where four things animate is a page
where the reader cannot tell which one meant something.

Worked example: the landing rewrite (`src/development/prototypes/landing/`),
where every number below was measured rather than chosen.

### The three rules that are not negotiable

- **The server never sends a hidden state.** Render content visible in the HTML
  and apply the hidden state client-side, *only to elements that are off screen
  at the time*. A reader whose JavaScript fails or is blocked must get all of the
  words. This is not theoretical: an earlier version keyed hiding to the observer
  margin rather than to real off-screen-ness and erased 70px of a figures strip
  about a second after first paint, at one viewport size that the first round of
  checking happened to miss.
- **Any offset trigger is bounded by a clock.** If an entrance fires when a block
  is *N* pixels past the fold, a second observer at the true viewport edge must
  start a timer that reveals it anyway. Without it, a reader who stops scrolling
  inside the offset band is looking at something the observer will not speak
  about again until it moves. Bound every wait, and where two waits chain — an
  offset clock handing over to a decode wait, say — document the *sum*, because
  the constant nobody reads is the one that lies.
- **Reduced motion keeps the content and drops the flourish.** Not "animate
  faster". Under `prefers-reduced-motion: reduce` the hook must not arm at all,
  so nothing is ever hidden even for an instant, and the CSS must independently
  neutralise every hidden state. Check both halves agree; a rule that hides at
  specificity (0,2,0) is not undone by one that shows at (0,1,0).

### Entrance recipe

The default for a block arriving on scroll. Values are the library's own
recommendations for this pattern, confirmed against our surfaces:

| Property | From → to | Notes |
| --- | --- | --- |
| `opacity` | `0 → 1` | always |
| `translate` | `12–20px → 0` | 12 for text, 20 for a large image |
| `scale` | `0.985 → 1` | optional; never below 0.98 on large artwork |
| `filter: blur()` | `≤5px → 0` | optional, and the expensive one — see below |
| duration | 600–820ms | text at the short end, imagery at the long |
| easing | `cubic-bezier(0.16, 1, 0.3, 1)` | strong ease-out |
| stagger | 70–90ms | capped by a total window (~280ms) so eight siblings do not read as a queue |
| entrance delay | 80–180ms | so a block does not snap the instant it qualifies |

Blur finishes *before* the motion does (≈620ms against 820ms). A picture still
fractionally soft while it settles reads as out of focus rather than as
arriving.

### Trigger geometry

A trigger offset is a **vertical** distance, so it must be bounded by a fraction
of the viewport **height** — never selected by a `max-width` media query alone.
A phone in landscape is wide and short, so a width-keyed breakpoint hands it the
desktop constant against a viewport less than half the height it was chosen for.
Measured, before and after clamping to 35% of viewport height:

| Viewport | Picture top at arrival, before → after |
| --- | --- |
| 1440×900 desktop | 64% → 64% |
| 390×844 phone portrait | 78% → 78% |
| 844×390 phone landscape | **14% → 58%** |
| 932×430 phone landscape | **24% → 65%** |
| 1440×520 short desktop window | **34% → 63%** |

At 14% the reader watched a blank bordered box cover most of the screen and
*then* start arriving — the failure the offset exists to prevent, inverted.

Two consequences. An `IntersectionObserver` cannot be retuned in place, so a
changed offset means a new observer; rebuild on a debounced `resize`, not only
on a breakpoint change. And rebuilding must **skip elements that have already
arrived**, because iOS Safari and Chrome Android fire `resize` when the URL bar
collapses mid-scroll — without the filter, ordinary scrolling re-hides pictures
the reader has already seen.

### Property budget

- **Free:** `opacity`, `transform`, `translate`, `scale`, `rotate`. The
  compositor interpolates these without touching the main thread.
- **Not free:** `filter: blur()`. It can be GPU-accelerated in current browsers,
  but the shader still runs over the whole surface every frame and cost scales
  with **radius × area**. A picture rendering 338×423 CSS px is 1014×1268 device
  pixels at DPR 3 — about 1.8× the desktop surface — which is why the phone gets
  a smaller radius, not the same one. Keep radii ≤ 8px and prefer finishing the
  blur early.
- **`translate`, `scale` and `transform` are separate properties that compose**
  (translate → rotate → scale → transform). That is what lets a JS drag write
  `translate` while a CSS animation owns `transform`, with neither knowing about
  the other. Mind the order: a `scale: -1 1` sits *outside* the transform and
  negates its translation, so a mirrored element needs its direction flipped
  back.
- **Never write a custom property on `:root` during scroll.** It invalidates
  style for everything that could read it. Measured: 25 writes over an 1800px
  scroll took p95 frame time from 18.4ms to 48.5ms at 6× CPU throttle. Write on
  the narrowest host that needs it, where it is free.
- **`will-change` is not a default.** An element with a running `transform`
  animation is already promoted, and adding it changes nothing — measured
  identical layer counts. It *does* become load-bearing under reduced motion,
  where the animation is `none` but JS still writes transforms; removing it there
  dropped 16 composited layers to 11.

### Ambient motion must be able to stop

Anything that animates forever — a drifting background, a looping scene — has to
be gated on an `IntersectionObserver` that pauses it when off screen. This will
not move any frame metric and is not meant to: measured against a paused arm,
frame median, p95 and long-animation-frame counts were identical. What it fixes
is **idleness**. With the drift running, the compositor and Viz threads tick at
60Hz drawing nothing; paused, the compositor logged no tasks at all in 37 of 40
runs. Chromium already throttles to ~7Hz past about 2000px below the fold, so
what the gate covers is the band from the fold out to ~1800px — on a long page,
most of the scroll range.

### Library or not

`motion` is a dependency and its `whileInView` is the idiomatic way to do this in
2026. Use it where an animation is genuinely stateful or needs sequencing. Do
**not** reach for it to interpolate two compositor properties a CSS transition
already interpolates, and be aware that it renders its `initial` state into the
server HTML — which is the one thing the first rule above forbids.

## Imagery

Illustration on this system is **cut-out artwork on transparency**, never a
photograph in a box and never a decorative gradient. Allegory generates safely;
real institutions do not — a rendered building that is almost right undercuts the
one thing the platform sells.

### Delivery

```tsx
<picture>
  <source type="image/avif" srcSet={artAvif} />
  <img
    src={artWebp}
    alt=""
    width={760}
    height={1250}
    loading="lazy"
    decoding="async"
    fetchPriority="low"
  />
</picture>
```

- **Everything that configures loading stays on the `<img>`.** `loading`,
  `decoding`, `fetchPriority`, `width`, `height` and `alt` are the image's own
  properties; a `<source>` has no say in them. No `<source type="image/webp">` is
  needed — the `<img src>` *is* the fallback.
- **Every format must be the same crop at the same pixel dimensions.** A source
  whose intrinsic ratio differs changes the framing depending on which format the
  reader's browser supports — a difference nobody would think to look for.
- **AVIF is worth it at roughly a third off**, but only encoded **from the
  original art**. Re-encoding a shipped lossy WebP compounds loss and cost 18
  levels of alpha error in practice against 5 from the source. On cut-outs the
  alpha channel *is* the silhouette, so keep the alpha plane at quality ~90; 80
  saves a little and doubles the silhouette error.
- **Never upscale.** Cap the rendered scale at or below 1 relative to the art's
  own pixels. Chunky source pixels at 1:1 read as a low-resolution asset next to
  crisp type; if a slot needs something bigger, use a bigger silhouette rather
  than a magnified small one.

### What is and is not true about lazy loading

`loading="lazy"` is the right default and does not need replacing with an
`IntersectionObserver`. But its threshold is generous and **images close to the
fold loading before any scroll is correct behaviour, not a bug**: Chromium's
look-ahead is 1250px on 4G and 3000px when the effective connection type is
unknown — which includes localhost, because the network quality estimator does
not sample loopback. Measure distance below the fold before concluding anything.

`decoding="async"` schedules a decode; it does not promise one has happened. If
an entrance animation can fade onto an image the browser has not finished
reading, gate the arrival on `img.decode()` **at the moment the element is
reached**, not at mount — a grace started at mount has already expired by the
time anyone scrolls to a below-the-fold image. Bound the wait, and let a
rejection release it so a broken image never holds its cell blank.

One trap: `width`/`height` do **not** reserve the box when the CSS sets
`width: 100%; height: 100%` on an absolutely-positioned image. The containing
cell's `aspect-ratio` does that work. Write the attributes anyway — they are
true, and they start mattering again the moment the positioning changes — but do
not claim in a comment that they are preventing layout shift when they are not.

## Components

Build on shadcn/Radix primitives in `src/components/ui/` (55 present) before
inventing anything. Prefer `Button`, `Badge`, `Tabs`, `Table`, `Sheet`,
`Dialog`, `Tooltip`, `Select`, `MultiSelect`, `EmptyState`, and the existing
filter tags. Propose a new cross-domain component only when **two or more domains**
need the same pattern.

**Shared data-trust system** (the cross-cutting components that make provenance a
first-class citizen — consolidating under `src/components/data-trust/`,
`src/components/identity/`, and `src/components/provenance/`):

| Component                | Purpose                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| `CoverageRibbon`         | Page-level source / freshness / known-gap summary band            |
| `DataStatusBadge`        | `live · mock · partial · stale · blocked · unverified` state      |
| `SourceProvenanceDrawer` | Source URL, scraper reference, retrieval/publication dates, caveats|
| `EvidenceLink`           | Inline link to a document, publication entry, or source row       |
| `FreshnessBadge`         | `actualizat la` / `publicat la` / `date până la`                  |
| `IdentityConfidenceBadge`| confirmed / candidate / unconfirmed / rejected, with explanation  |
| `PrivacyBoundaryNotice`  | Why a record is aggregated, redacted, or withheld                 |
| `ReviewSignalBadge`      | Neutral verification prompt — never implies wrongdoing            |
| `RelatedLinksRail`       | Narrow cross-domain links for the current entity/geography/source |
| `MapListSync`            | Synchronized map + result list for geography-heavy domains        |
| `ShareFilteredView`      | Copy-current-view affordance for filtered investigative states    |
| `RequestDatasetAction`   | CTA to request missing or blocked public data                     |

> **Single-owner rule.** Each of the above has exactly one canonical
> implementation and one prop contract. The 2026-06-26 integration review found
> these forked across domains (four `IdentityConfidenceBadge`s, six+
> `SourceProvenanceDrawer`s, three unrelated `CoverageRibbon`s under one name).
> Consolidation is the top design-debt item — see the Decision Log.

**Buttons** use the navy accent on interactive states. **Status badges** use
tinted-container + dark-label pairs (never hue alone). **Cards** are `8px`,
`16px` padding, single-level (no nesting).

## Reference Patterns (Parliament & PNRR)

`/parlament` and `/pnrr` are our worked examples of clean, low-noise UI. New
pages should reuse their **structure and clarity techniques** — that is what
Principle 1 points at.

> **Reuse the structure, not the skin.** Parliament wears a GOV.UK palette (chamber
> greens/crimsons/purples on warm gray `#f3f2f1`) and PNRR wears a brutalist skin
> (`--pnrr-*` tokens, neon `#b6ff00`, `0` radius, hard `2px` black borders, offset
> shadows). Those are **page-level brand identities** and stay on their own
> surfaces. The default skin for every other page is the neutral-navy system above.
> Both reference pages stay clean for *structural* reasons that are entirely
> skin-agnostic — port those.

### Clarity techniques (adopt everywhere)

- **Three-tier text hierarchy, never four.** Muted label
  (`text-xs font-semibold uppercase tracking-wide text-muted-foreground`) → strong
  value → quiet metadata. *Ref:* PNRR `InsightCard` (`PnrrOverview.tsx`), parliament
  `lib/hub-theme.ts`.
- **One accent, used semantically and sparingly.** PNRR's green appears only on the
  active tab indicator, filter chips, and focus rings; parliament carries status in
  a single `w-[5px]` left border, not a background fill. Color is always redundant
  with text/icon/position.
- **Borders, not shadows or gradients.** Flat, bordered cards; shadows reserved for
  truly floating layers. The legacy `PnrrStatsRibbon` gradient was *replaced* by the
  flat `InsightCard` precisely because the gradient added noise.
- **Summary-first, then progressive disclosure.** Lead with 3–4 KPIs; show top-N
  with an expand affordance; collapse routine/secondary items behind a toggle.
  *Ref:* PNRR overview (KPIs → ranked top-5 → map → top-10 beneficiaries), parliament
  `BillPassageTracker` (routine procedural steps collapse).
- **Stacked section bands, one rhythm, no nested cards.** A single `max-w-*` column
  with `space-y-8`/`space-y-10`; sections are flush bands, not cards-in-cards.
- **Tabular figures on every number.** `tabular-nums` so columns don't jitter and
  data reads as data.
- **Inline proportion fill instead of a chart library** for ranked lists — an
  absolutely-positioned bar at low alpha behind each row. *Ref:* PNRR `RankedListCard`.
- **Compact number split** — big amount, small unit (`28.5` / `mld. EUR`) via
  `Intl.NumberFormat.formatToParts`. *Ref:* `pnrr-compact-currency-display.ts`.
- **Theme constants per surface.** Class strings live in a `*-theme.ts` file that
  components import; they never hardcode their own. *Ref:* `src/features/parliament/lib/*-theme.ts`.
- **No-JS tab indicator** — an `h-[3px]` underline toggled by `opacity` on the active
  `<Link>`. *Ref:* `ParliamentTabNav`.
- **Skeletons that match the real layout**, with `aria-busy`/`aria-label`. *Ref:*
  `PnrrContentSkeleton`, `MembersTableSkeleton`.

### Reusable structural components (promote to shared)

These are skin-agnostic — they reference page tokens only for color, so re-skinning
to neutral-navy is a token swap.

| Pattern                         | Reference implementation                                   | Reuse for                                              |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| KPI / stat tile                 | PNRR `InsightCard` (`PnrrOverview.tsx`)                     | Every domain landing's headline band                   |
| Ranked leaderboard + fill bar   | PNRR `RankedListCard` / `BeneficiaryValueCard`             | Procurement top authorities/suppliers, investments     |
| Selectable signal tile          | PNRR `AnomalyTile` (`PnrrAnomalyRibbon.tsx`)              | Anomaly/review-signal ribbons                          |
| Stacked segment bar (no chart)  | PNRR `PnrrFundingBar`                                       | Funding splits, absorption, composition                |
| Section card (header band+body) | Parliament `ParliamentHubSection`                          | Any framed content section                             |
| Page frame + back link          | Parliament `ParliamentPageFrame` / `ParliamentBackLink`   | Standard detail-page wrapper                           |
| Clickable card anatomy          | Parliament `VoteChamberVoteCard` / `BillListCard`         | Title band · data columns · metadata footer · 5px accent |
| Detail page shell               | Parliament `MemberProfileLayout`                           | breadcrumb band → hero → sidebar/content grid          |
| Sticky compact header on scroll | PNRR `PnrrHeader` (extract a `useStickyHeader` hook)       | Feature pages with their own full header               |
| Active-filter chip strip        | PNRR `PnrrActiveFilters` / parliament `MembersActiveFilters` | Any list page (renders `null` when empty)           |
| Map + legend + toolbar + sheet  | PNRR `PnrrMapView` + `PnrrMapDetailsDrawer`                | `MapListSync` for `/investitii-publice`, `/statistici` |
| Deferred render + CLS guard     | PNRR `DeferredOverviewSection`                              | Heavy below-the-fold sections                          |

When two domains need one of these, lift it into `src/components/` with a
neutral-navy default skin rather than re-implementing per domain — the same
single-owner rule that applies to the data-trust components.

## Do's and Don'ts

**Do**

- Lead with 3–4 headline KPIs, then progressive disclosure; collapse routine or
  secondary items behind a toggle.
- Hold a strict three-tier text hierarchy (label → value → metadata) and tabular
  figures on all numbers.
- Reuse the Parliament/PNRR structural patterns (stat tile, section card, ranked
  list with fill bar, chip strip, layout-matching skeletons) — see Reference Patterns.
- Show source, date, and confidence next to every claim.
- Render explicit states for partial / mock / stale / blocked / name-only data.
- Keep status meaning in text + icon + position, with color as reinforcement.
- Use tables for comparison, lists for scanning, maps for distribution, timelines
  for lifecycle/order.
- Put shareable state in the URL; let the default view render with no params.
- Reuse the data-trust components and the canonical page shell.
- Render content visible from the server and hide it client-side only, only when
  it is genuinely off screen.
- Bound every offset trigger with a safety clock, and document the *sum* when two
  waits chain.
- Gate anything that animates forever on visibility, so the page can reach idle.
- Ship illustration as AVIF + WebP through `<picture>`, encoded from the original
  art, at identical crops and dimensions.
- Settle the animations before reading any contrast result.

**Don't**

- Don't nest cards, add gradient/bokeh/decorative backgrounds, or use radius > 8px.
- Don't add a fourth text-emphasis level or a second accent hue per page, or a
  second display font.
- Don't spread the PNRR brutalist skin or the Parliament GOV.UK palette beyond
  their own surfaces — reuse the structure, re-skin to neutral-navy.
- Don't reach for a chart library when an inline proportion fill conveys the
  magnitude.
- Don't present a ratio/KPI as currency, or sum mixed-currency values into a fake
  total.
- Don't link two records without showing *why* they're connected (shared CUI,
  source ID, dates) — and flag weak/name-only joins.
- Don't name or make searchable a natural person where the privacy boundary
  forbids it.
- Don't let mock data read as live evidence — `DataStatusBadge` must say `mock`.
- Don't hardcode `ro-RO` or bypass Lingui for any user-facing string, including
  SEO/head metadata.
- Don't ship a hidden state in the server HTML — not for text, and not via a
  library's `initial` prop.
- Don't select a vertical trigger distance with a `max-width` media query; a
  landscape phone is wide and short.
- Don't write a custom property on `:root` during scroll, and don't add
  `will-change` next to an already-promoting animation.
- Don't animate `filter: blur()` on a large surface, or exceed ~8px; the shader
  cost scales with radius × area.
- Don't upscale cut-out artwork, and don't re-encode a shipped lossy image into
  another lossy format — go back to the original.
- Don't pair a hard-coded background with an inherited foreground, or trust a
  `text-*/50` caption to pass AA.

## Accessibility

Target **WCAG 2.2 AA**. The obligations below are the ones this system keeps
getting wrong; the rest is the usual semantic HTML and Radix primitives that
shadcn already gives us.

### Auditing

```bash
node scripts/audit-page.mjs '<url>' --scope '[data-dev-marker]'
```

Two things that script does are the difference between a real result and a
comforting one, and both were learned by getting it wrong first:

- **Settle the animations.** axe files an element caught mid-fade as
  `incomplete` rather than as a violation. The same page reported **3**
  colour-contrast failures with entrances running and **21** with
  `prefers-reduced-motion` forced. A sevenfold undercount that looks clean.
- **Scope to the surface under test.** A prototype renders inside the real app
  shell, so most findings belong to the sidebar and the shell footer. Of 41
  violation nodes on the landing page, **19 were the shell** — report them
  separately rather than dropping them or claiming them.

Automated coverage is partial. Deque's own figure for axe-core is about **57%
detection** on their dataset — not a compliance score, and no automated tool can
determine conformance. Keyboard order, focus restoration, whether a screen
reader's announcement makes sense, and whether an entrance is disorienting are
outside what any of this sees.

### Colour

- **A hard-coded background needs a hard-coded foreground.** A button painted
  `bg-[#3565c4]` that lets its text take the variant's foreground agrees with
  that background in exactly one theme; in the other it resolved to `#1a1a1a`
  and measured 3.15:1.
- **A fraction of a colour is a fraction of its contrast.** `text-*/50` on a
  10px caption cannot pass AA — and check the base token first, because if the
  token at full strength is already marginal (ours measures 4.34:1 on the muted
  card) then every step below it fails by construction and no amount of nudging
  the opacity helps.
- Below 18pt the requirement is **4.5:1**, not the 3:1 large-text allowance. Most
  of our micro-labels are 10px.

### Landmarks

- **One navigation landmark per region, with a unique role + accessible name.**
  Two `nav`s both named "Legal" are indistinguishable in the landmark list, which
  is the one place landmarks are actually used. Prefer a single named `nav` with
  headings inside over one landmark per column.
- `display: contents` on a landmark is safe in current browsers — the role and
  name still resolve — which makes it the right way to add a landmark without
  disturbing a grid. Verify rather than assume; this was historically broken.

### Recorded exceptions

An exception is a decision, and it belongs here rather than in a silent audit
diff. Currently: the landing page's mono captions (`text-muted-foreground/50`
through `/70` at 10px, 21 elements, worst 1.95:1) are **knowingly below AA**. The
judgement is that they are secondary to the information beside them. Noted
against it: two of the twenty-one are footer column headings, which name a
navigation group rather than decorate it.

## Data Trust & Provenance

This is the product's spine, so it gets its own contract beyond the component list.

- **Three-or-more sources per entity.** A single CUI can carry ONRC identity, ANAF
  fiscal status, SEAP procurement, AMEPIP/MFin financials, PNRR grants, and court
  references — each with its own retrieval date and trust level. The UI must let a
  reader trace any figure back to one source.
- **Lineage mode is explicit.** Source metadata carries `mode: live | sample |
  mock`; a sample/mock value can never be silently promoted to evidence.
- **Coverage gates are pre-computed.** Aggregate responses carry their own
  coverage grade / capability gate so the UI can annotate or gate a view without a
  second request.
- **Freshness is derived, not invented.** "Up to date" is computed from the data
  period the source actually published — we do not fabricate a "last sync" field.

## Mock-First Contract

(Full method: [`docs/mock-first-ui-development.md`](docs/mock-first-ui-development.md).)

- Each feature lives under `src/features/<domain>/` with `api/<domain>-api.ts`
  (dispatcher), `…-api.mock.ts`, `…-api.live.ts`, `mocks/fixtures/`, plus a Zod
  schema in `src/schemas/<domain>.ts`. The dataset is registered in
  `src/lib/scraper-references/catalog.ts`.
- Dispatch is `isMockDataEnabled('<dataset-id>')` — controlled by
  `VITE_USE_MOCK_DATA` (global) or `VITE_MOCK_DATASETS` (comma-separated
  allowlist). Unset = fail loudly, never silently return empty.
- Going live = implement `…-api.live.ts` (map server DTO → the same Zod schema),
  drop the `assertLiveApiAvailable()` guard, flip `apiReady` in the catalog.
  Fixtures stay as test backing data.
- **Field names match the scraper's serving columns exactly.** Don't invent
  fields; if a UI decision needs a field not in the source, mark it an assumption
  and verify against the scraper project.

## Domain Map

Eight domains shipped mock-first on 2026-06-26. Each has a full spec under
`docs/design/<domain>/` (`ux.md`, `design.md`, and per-feature files). Update the
domain spec first when a domain decision changes; reflect cross-cutting changes
here.

| Domain              | Route                  | Spec                                   | Anchor / signature concern                          |
| ------------------- | ---------------------- | -------------------------------------- | --------------------------------------------------- |
| NGOs                | `/ong-uri`             | `docs/design/ngos/`                    | Identity tiers; name-only refs zone; CUI spine      |
| Public companies    | `/intreprinderi-publice`| `docs/design/public-companies/`       | AMEPIP live lane; gated tabs; KPI-vs-currency guard |
| Legal               | `/legislation`         | `docs/design/legal/`                   | Monitorul Oficial evidence; citation resolution honesty |
| Elections           | `/alegeri`             | `docs/design/elections/`               | Results ≠ roll-call votes; candidate names as source only |
| Justice             | `/justitie`            | `docs/design/justice/`                 | Structural privacy; entities named, persons aggregated |
| Procurement         | `/achizitii`           | `docs/design/procurement/`             | Grain selector; honest money; neutral review signals|
| Public investments  | `/investitii-publice`  | `docs/design/public-investments/`      | SIRUTA spine; `AmountWithEvidence`; map+list         |
| Statistics (INS)    | `/statistici`          | `docs/design/statistics/`              | 27-vs-1,898 dataset gap; coverage-gated map levels   |

**Cross-domain join keys (safe):** `CUI` (entities/fiscal/procurement/grants),
`SIRUTA` (geography/investments/INS), `CPV` (procurement categories), `ECLI`
(jurisprudence), `document_id` (legal acts), `id_angajament` (PNRR). **Never
auto-join on names** (NGO ↔ company, candidate ↔ official, supplier ↔ supplier).

## Decision Log

Append-only. Newest first. Each entry: date · decision · why.

- **2026-09-07 — Illustration ships as a cut-out through `<picture>`, AVIF ahead
  of WebP, encoded from the original art.** Same crop and identical pixel
  dimensions in every format; all loading attributes on the `<img>`; the alpha
  plane kept at quality ~90. Measured on three statues: 404KB to 267KB, a third
  off, with colour error within half a level of the WebP it replaces and alpha
  error at most 5. *Why:* on a cut-out the alpha channel is the silhouette, so
  the usual "just re-encode it" shortcut is the one thing that breaks it — AVIF
  from the shipped lossy WebP cost 18 levels of alpha error, and dropping the
  alpha plane to 80 doubled it for 10KB. Recorded too because a wrong crop is
  invisible to file size and obvious to an alpha diff: one of ours disagreed with
  the shipped file by 252 levels before we noticed the source had never been
  cropped at all, only resized.

- **2026-09-07 — Accessibility is audited with one command, animations settled
  and the surface scoped.** `scripts/audit-page.mjs` runs axe-core in the
  Playwright Chromium the repo already installs. *Why:* both flags exist because
  the naive run lies. Elements caught mid-fade are filed `incomplete` rather than
  as violations — 3 reported contrast failures became 21 once entrances were
  settled — and a prototype rendering inside the real app shell attributes the
  shell's problems to itself, 19 of 41 nodes in our case. The landing's mono
  captions are a **recorded exception**, knowingly below AA, on the judgement
  that they are secondary to the information beside them.

- **2026-09-07 — Motion is arrival, orientation and ambience; nothing else
  moves.** Entrances are CSS transitions on compositor properties, triggered by
  one observer per surface; trigger offsets are bounded by a fraction of viewport
  *height*; ambient animation is gated on visibility. Full contract under
  [Motion](#motion). *Why:* three failures drove the three rules. Keying the
  hidden state to an observer margin rather than to real off-screen-ness erased
  70px of content a second after paint. Selecting a vertical offset by viewport
  *width* left a landscape phone watching a blank box cover 86% of the screen
  before it began to arrive. And a perpetual drift kept the compositor at 60Hz
  drawing nothing, which no frame metric shows — it is an idleness cost, not a
  frame cost, so the gate that fixes it will always look like it did nothing.

- **2026-09-05 — Design variants are prototyped at `/development/*` under
  `yarn dev` only, and promoted by moving code.** Variants live in
  `src/development/prototypes/<domain>/<name>.prototype.tsx`, render inside the
  real app shell, and are compared at `/development/<domain>/<name>?v=a,b`.
  Production builds answer 404 on the routes, images contain none of the
  directory, and a build validator plus an integration test keep it that way. The
  winner is recorded in the feature's design doc, moved into `src/features/`, and
  the prototype deleted in the same commit. *Why:* the route tree is generated and
  committed, so a route per prototype would touch it on every experiment; three
  guarded stubs plus glob discovery touch it once. The gate is
  `import.meta.env.DEV` rather than `VITE_APP_ENVIRONMENT`, because the deployed
  `dev` environment sets the latter to `development` while being a production
  build. Standard: [`docs/design/prototyping.md`](docs/design/prototyping.md).

- **2026-08-04 — A detail page ranks its blocks: one lead, one action, one
  accordion for everything else.** On `/legislation/acts/$actId` the summary is
  the only open card. Every block below it — relevance, key dates, publication
  proof, amendment timeline, both citation directions, article structure, and the
  catalogue of data limits — is a row of a single accordion, closed, mounting its
  content only when opened. The page's outbound action (the official text) is a
  solid button in the header rather than an underlined link in the eighth card
  down. The header itself is two columns, with act type, issuer, entry into force
  and aliases joined into one line instead of four. Counts are stated once: the
  header dropped the three stat chips that restated the amendment, citation and
  structure totals of the blocks below it. A taxonomy gets one chip shape,
  distinguished by fill, not three distinguished by border weight.
  *Why:* eleven sibling cards of identical weight is not a hierarchy, it is a
  list of containers, and the reader has to rank them personally. Principle 1
  says an element that does not change a decision gets demoted or cut — so the
  duplicated counts went and keywords dropped from chips to a line of text.
  Collapsing a block is not hiding it, provided the closed row still answers its
  own question: every row carries a count, and the relevance row puts its actual
  answer — the affected audiences — in the row itself. The caveats collapse on
  the same terms, because every claim they qualify is still stated where it is
  made: the mock badge beside the status badge, the AI notice along the bottom of
  the summary, "potrivire posibilă" on the citation row itself. Measured on the
  Codul Fiscal, the worst case in the corpus: 3.226px → 2.076px, header 335px →
  ~200px.

- **2026-08-04 — Border weight encodes altitude: heavy for page chrome, one
  hairline for everything inside it.** On `/legislation`, 2px near-black
  (`--pnrr-border`) is now reserved for page-level chrome — the header edge and the
  tab nav. Everything inside a tab draws a single 1px `--pnrr-subtle` hairline: the
  section container, the rule under a heading, and the rules of a grid. Containment
  comes from the card *fill* standing against the warm page background, not from
  stroke weight. Grids rule on each cell's **top and left**, so a rule only ever
  falls between two cells and never trails past the content; where the data does not
  fill the final row, empty cells close the rectangle, computed per breakpoint
  because the column count changes with it. Footnotes carry no rule — quiet type
  already demotes them.
  *Why:* the page previously ran four separator languages at once (2px black, 1px
  black, two greys), applying a 2px box, a 2px header rule, a 2px footnote rule and
  a cell lattice to every section. Nothing read as primary, every heading was walled
  off from the content it introduced, and inert label grids looked like spreadsheets.
  Principle 1 says hierarchy comes from borders *and spacing*; spacing was doing none
  of the work. One weight per altitude restores the hierarchy without giving up the
  brutalist skin, which stays quarantined to this surface as before.
- **2026-06-26 — "Clean and clear over noisy" set as Principle 1**, with Parliament
  and PNRR named as the worked references and a Reference Patterns section added.
  *Why:* the product owner wants a low-noise interface; those two surfaces already
  achieve it, so we codify their *structural* clarity techniques (three-tier
  hierarchy, one accent, borders-not-shadows, summary-first disclosure, tabular
  figures, inline fill bars) as the shared standard — while keeping their *skins*
  (GOV.UK palette, brutalist tokens) on their own pages.
- **2026-06-26 — Root DESIGN.md created** in the `design.md` format, consolidating
  `src/index.css` tokens + the `docs/design/` foundation into one living,
  lint-checkable contract. *Why:* give agents and humans one normative source for
  the shared visual system and cross-cutting principles, above the per-domain specs.
- **2026-06-26 — Eight domains shipped mock-first.** UI built ahead of serving
  APIs, fixtures shaped to scraper contracts, `isMockDataEnabled()` dispatch.
  *Why:* the upstream datasets are still experimental; lock the UX now, integrate
  by adapter later.
- **2026-06-26 — Privacy enforced in schema, not UI** (justice persons,
  NGO identity). *Why:* a UI-only guard can be bypassed; a schema with no
  named-person shape cannot.
- **2026-06-26 — Romanian path slugs** for new public domains (`/ong-uri`,
  `/achizitii`, `/legislatie`, `/alegeri`, `/justitie`, `/investitii-publice`,
  `/statistici`, `/intreprinderi-publice`). English technical routes already
  shipped stay as-is. *Why:* Romanian-first audience; stable, understandable URLs.
- **2026-06-26 — PNRR keeps its brutalist token set**, quarantined to PNRR
  surfaces. *Why:* it predates this system and tested well; isolating it avoids a
  disruptive reskin while keeping the rest of the app on the neutral system.

### Known design debt / follow-ups

From the 2026-06-26 UI integration review (383 findings). These are *design*
obligations, tracked here until closed:

- **Consolidate forked trust components** to single owners under
  `src/components/data-trust/` (`IdentityConfidenceBadge`, `SourceProvenanceDrawer`,
  `CoverageRibbon`, `EvidenceLink` currently fork across domains with incompatible
  prop contracts). *Highest priority.*
- **Privacy/telemetry:** keep justice case IDs out of analytics path segments;
  ensure `PrivacyBoundaryNotice` on every NGO name-only surface; mark
  person-linked elections data `privacySensitive`.
- **Routing:** global search must route `ngo` → `/ong-uri/$cui`,
  `public_enterprise` → `/intreprinderi-publice/$cui`, legal hits →
  `/legislatie/acte/$id`; unknown IDs return 404, not throw. Fix sidebar
  active-state prefix matching.
- **Derive `DataStatusBadge` state** from gate + mock mode instead of hardcoding
  `status="mock"`; reconcile divergent enum semantics across domains.
- **i18n:** purge Romanian strings left in the English catalog; route head/SEO
  metadata through Lingui; locale-aware dates everywhere.
- **Public investments:** replace the static CSS scatter "map" with a real
  interactive map; consume the parsed landing URL state.
