# Feature: Version cluster / consolidation

> High-value next · header control on the Act page + a compare view. Reads
> `docs/design/legal/design.md` (§3 routes, §5 URL state, §6 components, §7 data
> model).

## Feature owner profile

Frontend feature implementer (React 19 + shadcn/ui + Lingui). The care here is
**correctness honesty**: defaulting to canonical, marking consolidations, and
never presenting a possibly-stale consolidated text as authoritative.

## Summary

Lets the user switch among an act's document expressions — original /
republicare / corp / consolidare — with a clear "canonical" marker and a
consolidation warning. Drives the `?versiune=` param that the Rezumat, Structură,
and (text) tabs read. Optionally offers a side-by-side **compare** of two
expressions.

## Facts / Decisions / Assumptions

- **Fact:** `legal.act_documents` carries `version_kind` (original, republicare,
  corp, stub-header, consolidare), `version_date`, `is_canonical` (exactly one
  canonical per act), `extraction_status`, and the typed MO link. (`legal.md`
  §5, §7.)
- **Fact:** Consolidated versions are an **open fork** — original-text-with-
  warning vs crawling portal consolidations — and may not be served by default.
  Default to the canonical expression; mark consolidations explicitly. (`legal.md`
  §6, §16 Q2.)
- **Decision:** v1 default = the `is_canonical` expression. The selector lists
  available expressions; choosing a non-canonical one sets `?versiune=` and shows
  a banner. Consolidare expressions show a **warning** + a "verifică pe portal"
  external link. (`design.md` P7.)
- **Decision:** `stub-header` expressions are not user-selectable as a reading
  target (header-only); they may appear as evidence in the provenance drawer but
  not in the reading selector.
- **Decision:** Compare is a `Sheet`/`Dialog` (not a route): pick two
  expressions, show metadata diff (version_kind, version_date, MO coordinates) +,
  where node paths align, a structural/text diff. MVP compare may ship as
  metadata + section-presence diff; full text diff is a stretch within this
  feature and clearly labelled if partial.
- **Assumption:** whether crawled portal consolidations are served is a backend
  decision; the UI is built to display a `consolidare` expression **if present**
  and to warn; if absent, the selector simply omits it. No UI blocker either way.

## Route and URL state

- Control: header of every Act tab. Param: `versiune?: string` (document
  expression id; default = canonical when absent).
- Compare: opened from the selector; selection is local UI state (or
  `compara?=docIdA,docIdB` if deep-linking compare is desired — optional).

## Data contract and mock states

Consumes `ActDocumentVersion[]` (`design.md` §7): `documentId`, `versionKind`,
`versionDate`, `isCanonical`, `extractionStatus`, `moPart/moNumber/moDate`.

Mock states:
- **Canonical only** — one expression; selector shows a single non-interactive
  "Versiune canonică" label (no dropdown clutter).
- **Original + republicare** — two expressions; canonical = republicare.
- **With consolidare** — adds a consolidare expression → warning banner +
  verify-on-portal link.
- **With stub-header** — present in provenance but absent from the reading
  selector.
- **Compare** — two expressions selected; metadata diff + section-presence diff.

## UI structure

```
Header control (in ActSummaryHeader):
  [Versiune: {versionKind} {versionDate} ▾]  ["Canonică" marker when canonical]
  Dropdown lists selectable expressions with version_kind + date + canonical mark
Non-canonical banner (below header when active):
  "Vizualizezi o versiune {versionKind}. Versiunea canonică este {…}."
Consolidare banner (when consolidare active):
  warning: "Text consolidat — poate diferi de portalul oficial. [Verifică pe portal ↗]"
Compare (Sheet): two-column metadata diff (+ section-presence/text diff where available)
```

## Component reuse and proposed new components

- Reuse: `Select`/`dropdown-menu`, `Badge`, `alert` (banners), `Sheet`/`Dialog`
  (compare), `Tooltip`, `Separator`.
- New: `VersionSelector` (shared, used by features 1/8), `VersionCompareSheet`.

## Interactions

- Selecting an expression sets `?versiune=` and re-keys the Rezumat/Structură
  content; the header identity + status stay stable.
- Choosing consolidare shows the warning; the verify-on-portal link opens the
  external portal in a new tab.
- Compare opens the sheet, user picks two expressions, sees the diff.

## Loading / empty / error / partial / stale states

- **Loading:** selector shows a skeleton chip.
- **Empty (single canonical):** selector collapses to a static label; no
  dropdown.
- **Error:** if a selected expression fails to load, fall back to canonical with
  an inline notice; URL normalized.
- **Partial:** compare with only metadata available shows the metadata diff and
  labels the text diff as unavailable; never a fake diff.
- **Stale:** `version_date` + `extraction_status` shown; consolidare always
  warned regardless of freshness.

## Accessibility and i18n

- Selector is a labelled combobox/menu; banners are `role="status"`/`alert` as
  appropriate; warning conveyed by text + icon, not color alone. Lingui macros;
  locale `version_date`; version_kind labels in Romanian (original / republicare
  / formă consolidată).

## Privacy / provenance / source-citation

- Canonical-by-default + explicit consolidation warning + verify-on-portal is the
  consolidation-correctness mitigation (P7; `legal.md` §15). `stub-header` kept
  out of the reading selector. Each expression's MO coordinates and
  extraction_status are evidence (P1).

## Acceptance checklist

- [ ] Act page defaults to the canonical expression; selector lists available
      expressions with version_kind + date + canonical marker.
- [ ] Selecting a non-canonical expression sets `?versiune=` and shows a banner;
      consolidare shows a warning + verify-on-portal link.
- [ ] `stub-header` is not selectable as a reading target.
- [ ] Single-canonical acts show a static label, not an empty dropdown.
- [ ] Compare shows at least a metadata diff; partial text diff is labelled.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Authoring/maintaining consolidated text; deciding the consolidation serving
  fork (backend product decision); full word-level legal diff engine (stretch,
  not required for v1).

## Open questions (blockers only)

None. (Consolidation serving policy is a backend decision; the UI handles both
present and absent consolidare expressions without a blocker.)
