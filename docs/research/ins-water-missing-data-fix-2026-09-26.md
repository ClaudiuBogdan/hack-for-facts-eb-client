# INS water map: missing-data correction

The 544 localities without a domestic-water value now appear hatched and are
labelled “544 de UAT-uri fără date”. Their tooltips say “date indisponibile pentru uz casnic”.
The page no longer infers absence of a public network from a missing volume.

Preview: [local INS water map](http://127.0.0.1:3012/ins?harta=apa).

## What changed

- Removed the unsupported network inference from the shared territory calculation,
  the snapshot generator, and the snapshot's missing-value reasons.
- Reused the existing SVG pattern. All missing localities share one shape; the
  water map has six fill shapes in total. Hatch spacing stays at five screen
  pixels when zooming. Each map instance has its own pattern ID.
- Updated the legend, tooltip and explanatory note together. Missing values stay
  outside rankings; reported zeroes remain numeric.
- Updated English/Romanian translations and the design documentation.

Exactly 544 snapshot reasons changed from `network` to `absent`. A structured
comparison against HEAD confirmed that every value, period, capture timestamp,
source, flag and other field is unchanged. This correction does not refresh INS
data or resolve the separate housing/birth missing-as-zero assumptions.

## Verification and review

- 78 tests passed across seven focused files. After extending the snapshot checks
  to all six series, the four snapshot tests passed again.
- Lingui extraction and compilation passed; translations were written through
  the Lingui catalog API.
- `yarn run check` passed TypeScript and ESLint with zero warnings.
- Desktop map and zoom inspected in the browser. DOM checks confirmed one shared
  missing-data shape and five-pixel hatch spacing. At an actual 390-pixel CSS
  viewport, the page had no horizontal overflow. The viewport was restored.
- Claude Opus 5.5, high effort, reviewed through the requested
  `claude-code-supervisor` workflow. The first review approved the code and
  identified three non-blocking documentation, translation and test improvements.
  All three were corrected. The follow-up approved the changes with no actionable
  findings. Its optional wording clarification was also applied.

Review evidence is in the ignored task directory
`tmp/ins-water-review-20260926/`: the two Opus transcript extracts, final review,
validation notes, test/check logs, session identity, and notification receipts.
The reviewer could not write its report under its restricted permissions, so
Codex preserved the reviews directly from the verified Opus transcript.

The water correction was reviewed first. The subsequent
[housing correction](ins-housing-missing-data-fix-2026-09-26.md) also made the
shared legend count explicitly name UATs. Neither correction changes the database.
