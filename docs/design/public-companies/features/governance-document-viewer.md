# Feature: Governance Document Viewer

> Next-5. Tab `?tab=guvernanta` on `/intreprinderi-publice/$cui`. Lane:
> governance documents — **URL index exists today; PDF binaries NOT downloaded**.
> Degrades to external "open source PDF" links now; upgrades to an inline viewer +
> extracted text when the governance lane ships. Read with `enterprise-profile.md`,
> `source-lineage-verify.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + shadcn/ui +
Lingui). Builds a two-phase component: a link list today, an inline viewer later,
behind the lane availability flag.

## Summary

Lists the governance documents associated with an enterprise/authority — letters of
expectation, selection announcements, selection-plan composition, and final reports
— from the `media_apt` URL index, each with title, type, the CUI it is keyed to,
and a source link. Today every document opens externally at its source URL; when
the governance lane downloads and text-extracts the PDFs, the same component
upgrades to an inline viewer with extracted text and search.

## Facts, decisions, assumptions

- Fact (UX §5 Lane 7, §13 Next-5): The `json_apt` blob embeds a `media_apt[]` index
  of ~2,459 governance PDF URLs (letters of expectation, selection announcements,
  selection-plan composition, final reports). Each path embeds `CUI_APT`/`CUI_IP`
  and is deterministic + CUI-keyed. Inventory shows ~2,230 `governance_documents`
  (the URL index). **The PDF binaries are NOT downloaded** — a future
  `amepip_governance` lane will fetch + text-extract them.
- Fact (UX §10 #4): The viewer degrades to external "open source PDF" links until
  the governance lane ships.
- Fact (UX Open Q6): Inline text extraction is gated on an approved person-data
  minimization policy (board CVs, remuneration, mandate contracts). The
  text-extraction upgrade must respect it.
- Decision: Phase 1 (today) = a document list with external links, available as
  soon as `media_apt` is served — this is the lightest, highest-value degraded
  version (Fact UX §13 Next-5: "even the degraded version adds value now"). Phase 2
  = inline viewer + extracted text, behind the same tab, switched by the lane
  availability flag.
- Decision: Document type is derived from the `media_apt` path/category into a small
  controlled vocabulary with RO labels (`lib/governance-doc-type.ts`); unknown
  types fall back to "Document de guvernanță".
- Decision: Each document shows whether it is keyed to the enterprise (`CUI_IP`) or
  its authority (`CUI_APT`), so users understand scope.
- Assumption: `report_date`/`title` may be absent for some index entries; the row
  renders with the type + a "deschide ↗" even when the title is missing.

## Route and URL state

- Fact: Panel of `/intreprinderi-publice/$cui`; addressed by `?tab=guvernanta`.
- Decision: Phase 2 inline viewer may add `?doc=<documentId>` to deep-link an open
  document; Phase 1 needs no extra params.

## Data contract and mock states

`fetchGovernanceDocuments(cui)` → `GovernanceDocSet | null` (mock↔live by
`soe-governance-docs`).

```ts
type GovernanceDocSet = {
  cui: string
  documents: readonly GovernanceDocument[]
  // Phase flag: 'index' = links only; 'extracted' = inline viewer + text available
  mode: 'index' | 'extracted'
  lineage: SourceLineage               // json_apt / media_apt
}

