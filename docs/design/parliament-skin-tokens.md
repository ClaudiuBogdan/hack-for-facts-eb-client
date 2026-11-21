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

## Status (2026-11-21): paused on the owner's request

Work stopped partway through the conversion. Everything below is committed locally on `dev` and **not pushed**. The
tree is consistent: `yarn run check` passes, the parliament and style tests pass, and the guard lists exactly the files
still to convert.

### Done

| Step | Commits | Review |
|---|---|---|
| Task 1 — tokens and their test | `3007cb592` | Astra max + 2 scoped re-reviews, clean |
| Task 2 — guard (`raw-palette-guard.test.ts`, `PENDING_PARLIAMENT`) | `0179ffc4f` | Astra xhigh + 3 scoped re-reviews, clean |
| Task 3 — screen tooling | `docs/design/tools/parliament-screens/` | light gate verified at zero difference after Tasks 1–2 |
| Task 4 — Batch A, shared `lib/*-theme.ts` and frames (22 files) | `a783fe525`, `f8efae1dc`, `773288fba`, `70ad33384` | Astra xhigh + 2 rounds, approved |
| Task 5 — Batch B, hub and votes (20 files) | `0f6f1e7f5`, `4fb2f6ca8`, `d01e8efe3` | Astra xhigh + 2 rounds, approved |
| Task 6 — Batch C, bills (14 files) | `31c5dcc6f`, `e1fb55a93`, `a6d881bf6` | Astra xhigh + 2 rounds, approved |
| Task 7 — Batch D, members, groups, party, speeches (32 files) | `283bf3e13` | **not reviewed** (see Pending) |

Slots added beyond the first token table, each with today's light value, were found by the reviews:
- `commons-fill`, `senate-fill`, `resource-fill` and `neutral-fill` (non-flipping fills under white text);
- `accent-fg` and `accent-focus` (the lime chip);
- `resource-heading`, `bill-heading`, `conflict`, `notice`, `notice-fg`, `notice-edge`, `highlight`, `inactive`,
  `abstain`, `faint`;
- `ramp-0` and `ramp-edge`.

The dark link became `#94c1ea` and the dark ramp was brightened to reach 3:1. `src/index.css` and
`src/styles/parliament-tokens.test.ts` hold the full table.

Rules the reviews added for batches (kept in the plan's batch brief):
- a `*-fill` slot only for a surface that carries white text; a stripe, rule or dot that carries no text takes the
  flipping slot;
- native date inputs take `dark:scheme-dark`;
- a focus ring inside a clipping wrapper is inset, with `focus-visible:outline-hidden focus-visible:-outline-offset-2`
  so forced-colours mode still paints it;
- class maps live in `lib/*-theme.ts`;
- restart the dev server before a capture, because it can serve a stale module.

### Measured so far

- **Dark mode.** Text failing contrast on the parliament routes fell from 1,871 to 1,752 nodes after Batch A. Later
  batches cut their own routes much further: the vote list from 32–33 to 12–13, bill stages from 28–29 to 10–11, and a
  member's interventions from 181 to 28. The remaining failures are the app shell, Batch E's files, and the owner items
  below.
- **Stylesheet: no saving yet; the tree is currently larger.** With Batch E unconverted, the shipped sheet is 452,311
  bytes against 438,780 before Task 1, and parliament's own share is 30,149 against 21,707. Measured with
  `css-attribution.mjs`, as for learning. There are two reasons:
  - Batch E's files still carry the old hex and `dark:` classes, so both sets ship.
  - Opacity and hover variants of a `var()` colour compile to `color-mix()` with a fallback, and cost 100–210 bytes
    each. A plain token class (`text-parliament-muted`, 53 bytes) is still cheaper than the hex pair it replaces
    (33 + 72 bytes).

  Whether the end state is smaller has to be measured after Batch E. The certain gains are dark-mode legibility and one
  place to change parliament's palette.

### Pending

1. **Review Batch D** (`283bf3e13`), using the same Astra brief as the earlier batches. Its implementer flagged:
   - `#eef7f1` → `success/10` (accepted as a near-duplicate);
   - party swatch borders `black/10` → `ink/10` (accepted);
   - `nu_a_votat` keeping `border` as its mark (accepted).

   An extra light capture by its implementer was stopped before it finished. It showed two unexplained differences
   that the review must explain or fix:
   - the member **portrait** tab: a band about 80 px tall at y≈430–510 at 1440;
   - the **stenogram reader** page: several bands, which are Batch E's page but use Batch A's stenogram theme.
2. **Batch E** (Task 8): the 27 files still in `PENDING_PARLIAMENT` (agenda, committees, stenogram reader and session
   views, the shared list surface, the parliament shell, filter triggers and comboboxes, the find-rep dialog, the AI
   summary card). When it is done, delete `PENDING_PARLIAMENT`. Known items:
   - the "Filtre" trigger on the lime chip (`parliament-filter-trigger-button.tsx`);
   - the "Despre aceste date și surse" link (`parliament-list-surface.tsx`);
   - the agenda card's "Cea mai recentă ședință" label on the hub.
3. **A fix left from Batch B.** The vote view switch's inset focus ring (`voteDetailToggleActiveClassName` in
   `lib/vote-detail-theme.ts`) needs `focus-visible:outline-hidden focus-visible:-outline-offset-2` for forced colours,
   as Batch C did.
