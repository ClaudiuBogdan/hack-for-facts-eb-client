# Parliament's skin as named tokens: design

Owner's decision (2026-11-21): keep parliament's GOV.UK-style skin, but define it once as named tokens instead of
hex values written into every class. Light mode looks exactly as it does today. Every token gets a dark value that
reads, so dark mode stops borrowing PNRR's tokens and stops showing text the reader cannot see. Statistics and PNRR
are not part of this pass: statistics' CSS is layout, not colour, and PNRR's skin is small and separate.

## Why

- **Size.** After the learning pass, parliament is the largest feature share of the global stylesheet: 21,707 bytes
  minified that only parliament uses (`css-attribution.mjs`, `DETAIL=src:features/parliament`). 11,135 of those are
  131 arbitrary colour classes: 48 distinct hex values (`text-[#505a5f]`, `border-[#b1b4b6]`, …) and PNRR variables
  (`dark:text-[var(--pnrr-muted)]`), most of them written twice, once per theme.
- **One place to change it.** The skin lives in ≈1,900 class occurrences across 99 files plus hex constants in
  `lib/hub-theme.ts`. Changing a colour means a search and replace.
- **Dark mode is broken in places today** (measured on chronos-dev, 2026-11-21, dark theme, 1440 px):
  - Chamber green `#006435` and Senate red `#9c051a` labels at 2.2–2.5:1 on `/parlament` and `/parlament/voturi`
    (21 text nodes on the votes page);
  - light text on a light surface (1.04:1) on `/parlament/comisii`;
  - by source, 53 `text-[#505a5f]`, 41 `text-[#1d70b8]` and 32 `text-[#0b0c0c]` have no dark partner: on PNRR's
    dark card they measure 2.4:1, 3.2:1 and 1.2:1 wherever the surface around them turns dark;
  - three PNRR variables parliament uses do not exist (`--pnrr-surface` in two dark hovers, `--pnrr-text` in one
    dark heading), so those declarations do nothing.
- **Coupling.** Parliament's dark mode and its "hub" sections use PNRR's `--pnrr-*` variables. A change to PNRR's
  brutalist skin changes parliament too, which DESIGN.md's "quarantined to PNRR" rule says must not happen.

## Goals, non-goals, anti-goals

- **Scope:** `src/features/parliament` (components, `lib/*-theme.ts`, data files), and the token definitions in
  `src/index.css` and `tailwind.config.js`.
- **Goals:**
  - every skin colour comes from a named `parliament-*` token, one class per use, with the dark value inside the token;
  - light mode is pixel-identical to today;
  - every text token pair measures at least 4.5:1 in both themes on the surfaces it sits on;
  - parliament no longer references `--pnrr-*`;
  - the guard keeps hex and `var(--…)` colours out of parliament's classes.
- **Non-goals:**
  - changing parliament's layout, structure, copy or behaviour;
  - moving parliament onto the main design system;
  - PNRR's own files;
  - statistics.
- **Anti-goals:**
  - a visible change in light mode;
  - a dark mode that looks like a different product rather than the same skin at night;
  - party colours rewritten as skin tokens.

## Constraints found

- **Party colours are data, not skin.** Party colours (`chamber-composition.ts`, the hemicycle, the vote party chart,
  members table, legend) come from the parties' identities and stay as they are. The hex check therefore covers
  parliament's classes only, not hex strings in code, as with the campaign maps.
- **Hex in inline styles and charts.** The skin constants in `lib/hub-theme.ts` (`PARLIAMENT_ACTION_BLUE`, `…_CAMERA_GREEN`,
  `…_SENAT_RED`, `…_RESOURCE_PURPLE`, `…_ICON_BG`) feed 66 places, some in `style={{ … }}`. They become
  `var(--parliament-…)` references so inline styles follow the theme as well. The fallback `#505a5f` for a party with
  no colour becomes the muted token.
- **The two border families.** Parliament uses two borders on purpose:
  - GOV.UK grey (`#b1b4b6`) for cards and dividers;
  - the brutalist strong border (`--pnrr-border`, near-black in light, near-white in dark) on hub sections.

  These become two tokens, `border` and `border-strong`, whose values today happen to equal PNRR's. They are copied,
  not linked.
- **Opacity modifiers** (`/80`, `/15`, `/5`) on a `var()` colour compile in Tailwind v4 through `color-mix()`, so the
  tokens are defined as plain hex variables, like PNRR's, rather than HSL triples. That keeps light values exact.

## Approaches considered

1. **Named parliament tokens (chosen by the owner).** Light unchanged, dark fixed, roughly half the colour CSS gone.
2. Main design system, as learning did. Larger saving, but drops the GOV.UK skin DESIGN.md holds up as a reference
   pattern, and needs a DESIGN.md change. Declined.
3. Leave parliament. Declined: the size and the dark-mode defects stay.

## The tokens