type GovernanceDocument = {
  documentId: string                   // deterministic, from media_apt path
  title: string | null
  docType: string                      // controlled vocab key
  docTypeLabel: string                 // RO label
  keyedTo: 'enterprise' | 'authority'  // CUI_IP vs CUI_APT
  cuiIp: string | null
  cuiApt: string | null
  documentDate: string | null          // ISO; often null
  sourceUrl: string                    // external PDF URL (always present in index)
  // Phase 2 only:
  extractedText: string | null         // null in 'index' mode
  contentSha256: string | null
  byteSize: number | null
}
```

### States

- **Gated/index-empty** (default if `media_apt` not yet served): `LaneStatusPanel`
  — "Documente de guvernanță — în curând".
- **Index mode (Phase 1)**: document list, each opening externally. A small note:
  "Documentele se deschid la sursa oficială; vizualizarea în pagină urmează."
- **Extracted mode (Phase 2)**: list + an inline PDF/text viewer with in-document
  search; respects the person-data minimization policy.
- **Empty** (CUI has no governance docs): `EmptyState` "Nu există documente de
  guvernanță indexate pentru această întreprindere." + lineage.
- **Loading**: list skeleton (Phase 1) / viewer skeleton (Phase 2).
- **Error / unreachable PDF**: the row still lists the document; the link opens the
  source and a note covers occasional unavailability (Fact UX §5: index only).
- **Stale**: json_apt snapshot note in lineage badge.

## UI structure

Within the tab panel:

1. **Header note**: explains what governance documents are (letters of expectation,
   selection procedures, final reports) and the current mode (links vs inline).
2. **Document list** (`divide-y` rows): each row — `docTypeLabel` chip ·
   `title` (or "Document de guvernanță") · `documentDate` (when present) ·
   `keyedTo` chip ("Întreprindere" / "Autoritate") · "Deschide PDF ↗" → `sourceUrl`
   (new tab) + row-level lineage. Group/filter by `docType` when the list is long.
3. **Phase 2 viewer** (when `mode==='extracted'`): a split or modal viewer
   rendering the PDF + extracted text with search; a privacy banner if any
   minimization applies (`PrivacyBoundaryNotice`).
4. **Glossary**: short glosses for "scrisoare de așteptări", "procedură de
   selecție", "raport final".

## Component reuse and proposed new components

- Reuse: `Badge`, `Tooltip`, `Button`, `accordion`, `alert`, `skeleton`,
  `empty-state`, `divide-y` list, `Dialog`/`Sheet` (Phase 2 viewer);
  `SourceLineageBadge`, `DataStatusBadge`, `LaneStatusPanel`, `PrivacyBoundaryNotice`
  (README shared candidate).
- New: `GovernanceDocList`, `GovernanceDocRow`, `lib/governance-doc-type.ts`
  (path/category → label), and (Phase 2) `GovernanceDocViewer`.

## Interactions

- Click "Deschide PDF ↗" → external `sourceUrl` (new tab, `rel="noopener
  noreferrer"`).
- Filter by `docType` → client-side filter.
- Phase 2: click a row → open inline viewer (`?doc=…`), search within text.
- `SourceLineageBadge` → provenance drawer (json_apt / media_apt source).

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: Phase 1 always works as a link index even
though binaries are not downloaded; the inline viewer is additive and gated on both
the lane and the person-data policy.

## Accessibility and i18n

- Document list is a semantic list; external links have `aria-label` + sr-only
  new-tab note; type/keyedTo chips pair text with color.
- Phase 2 viewer (`Dialog`/`Sheet`) manages focus, has a heading + close, and the
  extracted text is selectable/searchable text, not an image.
- All copy Lingui; expand governance terms on first use; dates locale-formatted.

## Privacy, provenance, and source-citation behavior

- Phase 1 surfaces only public document URLs — no person data is extracted or shown.
- Phase 2 text extraction is gated on the approved person-data minimization policy
  (Fact UX Open Q6); until approved, no extracted text is rendered even if the
  binaries exist. A `PrivacyBoundaryNotice` explains any minimization.
- `Sursă: AMEPIP (json_apt / media_apt)` label + per-document lineage; documents
  keyed to the authority are labelled as such (link, never merge).

## Acceptance checklist

- [ ] Gated until `media_apt` is served, then renders the document list in index
      mode (external links) — the high-value degraded version.
- [ ] Each row shows type, title (or fallback), keyed-to scope, date when present,
      and an external source link with lineage.
- [ ] "No documents" renders as a plain statement, not an error.
- [ ] Inline viewer (Phase 2) is behind the lane flag AND the person-data policy;
      it shows selectable extracted text with a privacy notice, never an image-only
      blob.
- [ ] No person data is shown in index mode; Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No PDF downloading/hosting by the client (links point at the official source).
- No extracted text until the governance lane + minimization policy are approved.
- No board-roster/remuneration structured data (out of scope — Fact UX §6).

## Open questions (blockers only)

- **Blocker (Phase 1)**: serving the `media_apt` URL index to the client (part of
  the json_apt/controlling-authority lane deploy). Until then, gated/mock.
- **Blocker (Phase 2)**: the `amepip_governance` PDF download+extraction lane AND an
  approved person-data minimization policy (Fact UX Open Q6). Phase 1 ships
  independently of Phase 2.