4. **Task 9**, the final step:
   - measure the stylesheet with `css-attribution.mjs`;
   - run a functional pass comparing the pre-change build with the converted tree;
   - have Astra review the whole change;
   - record the decision in DESIGN.md's decision log, and update the Reference Patterns paragraph that names PNRR's
     tokens for parliament;
   - write a Results section here.
5. **Publish.** Merge `origin/dev`, then push with the pre-push notice to the other sessions. This waits for the
   owner.

To resume, the screens need two dev servers:
- **Base, on :3021:** a worktree of `104e344d2`, the commit before Task 1.
- **Working tree, on :3031:** both started with `npx vite --mode chronos-server --port <port> --strictPort --host
  127.0.0.1`.

Then run `node docs/design/tools/parliament-screens/screens.mjs <outDir> [routes.json] [--only=…]`, followed by
`pxdiff.py <outDir>` and `darkcheck.py <outDir>`.

### For the owner: issues found and left alone

These are outside parliament's own code, or fixing them would change light mode:
- **The shared Button.** On dark cards the outline variant's border measures 1.23–1.37:1, and primary buttons lose
  contrast on hover (2.86:1 against the card). This shows on the parliament error pages' retry buttons, the filter
  sheets' reset and close buttons, the chamber, heat-map and download buttons, and "Descarcă document". It is the same
  family as the learning pass's `/90` hover item.
- **Shared Select and Dropdown items.** Keyboard focus inside the open menus is only 1.21:1 in dark (sort, party,
  export and stage selects).
- **The shared Skeleton.** `bg-primary/10` is about 1.1:1 in dark everywhere; the bill list's loading state is one
  instance.
- **Party colours on the dark vote chart.** AUR and USR swatches measure 1.25:1 and 1.07:1 on the plot, and white text
  on PNL's yellow is low. These colours are party data, so a contrasting edge, not a new colour, would be the fix.
- **"Nu a parcurs această etapă."** In the bill tracker, `opacity-60` puts it at about 2.8:1 in light and 3.44:1 in
  dark today. Fixing it means a darker light colour.
- **The legal feature's `legislation-theme.ts`** mirrors parliament and still uses `--pnrr-*`.

### Near-duplicates applied so far (light colour moved by a shade; for the owner's veto)

#### Batch A

