# Feature: Case Detail (Public / Non-Person Entities)

Domain: Justice · Priority: **MVP #3** · Status: build-ready
Route: `/justitie/dosare/$caseId` · Companion: `../design.md`, `../ux.md` ·
Source: `docs/ux-research/justice.md` §13.3, §10.4, §15

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn/ui + Lingui). Must implement a privacy-critical detail page where person
suppression and incidental-PII handling are first-class. No backend.

## Summary

A single-case page reached by opaque `case_id`. Shows the case header (court, number,
stage, category, object), a vertical hearing timeline, the appeals list, a party list
where companies/public entities are named (publishable dictionary) and persons appear
only as role-counts ("Pârât: 2 persoane fizice — nume necomunicate"), extracted legal
references with resolution status (gated — see `legal-reference-exploration.md`), and
a provenance/coverage footer. Appeal-chain/lineage is **not** rendered until its gate
is green. This is never a person entry point and never names individuals.

## Facts / Decisions / Assumptions

- **Fact:** Data from `justice.cases` + `case_hearings` + `case_appeals` +
  `case_parties` (+ `party_name_keys` for names; + `case_legal_references` when
  live). Aligns with the `get_judicial_case` MCP tool ("Tool IO explicitly privacy
  constrained").
- **Fact:** `case_parties` has **no free-text name column**; `name_key_id` is the
  only path to a name and is NULL for person/unknown/low-confidence. Persons are
  structurally unnamed in serving.
- **Fact:** `object`/`solution`/`solution_summary` are raw passthrough and **may
  contain incidental person names** (tier-2 warning; recorded as counts, not
  redacted in metadata).
- **Fact:** Case number format `NNNN/CC/YYYY` (middle = originating-court code);
  ~757k non-standard numbers exist.
- **Fact:** No case documents (no PDFs/decisions) from Portal Just.
- **Decision — `caseId` is the opaque internal `case_id`,** not `case_number` (which
  contains slashes). `case_number` is shown in the UI and copyable, never in the path.
- **Decision — case text is displayed but never made searchable/indexable** and sits
  behind a `PrivacyBoundaryNotice(variant='incidental-text')`. No person-name
  highlighting or entity extraction over it.
- **Decision — lineage/appeal-chain renders nothing in v1** (`laneAvailability.
  lineage === 'gated'`); show a single "în pregătire" note only if the user might
  expect it (e.g., when appeals exist). Never auto-link chains as fact.
- **Assumption:** the adapter resolves `courtName` and party `displayName`
  server-side; client does not join.

## Route and URL state

`src/routes/justitie/dosare.$caseId.tsx`:

```ts
export const Route = createFileRoute('/justitie/dosare/$caseId')({
  validateSearch: parseCaseDetailSearch,    // src/schemas/justice.ts
  loader: async ({ params }) => { /* fetch case; notFound() if missing */ },
  head: ({ loaderData }) => { /* SEO: "Dosar {caseNumber} — {court}" */ },
})
```

```ts
const caseDetailSearchSchema = z.object({
  tab: z.enum(['cronologie','parti','acte']).optional().catch('cronologie'),
  from: z.string().optional().catch(undefined),   // backtrack context
})
```

- `from` (e.g. `companies:$cui`, `instante:$courtId`, `cautare`) drives a "Înapoi
  la …" affordance.

## Data contract and mock states

Adapter `fetchJudicialCase(caseId)`:

```ts
type JudicialCaseDetail = {
  case: JusticeCase & { courtName: string | null; courtId: string }
  hearings: JusticeHearing[]                 // ordered by hearing_index/date
  appeals: JusticeAppeal[]
  parties: {
    named: {                                 // publishable company/public only
      partyIndex: number; displayName: string; legalForm: string | null;
      partyKind: 'company' | 'public_entity'; roleNormalized: string;
      nameKey: string;                       // for cross-links to slice/search
    }[]
    personCountsByRole: { role: string; count: number }[]    // persons aggregated
    unknownCountsByRole: { role: string; count: number }[]   // unknown aggregated
  }
  legalReferences: JusticeLegalReference[]   // empty when gated
  laneAvailability: JusticeLaneAvailability
  provenance: JusticeProvenance
}
```

**Mock states:** (a) rich case (many hearings, appeal present, named company +
public party + person counts, legal refs gated), (b) sparse case (one hearing, no
appeal, only person counts → demonstrates the "only persons" privacy framing), (c)
non-standard case number (shows raw number + note), (d) legal refs live (resolution
mix unique/ambiguous/unresolved), (e) error/notFound.

## UI structure

1. **Case header:** `case_number` (copyable) + `case_number_old` if present, court
   name → links to `/justitie/instante/$courtId`, `stage_name`, `category_name`,
   `DataStatusBadge`, `FreshnessBadge` (latest_source_modified_at). "Înapoi la …"
   when `from` present.
2. **Object block:** `object` text behind `PrivacyBoundaryNotice(variant=
   'incidental-text')` ("Textul poate conține date personale incidentale; nu este
   indexat/căutabil"). Rendered as plain, non-selectable-for-search prose (normal
   selectable text, but no in-page search tooling that targets it).
3. **Tabs:** `cronologie` (default) | `parti` | `acte`.
   - **cronologie:** `CaseTimeline` — vertical list of hearings (date, panel,
     `solution_summary`, pronouncement date, document number/date). Appeals shown as
     a labeled sub-list/section with `appeal_declared_at` + `appeal_type`. If appeals
     exist and lineage is gated, a single muted "Lanțul de apel: în pregătire" note.
   - **parti:** `PartyRolesList` — named publishable parties (each row: role badge,
     display name → link to `/companies/$cui` slice or `/entities/$cui` if a CUI
     candidate exists, else to `/justitie/cautare?partyKey={nameKey}`), then aggregated
     "Persoane fizice" and "Părți neidentificate" role-count rows
     (non-interactive). Prominent `PrivacyBoundaryNotice(variant=
     'persons-suppressed')`.
   - **acte:** `LegalReferenceList` — gated "în pregătire" by default; when live,
     rows with `rawCitation`, resolved act link to `/legislatie`, and a
     resolution-status badge (unique/ambiguous/unresolved). See
     `legal-reference-exploration.md`.
4. **`RelatedLinksRail`:** the court, prefiltered search by court/category, and (when
   a named party links to a CUI candidate) the company/entity profile — candidate
   links labeled.
5. **Footer:** `SourceProvenanceDrawer` (source `portal_just`, retrieval/modified,
   "doar metadata, fără documente de dosar", "fără ICCJ").

## Component reuse and new components

- Reuse: `Tabs`, `Badge`, `Table`, `Tooltip`, `Skeleton`, `EmptyState`, `Sheet`
  (drawer), `breadcrumb`, `button` (copy case number → `toast`).
- New shared (data-trust): `PrivacyBoundaryNotice`, `DataStatusBadge`,
  `FreshnessBadge`, `SourceProvenanceDrawer`, `RelatedLinksRail`,
  `IdentityConfidenceBadge` (for candidate party→company links), `EvidenceLink`.
- New justice: `CaseTimeline`, `PartyRolesList`, `LegalReferenceList`.

## Interactions

- Tab change updates `tab`; copy-case-number → clipboard + `toast.success`.
- Named party → profile/search link; person/unknown rows are inert (no hover-to-name,
  no expansion).
- Court link → court analytics; legal-ref act link → `/legislatie` act page.
- `SourceProvenanceDrawer` opens a `Sheet`.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton header + 4 skeleton timeline rows + skeleton party rows.
- **Empty sections:** no hearings → "Nicio ședință înregistrată în sursă"; no
  appeals → omit the appeals section quietly (absence of appeal is normal); no named
  parties but person counts → show only the aggregated counts with the privacy
  notice.
- **Gated `acte`:** "Actele citate sunt în pregătire (precizie în validare)".
- **Partial:** timeline loads but parties fail → render timeline + localized note;
  `DataStatusBadge='partial'`.
- **Error / notFound:** invalid `caseId` → `notFound()` ("Dosarul nu a fost găsit");
  fetch error → retry block.
- **Stale:** muted `FreshnessBadge` + "cauzele se actualizează în timp" microcopy
  (mutation norm), never implying real-time.

## Accessibility and i18n

- `CaseTimeline` uses an ordered list with `<time>` elements; each entry has a
  clear heading (hearing date) and is keyboard focusable if it links anywhere.
- `PartyRolesList` is a semantic table or definition list; person-count rows are
  clearly non-interactive (`aria-disabled` not needed — they are plain text).
- Object text region has an `aria-describedby` pointing to the privacy notice.
- Role/stage/category labels localized; case-number format explained via tooltip.
- All copy via Lingui; dates via `Intl`/`i18n.locale`.

## Privacy, provenance, source citation

- **Persons never named or linkable** — only role-counts. `PrivacyBoundaryNotice
  (persons-suppressed)` always present on the `parti` tab.
- **Incidental PII in text** flagged via `PrivacyBoundaryNotice(incidental-text)`;
  text is display-only, never indexed, no person highlighting.
- **Candidate party→company links** carry `IdentityConfidenceBadge`; never assert
  identity.
- **Provenance footer** mandatory; ICCJ-absence + metadata-only + mutation-norm
  caveats stated.
- **Lineage gated** — no inferred chains presented as fact.

## Acceptance checklist

- [ ] Route resolves opaque `$caseId`; `case_number` shown/copyable but not in path;
      invalid id → `notFound()`.
- [ ] Header, object (behind incidental-text notice), three tabs all render.
- [ ] `CaseTimeline` lists hearings; appeals listed; lineage shows only a gated note
      when appeals exist, never a fabricated chain.
- [ ] Named publishable parties link out; persons/unknown appear only as role-counts;
      persons-suppressed notice present.
- [ ] `acte` tab gated by default; live mode shows resolution-status badges.
- [ ] No person search/highlighting; case text not indexed.
- [ ] Provenance drawer + freshness + ICCJ/metadata caveats present.
- [ ] States (loading/empty/partial/stale/error) implemented; `yarn typecheck`
      passes; strings extracted/compiled.

## Non-goals

- No case documents/PDFs (none exist in source).
- No appeal-chain graph / lineage traversal (advanced, gate #10).
- No person identification of any kind.
- No full-text search over case text.
- No editing/annotation.

## Open questions (true blockers only)

None. Legal-reference and lineage exposure are gated and handled by
`laneAvailability`; person-display policy is fixed to name-nulled for v1 (the schema
is invariant to any later policy change).