Defined in `src/index.css` as `--parliament-<slot>` in `:root` and `.dark`, and exposed in `tailwind.config.js` as
`parliament.<slot>` (`text-parliament-fg`, `border-parliament-border`, …). Proposed slots:

| Slot | Light (today) | Dark (proposed source) | Used for |
|---|---|---|---|
| `fg` | `#0b0c0c` | today's `--pnrr-fg` `#f7f7f2` | primary text, chevrons, solid dark fills |
| `muted` | `#505a5f` | today's `--pnrr-muted` `#a8aaa3` | secondary text, captions |
| `border` | `#b1b4b6` | today's `--pnrr-border` `#e7e7dc` (dividers may take a step down; see below) | cards, dividers |
| `border-strong` | `--pnrr-border` `#1f1f1f` | `#e7e7dc` | hub sections' 2 px frame |
| `card` | `#ffffff` | `--pnrr-card` `#1b1f1c` | cards |
| `surface` | `#f3f2f1` | `--pnrr-subtle` `#30362f` | header bands, hovers, tracks |
| `hover` | `#f8f8f8` | `--pnrr-hover` `#262b27` | row hovers |
| `page` | `--pnrr-bg` `#fafaf8` | `#111412` | page and hub background |
| `link` | `#1d70b8` | `#7fb3e3` (today's only dark partner) | text links, outlined actions, focus ring |
| `action` | `#1d70b8` | `#1d70b8` (does not flip; see answers below) | solid action fills with white text |
| `ink` | `#0b0c0c` | `#0b0c0c` (does not flip) | solid dark chips with white text |
| `link-hover` | `#003078` | a lighter blue that keeps AA | link hover |
| `commons` | `#006435` | `#58b083` | Chamber of Deputies identity |
| `senate` | `#9c051a` | `#e8697c` | Senate identity |
| `resource` | `#512178` | a light purple that keeps AA | resource rows, purple headings |
| `icon` | `#372554` | to be chosen to keep its white icon readable | icon tiles, error/not-found heroes |
| `success` | `#00703c` | `#85c99b` | passed, majority for |
| `error` | `#d4351c` | `#f4a196` | rejected, errors |

*Found while planning (2026-11-21):*
- **The hub frame needs its own slots.** Light mode uses PNRR's values in about 150 more places: hub sections,
  headings, captions and focus rings.
- **Why they can't collapse.** Text `#1f1f1f` and captions `#6f6f6f` sit ΔE 8–10 from the GOV.UK `fg` and `muted`.
  The `#3b82f6` focus ring and the `#b6ff00` accent have no GOV.UK counterpart at all.
- **The slots, copied from today's PNRR values in both themes:**

| Slot | Light | Dark |
|---|---|---|
| `frame-fg` | `#1f1f1f` | `#f7f7f2` |
| `frame-muted` | `#6f6f6f` | `#a8aaa3` |
| `frame-subtle` | `#e7e7e3` | `#30362f` |
| `frame-hover` | `#f0f0ec` | `#262b27` |
| `focus` | `#3b82f6` | `#60a5fa` |
| `accent` | `#b6ff00` | `#b6ff00` |

- **Existing slots that also cover the frame.** `border-strong` is the frame border. `page` (`#fafaf8`) and `card`
  already equal the frame's background and card.

The near-duplicates, each mapping to the slot whose light value it is closest to and matching its role (ΔE76 ≤ 5
from the colour over white; the single-use hover and border shades above that are listed with their ΔE as changes
for the owner to veto, and `#fdf3e3`, a caution tint, takes the app's `status-partial-bg`):
- `#e5e5e5`, `#e5e5e0`, `#ececec` and `#dee0e2` borders map to `border` with an opacity step;
- `#f3f0ff`, `#faf9ff`, `#f6f2f9`, `#f0f6fb`, `#f0f5fb`, `#eef2f6`, `#f3faf5`, `#fef7f7` and `#e3eef8` tints map to
  `resource/10`, `link/10`, `success/10` or `error/10`.

That mapping is the one place light mode may move slightly. Each such change is listed with its before and after hex
so the owner can veto it. A slot is added only where a role has no slot above.

## Guard

`src/styles/raw-palette-guard.test.ts` gains `src/features/parliament`. Its existing arbitrary-value check rejects
any colour literal inside a class bracket (`#…`, `rgb()`, `hsl()`), and gains a rule against `var(--pnrr-…)` in
parliament's classes. The hex-in-code check stays off for parliament because of party colours. Tailwind palette
classes are already zero there and stay guarded.

## Verification

- **Light: pixel comparison.** Before and after screenshots of the parliament pages:
  - the hub, votes list and one vote;
  - bills list and one bill (each tab);
  - members list, one member (each tab) and one group;
  - committees list and one committee;
  - agenda, stenograms list and one stenogram;
  - the not-found and load-error pages.

  Taken at 390 and 1440 px against the same API, and compared per pixel. Any difference must be in the
  near-duplicate list above.
- **Dark: contrast sweep.** The same pages, every text node measured against its nearest opaque background; nothing
  under 4.5:1 (3:1 for large text and non-text marks). Screenshots reviewed by eye for "same skin at night".
- **Behaviour.** Existing parliament tests stay green, and class assertions change only where they assert a hex
  class. Clicking through filters, tabs and links behaves the same on both builds.
- **Size.** `css-attribution.mjs` before and after, from the same commit.
- **Review.** Astra reviews the token set and its dark values before the conversion, and the whole change at the end.

## Order of work

1. Tokens in `src/index.css` and `tailwind.config.js`, with a contrast test like `design-tokens.test.ts`, and the
   `hub-theme.ts` constants pointing at them.
2. The guard, failing on today's files.
3. Conversion in batches by area: shared `lib/*-theme.ts` first (most classes flow from them), then hub and votes,
   bills, members and groups, committees, agenda and stenograms, error pages.
4. Pixel comparison and dark sweep, measure, review, and record the decision in DESIGN.md's decision log, updating
   the Reference Patterns paragraph that names the PNRR tokens.

## Answers to the builder check (2026-11-21)

- **Owner's decision: collapse the near-duplicates.** They map onto the main slots at an opacity step. Light mode may
  shift by a shade in those places only. Each change is listed in the Results with its before and after colour and
  a screenshot, so the owner can veto any one. The pixel comparison is a hard gate everywhere else: zero difference.

- **Dark values are what dark mode renders today, where it renders correctly.** The PNRR-derived dark values in the
  table (`card`, `surface`, `hover`, `page`, `fg`, `muted`, `border`, `border-strong`) are exactly today's dark look,
  so "same skin at night" means keeping them. Only the colours with no dark partner today, or with one that fails
  contrast, get new dark values.
- *Builder's call:*
  - **Opacity steps keep their numbers.** `[#1d70b8]/5`, `/80`, `/90`, `[#512178]/15` and the others become
    `parliament-link/5`, `parliament-resource/15` and so on. `color-mix()` with transparent gives the same light
    colour as the hex with alpha.
  - **Shadows take the token inside the bracket.** `shadow-[inset_0_-2px_0_0_var(--parliament-border)]` is one.
    The guard therefore rejects hex, `rgb()`, `hsl()` and `var(--pnrr-…)` inside any class bracket, and allows
    `var(--parliament-…)`.
- *Builder's call:* **text on a solid fill.** A fill that carries white text (action buttons on `#1d70b8`, `#0b0c0c`
  chips, `icon` tiles) keeps today's colour in both themes. Today it has no dark partner and passes: white on
  `#1d70b8` is 5.2:1. These fills take their own non-flipping slots: `action` (`#1d70b8`, its `/90` hover),
  `ink` (`#0b0c0c`) and `icon`.
  - The chamber and resource colours fill hero bands and vote cards under white text as well, so they also have
    non-flipping `commons-fill`, `senate-fill` and `resource-fill` slots.
  - Their flipping `commons`, `senate` and `resource` slots are for text only. This was found in Task 1. Text links use the flipping `link`. No `on-*` slots are needed. Text on these fills
  stays `text-white`.
- *Builder's call:* **chart ramps are skin, and party colours are data.**
  - The GOV.UK blue heat-map ramp (`#d2e2f1 … #1d70b8`, three heat-map files) becomes `ramp-1…4` slots with dark
    values that keep the steps distinguishable on the dark card.
  - The member-initials backgrounds (`#f3f2f1`, `#ede7f6`, `#e8f5e9`, `#fff3e0`) become `initials-1…4`.
  - Party colours and the hemicycle seat colours stay data.
- *Builder's call:* **inline styles and SVG take `var(--parliament-…)`.** The hemicycle and the bar markers use SVG or
  CSS `style`, which resolve `var()`. Before step 1 the builder greps for any consumer that parses the colour (canvas,
  a chart library reading a fill string). Any such consumer gets the resolved value from `getComputedStyle` at
  runtime instead.
- *Builder's call:* **scope.** Everything under `src/features/parliament` is in scope, including `ParliamentPromoCard`,
  which renders on the landing page. `src/features/legal/lib/legislation-theme.ts` mirrors parliament and also uses
  `--pnrr-*`, but it is another feature: it is recorded as a follow-up, not converted here.
- *Builder's call:* **borders keep today's dark values.**
  - Card borders and dividers are decorative, so the 3:1 non-text rule applies only to borders that are a control's
    only boundary: fields and toggle buttons.
  - The "dividers may take a step down" option is dropped. Dark `border` stays today's `#e7e7dc`.
- *Builder's call:* **the dark sweep measures composited colour.** A `/10` tint over the card counts as the blend,
  not the nearest opaque ancestor.

## Left to the builder

- the exact dark value of the slots marked "to be chosen";
- whether dividers take `border` at an opacity step in dark;
- batch boundaries;
- the screenshot and comparison tooling.