- `components/parliament-group-detail-skeleton.tsx:83,84,87,97,98`  `bg-[#dee0e2]` → `bg-parliament-border/40`  (#dee0e2 → #e0e1e2)
- `components/parliament-load-error-page.tsx:138`  `border-[#dee0e2]` → `border-parliament-border/40`  (#dee0e2 → #e0e1e2)
- `components/parliament-load-error-page.tsx:138`  `bg-[#fdf6f6]` → `bg-parliament-error/5`  (#fdf6f6 → #fdf5f4)
- `components/parliament-not-found-page.tsx:71`  `border-[#dee0e2]` → `border-parliament-border/40`  (#dee0e2 → #e0e1e2)
- `components/parliament-not-found-page.tsx:71`  `bg-[#f8f9fd]` → `bg-parliament-link/5`  (#f8f9fd → #f4f8fb)
- `components/vote-detail-skeleton.tsx:40`  `border-[#ececec]` → `border-parliament-muted/10`  (#ececec → #eeefef)
- `lib/member-detail-theme.ts:59`  `border-l-[#3d434a]` → `border-l-parliament-muted`  (#3d434a → #505a5f)
- `lib/member-detail-theme.ts:18`  `MEMBER_DETAIL_CAREER_ACCENT = '#3d434a'` → `'var(--parliament-muted)'` (unused export)
- `lib/member-detail-theme.ts:68`  `bg-[#f3f0ff]` → `bg-parliament-resource/10`  (#f3f0ff → #eee9f2)
- `lib/stenogram-theme.ts:105`  `bg-[#e7f3ec]` → `bg-parliament-success/10`  (#e7f3ec → #e6f1ec)
- `lib/stenogram-theme.ts:105`  `text-[#00552d]` → `text-parliament-commons`  (#00552d → #006435)
- `lib/stenogram-theme.ts:109`  `text-[#383f43]` → `text-parliament-muted`  (#383f43 → #505a5f)
- `lib/stenogram-theme.ts:114`  `bg-[#f0f5fb]` → `bg-parliament-link/5`  (#f0f5fb → #f4f8fb)
- `lib/stenogram-theme.ts:242`  `bg-[#f0f5fb]` → `bg-parliament-link/5`  (#f0f5fb → #f4f8fb)
- In code, as an opaque mix over the card (the originals were opaque inline backgrounds):
  - `lib/vote-detail-theme.ts:11`  `VOTE_DETAIL_INFO_BG = '#f3f0ff'` → `'color-mix(in srgb, var(--parliament-resource) 10%, var(--parliament-card))'`  (#f3f0ff → #eee9f2; consumer `vote-detail-skeleton.tsx:178`, and as `MEMBER_DETAIL_INFO_BG`)
  - `lib/committee-theme.ts:61`  `COMMITTEE_NOTICE_BG = '#f3f0ff'` → same mix  (consumers `parliament-committee-detail-page.tsx:221,917`, `parliament-committees-page.tsx:293`)
  - `lib/group-theme.ts:50`  `GROUP_NOTICE_BG = '#f3f0ff'` → same mix  (consumer `parliament-group-detail-page.tsx:67`)
  - `lib/bill-detail-theme.ts:13`  `BILL_DETAIL_INFO_BG = '#f3f0ff'` → same mix  (unused export)
  - `lib/vote-detail-theme.ts:15`  `VOTE_DETAIL_CHART_PLOT_BG = '#f8f9fd'` → `'color-mix(in srgb, var(--parliament-link) 5%, var(--parliament-card))'`  (#f8f9fd → #f4f8fb; consumers `vote-party-chart.tsx:267`, `vote-detail-skeleton.tsx:134`)

#### Batch B

- `vote-group-votes-table.tsx:69`  `border-[#dee0e2]` → `border-parliament-border/40`
- `vote-group-votes-table.tsx:87`  shadow layer `#dee0e2` → `color-mix(in_srgb,var(--parliament-border)_40%,transparent)`
- `vote-group-votes-table.tsx:95`  `border-[#dee0e2]` → `border-parliament-border/40`
- `vote-group-votes-table.tsx:123`  shadow `#dee0e2` → `color-mix(…border…40%…)`
- `vote-group-votes-table.tsx:130`  shadow `#dee0e2` (×2) → `color-mix(…border…40%…)`
- `vote-member-result-card.tsx:27`  `border-[#ececec]` → `border-parliament-muted/10`
- `vote-member-result-card.tsx:99`  `bg-[#eef2f6]` → `bg-parliament-link/5`
- `vote-member-result-card.tsx:136`  `border-[#dee0e2]` → `border-parliament-border/40`
- `votes-chamber-panel.tsx:107`  `bg-[#dee0e2]` (illustration well) → `bg-parliament-border/40`
- `vote-individual-votes-section.tsx:274`  inline `'#f3f0ff'` → `PARLIAMENT_NOTICE_TINT` (#f3f0ff → #eee9f2, measured)
- `vote-party-chart.tsx:59`  `CHART_GRID_COLOR '#dee0e2'` → `color-mix(in srgb, var(--parliament-border) 40%, transparent)` (as dispatched)

#### Batch C

- `bill-outcome-summary.tsx:66`  `bg-[#f3faf5]` → `bg-parliament-success/5` (measured over the card: #f3faf5 → #f2f8f5)
- `bill-outcome-summary.tsx:83`  `bg-[#f0f6fb]` → `bg-parliament-link/5` (measured: #f0f6fb → #f3f8fb)
- `bill-outcome-summary.tsx:83`  `hover:bg-[#e3eef8]` → `hover:bg-parliament-link/15`
- `bill-step-links.tsx:122`  `hover:bg-[#f0f6fb]` → `hover:bg-parliament-link/5`
- `bill-step-links.tsx:133`  `hover:bg-[#f6f2f9]` → `hover:bg-parliament-resource/5`
- `bill-step-links.tsx:148`  `hover:bg-[#f6f2f9]` → `hover:bg-parliament-resource/5`
- `bill-passage-tracker.tsx:115`  `divide-[#e5e5e5]` → `divide-parliament-muted/15` (measured: #e5e5e5 → #e5e6e7)
- `bill-passage-tracker.tsx:121`  `border-[#e5e5e5]` → `border-parliament-muted/15`
- `bill-passage-tracker.tsx:140`  `divide-[#e5e5e5] border-[#e5e5e5]` → `divide-parliament-muted/15 border-parliament-muted/15`

#### Batch D

- `member-alegeri-tab.tsx:49`  `border-l-[#3d434a]` → `border-l-parliament-muted`
- `member-committees-section.tsx:97`  `bg-[#f3f0ff]` → `bg-parliament-resource/10`
- `member-contact-tab.tsx:105,156,178`  `bg-[#f3f0ff]` → `bg-parliament-resource/10`
- `member-intrebari-tab.tsx:133`  `bg-[#faf9ff]` → `bg-parliament-resource/5`
- `parliament-group-cohesion-panel.tsx:116,117,118`  `bg-[#dee0e2]` → `bg-parliament-border/40`
- Opacity steps kept (not near-duplicates): `border-[#512178]/15|/30` → `border-parliament-resource/15|/30` (member-contact-tab:91, member-intrebari-tab:133,138).

Batch B also moved the heat map's uncaptured-day hatch `#d8d8d4` to `border/50` (`#d8d9da`, ΔE ≈ 2). Batch A moved
the stenogram rail's idle tick from `#b3b4b4` to `#a8a8a8` (ΔE 4.4), so that it reaches 3:1 in dark.

## Left to the builder

- the exact dark value of the slots marked "to be chosen";
- whether dividers take `border` at an opacity step in dark;
- batch boundaries;
- the screenshot and comparison tooling.
