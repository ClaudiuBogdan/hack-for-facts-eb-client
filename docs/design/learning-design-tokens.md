# Learning on the design system: design

Owner's decisions (2026-11-20): move the learning section off the raw Tailwind palette, and onto the **main design
system** (navy plus neutrals, colour as a status channel), not onto a learning palette of its own. The same pass
covers **every file in the budget campaign and the challenges**, admin pages included, and the one lesson whose
meaning sits in coloured dots gets tokens plus words.

## Why

The global stylesheet is 541 KB (≈71 KB compressed) and every page downloads and matches all of it. Compiled with
Tailwind's own engine and attributed to the files that use each class, ≈100 KB of it is used only by
`src/features/learning`: its lesson components use the raw palette as decoration (2,414 classes, 467 distinct, in 48
files: zinc 1,067, amber 305, emerald 281, blue 178, indigo 134, red 127, slate 119, rose 110, purple 37, green 23,
orange 21, a few violet, teal, yellow), each hue in several shades, opacities and `dark:` variants. DESIGN.md says
the opposite: one navy accent, and colour is a status channel. Moving learning onto the tokens shrinks the
stylesheet for every page and makes learning one design system with the rest of the app.

## Goals, non-goals, anti-goals

- **Scope:** `src/features/learning` (48 files, 2,414 classes), `src/features/campaigns` (28 files, 353),
  `src/features/challenges` (9 files, 69), and the lesson `local-national-budgets/02-local-government-structure`
  (`index.en.mdx`, `index.ro.mdx`).
- **Goals:** no raw palette class left in scope; these surfaces look like the rest of the app in light and dark; the
  global stylesheet loses most of their share; a guard keeps raw palette classes out of the three feature folders
  and the learning content.
- **Non-goals:** changing what any lesson, challenge or campaign page says or does, its layout or its interactions;
  lesson content beyond the one lesson named above; the rest of the app's raw palette use (a later pass can reuse the
  guard).
- **Anti-goals:** meaning carried by hue alone (a correct answer, a deficit, a warning must keep its icon or text);
  text below AA contrast in either theme; a lesson that breaks or looks broken in dark mode; any change on the
  campaign pages beyond the same recolouring (they reuse these components).

## Constraints found

- **The status tokens DESIGN.md defines do not exist in code.** `status-{live,mock,partial,blocked}-{bg,fg}` are in
  DESIGN.md's token YAML but in neither `src/index.css` nor `tailwind.config.js`, so `bg-status-partial-bg` and
  friends generate no CSS. Three production files already use them and render unstyled today
  (`justice-source-line.tsx`, `justice-case-page.tsx`, `company-main-activity.tsx`). Defining them is step one; it
  also fixes those three (a visible change there: their amber labels appear as designed).
- DESIGN.md gives only light values. Dark values follow its rule "same hues at inverted lightness"; each pair must
  measure ≥ 4.5:1 (fg on bg, and fg on the card) in both themes.
- The budget campaign (`src/features/campaigns/buget`) and challenges reuse learning components and are in scope.
- `02-local-government-structure` marks the responsible level of government with coloured dots in a table (hue is
  the only signal, in both languages). The dots take tokens and each gets a short word or the table a legend, in
  both `en` and `ro`; the two languages say the same thing.
- Chart series follow DESIGN.md's chart rule: navy first, then neutral steps (`chart-1…5`), with a legend or labels.

## Approaches considered

1. **Main design system (chosen by the owner).** Tokens only; lessons become calmer and consistent.
2. A small learning palette as named tokens, like PNRR's set. Keeps the playful look, most of the size win; declined.
3. A separate learning stylesheet. Size win without touching lessons, but two utility sheets can override each other
   and add a second CSS pipeline; declined.

## The mapping

Every raw palette class maps by **meaning**, not by hue. Dark mode comes from the tokens, so `dark:` colour variants
are removed, not translated.

