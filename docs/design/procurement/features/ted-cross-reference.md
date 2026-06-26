# Feature: TED above-threshold cross-reference

> High-value next feature. "Vezi și pe TED" on procedure/contract pages — reconciles
> the SICAP record with the EU above-threshold (TED) notice. Low-effort once the TED
> lane is served; ships gated until then.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (detail-page section +
shadcn). Embeds in `procurement-record-detail-pages.md`. Depends on
`coverage-data-as-of-layer.md`.

## Summary

A "Vezi și pe TED" section on procedure (and where applicable contract) detail pages
that shows the matched TED notice (EU above-EU-threshold) for a SICAP record, the
join basis (`tedNoticeNo` / TED `publication-number`), and a deep link to TED — so an
auditor can reconcile the national and EU views of the same notice.

## Facts / Decisions / Assumptions

- **Fact:** TED RO subset (~20–45k notices/yr, above-EU-threshold only) lane is
  in-flight; ~21,236 notices captured; the SICAP↔TED join key (`tedNoticeNo` / TED
  `publication-number`) is proven but **not yet broadly loaded into serving**
  (UX §5.3, §6.1, §13 "TED cross-reference", Open Q1).
- **Fact:** Only above-threshold procedures have a TED notice; most records will have
  **no** TED reference — absence is normal, not a gap.
- **Decision:** Render as a section on procedure detail (and contract detail when a
  TED ref resolves via the parent procedure). Behind a served flag: until TED serving
  is live, the section shows an `unverified`/`blocked` state with
  `RequestDatasetAction`, never a fake link.
- **Decision:** When a record has no TED match (below threshold or unmatched), show a
  quiet "Fără corespondent TED" note, not an error.
- **Assumption:** The match is provided by the server as a resolved reference
  (`TedReference`); the client does not perform the SICAP↔TED join itself.

## Route and URL state

- **Embedded** in `/achizitii/proceduri/$id` and `/achizitii/contracte/$id`. No
  standalone route, no URL state of its own.

## Data contract and mock states

Part of the record detail bundle (`design.md` §6 / record-detail
`related.ted`):

```ts
type TedReference = {
  readonly status: 'matched' | 'no_match' | 'not_served'
  readonly tedPublicationNumber: string | null   // TED publication-number
  readonly tedNoticeNo: string | null
  readonly tedUrl: string | null                  // deep link to TED notice
  readonly title: string | null
  readonly publicationDate: string | null
  readonly estimatedValue: MoneyValue | null
  readonly joinBasis: 'ted_notice_no' | 'publication_number' | null
  readonly matchConfidence: IdentityConfidence | null
}
```

Mock states:

- **Matched** — TED publication-number + deep link + value, join basis shown.
- **No match** — "Fără corespondent TED (sub pragul european sau necorelat)".
- **Not served** — lane not loaded → `unverified` panel + `RequestDatasetAction`.
- **Weak match** — `matchConfidence: 'low'` → "potrivire probabilă" disclosure.

## UI structure

1. **Section header:** "Vezi și pe TED" + `DataStatusBadge` (`live` /
   `unverified`).
2. **Matched state:** TED publication-number, title, publication date, estimated
   value (currency-safe), join-basis line ("Corelat prin tedNoticeNo"),
   `EvidenceLink` "Deschide notificarea pe TED" (new tab), `IdentityConfidenceBadge`
   when match is weak.
3. **No-match state:** quiet note explaining absence is normal.
4. **Not-served state:** `unverified` panel + short explainer + `RequestDatasetAction`
   ("Solicită încărcarea datelor TED").

## Component reuse and proposed new components

- Reuse: `Badge`, `Tooltip`, `Separator`, `Collapsible`.
- Shared: `DataStatusBadge`, `EvidenceLink`, `IdentityConfidenceBadge`,
  `SourceProvenanceDrawer`, `RequestDatasetAction`.
- New: a small `TedReferencePanel` section component.

## Interactions

- TED deep link opens in a new tab (`rel="noopener noreferrer"`).
- Join-basis tooltip explains the match key.
- `RequestDatasetAction` (not-served) records interest in the TED lane.

## Loading, empty, error, partial, stale states

- **Loading:** part of the record bundle skeleton (no separate spinner).
- **Empty/no-match:** quiet note (not an error).
- **Error:** the section degrades to "indisponibil" without breaking the page.
- **Partial:** weak match disclosed.
- **Not-served:** `unverified` panel (the default until the lane loads).

## Accessibility and i18n

- Section heading h2; link has an accessible name; status text+icon, not color-only.
- All strings Lingui-wrapped; RO: "Vezi și pe TED", "Corespondent TED",
  "Fără corespondent TED", "Deschide notificarea pe TED", "potrivire probabilă",
  "Solicită încărcarea datelor TED". "TED" expanded on first use ("Tenders
  Electronic Daily — jurnalul UE al achizițiilor").

## Privacy, provenance, source citation

- TED is a public EU source; deep link + join basis cited. No PII concerns specific
  to this section beyond the host page.
- Match confidence disclosed; weak/probable matches never presented as certain.
- Not-served state is honest (`unverified`), never a fabricated link.

## Acceptance checklist

- [ ] Section renders matched / no-match / not-served / weak-match states.
- [ ] Matched state shows publication-number, deep link, join basis, value.
- [ ] Not-served default until a served flag flips; `RequestDatasetAction` present.
- [ ] Absence handled quietly (not an error); weak matches disclosed.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No client-side SICAP↔TED matching (server-resolved).
- No TED-only browse/search (out of scope; this is a cross-reference on records).
- No below-threshold coverage claims.

## Open questions (blockers only)

1. **TED RO serving readiness** (UX Open Q1) — raw is captured/verified but not
   broadly loaded into serving. Blocks live data only; the section ships the
   `not_served`/`unverified` state behind a served flag, so it does not block the
   host detail pages.