| Today (any shade, opacity, `dark:` variant) | Meaning in lessons | Token |
|---|---|---|
| zinc / slate / gray, light shades as surfaces | panels, cards, tracks | `bg-card`, `bg-muted`, `bg-background` |
| zinc / slate borders and dividers | structure | `border-border` (`divide-border`) |
| zinc / slate 700–950 text | primary text | `text-foreground` |
| zinc / slate 400–600 text | secondary text, captions | `text-muted-foreground` |
| zinc / slate 800–950 as a solid fill (dark buttons, chips) | emphasis | `bg-foreground text-background` or `bg-primary text-primary-foreground` for an action |
| blue / indigo / violet / purple / teal / sky | selection, focus, information, the lesson's accent | `primary`: `text-primary`, `bg-primary`, tints `bg-primary/10`, `border-primary/30`, `ring-primary/40` |
| emerald / green | done, correct, positive, surplus | `status-live-bg` / `status-live-fg` |
| amber / orange / yellow | highlight, caution, "worth a look", partial | `status-partial-bg` / `status-partial-fg` |
| red / rose | wrong, error, negative, deficit | `status-blocked-bg` / `status-blocked-fg` |
| several hues side by side as categories (chart slices, legend swatches, per-item colours in data files) | series identity | `chart-1…4` in order as fills, with the label already shown next to it |
| gradients (`from-* via-* to-*` in palette colours) | decoration | a solid token from the rows above |
| coloured shadows (`shadow-emerald-500/20` …) | decoration | the plain `shadow-*` |

- **Solid status fills** (progress bars, dots, markers) use the `-fg` colour as the fill (`bg-status-live-fg`), and
  the `-bg` colour for the track or container.
- **Opacity steps:** tints use only `/10`, `/20`, `/30`, `/40`, `/50`, so each token has a handful of classes, not dozens.
- **Data files** (`*-data.ts`) that store class strings per item move to tokens the same way; where they encode a
  category by hue, they take `chart-N` by the item's order.
- White/black with opacity (`via-white/30` shimmer, `bg-black/50` overlays) is not palette and stays.
- *Builder's call, recorded:* category fills use `chart-1…4` only (`chart-5`, 82% lightness, is too faint to read as
  a shape on white). Past four categories the steps repeat; the label next to each item carries identity, as
  DESIGN.md's chart rule already requires. Text never takes a `chart-N` colour; per-item text and borders take
  `text-foreground` / `border-border`, or `primary` for the selected item.
- *Builder's call, recorded:* hard-coded hex colours (`MoneyFlowDiagram` and its data) become `hsl(var(--chart-N))`
  or `hsl(var(--primary))`; class names built at runtime (`bg-${color}-500/40` in `SalaryTaxCalculator`) are rewritten
  as whole token classes, since neither the guard nor Tailwind can see a built name.

## Guard

A test fails when any file in `src/features/{learning,campaigns,challenges}` or `src/content/learning` contains a raw palette colour class
(`bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|decoration|placeholder|accent|caret` followed by
one of Tailwind's 22 palette names and a shade), or a hex colour in a TS/TSX file. It names the file and the class.
It cannot see class names built at runtime; the mapping forbids building them. *Ruling (2026-11-20):* the hex check
covers `src/features/learning` only; the campaign and challenge maps paint MapLibre layers and canvases with colour
strings, which are not stylesheet classes and stay outside this pass. The same test can later take other
directories.

## Verification

- **Screens.** Before and after screenshots of every lesson that renders an interactive component (found from
  `src/content/learning/**/*.mdx`), light and dark, at 390 and 1440 px, plus the learning index, a path page, the
  onboarding page, the certificate page, the budget campaign pages that embed these components, and the three
  justice/companies screens the status tokens fix. Interactive states that matter (a selected card, a correct and
  a wrong quiz answer, a completed lesson) are captured by driving the component.
- **Contrast.** Each status pair and each text token on its surface measured in both themes (≥ 4.5:1 for text).
- **Size.** The attribution script (`docs/performance/2026-11-17-landing/tools/css-attribution.mjs`, moved from the
  measuring session into the repo) re-run: each area's own CSS and the stylesheet total, before and after, from the
  same commit's baseline. **Baseline** (2026-11-20, status tokens defined; what the shipped stylesheet, i.e. the
  Docker build context, would lose without each area): shipped stylesheet 531,305 bytes minified; learning 99,382,
  campaigns 26,585, challenges 17,010.
- **Tests.** Existing learning, campaign and challenge tests stay green; class-name assertions in tests are updated
  only where they assert the old palette class.
- **Review.** Astra (max) reviews the token definitions and the mapping before the lesson batches, and the whole
  change at the end.

## Order of work

1. Status tokens in `src/index.css` (light and dark) and `tailwind.config.js`, with a contrast check; the three
   existing users verified.
2. The guard test, failing on today's 87 files (48 learning, 28 campaigns, 9 challenges, 2 lesson content).
3. Learning in batches by size, each with its screenshots: the five largest components; the next fifteen; the rest
   including data files, the player, layout and cards; then the lesson content file pair.
4. Challenges (9 files), then the campaign's reader pages, then its admin pages.
5. Measure, review, record the decision in DESIGN.md's decision log.

## Left to the builder

The exact token for each occurrence within the mapping's rules, batch boundaries, the screenshot tooling, and the
contrast-measurement method.
