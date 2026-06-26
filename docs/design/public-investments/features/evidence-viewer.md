# Feature — Evidence Viewer / "Vezi dovada" (MVP-4)

> Read with `design.md` (shared shapes/routes/guardrails) and `ux.md`. This is
> the domain's defining differentiator: every figure traces to an official
> source. It is **shared infrastructure** — build it early; features 1–3 and 5–9
> all depend on it.

## Feature owner profile

Shared-provenance front-end subagent. Owns the cross-domain `SourceProvenanceDrawer`
+ `EvidenceLink` components and the `dovada` deep-link convention. Should
coordinate with other domains (procurement, NGOs, justice) since the foundation
standardizes these as shared components.

## Summary

A deep-linkable provenance drawer opened by any "Vezi dovada" trigger. Given an
`EvidenceRef`, it shows: the source URL (labeled by kind), the source file /
MinIO object, snapshot id + date, `source_row_key`, `row_hash`, content SHA-256,
and a raw payload excerpt. It is the trust artifact that lets a journalist
reconcile any published number back to the official workbook row.

## Facts / Decisions / Assumptions

- **Fact (UX MVP-4, §5.1/§5.3):** `source_evidence` carries `source_url`,
  `source_file_id`, `object_id`, `source_row_key`; `source_snapshots` carries
  the accepted raw snapshot; MinIO object carries `content_sha256`.
- **Fact (UX R8):** some ArcGIS `source_url` are machine API endpoints, not
  human pages — label "date cartografice (API)".
- **Fact (UX R9):** some legacy `mlpda.ro` links are dead (404) — label as a
  source issue, do not hide.
- **Decision:** The viewer is a **drawer (`Sheet`)**, not a route, opened via the
  `dovada` search param present on every PI route. This makes provenance reusable
  everywhere and deep-linkable/shareable without inventing route segments.
- **Decision:** The objective detail `Dovezi` tab renders the same content
  inline as a full list (the page-level sibling of the drawer); both consume the
  same `SourceProvenanceDrawer` content component.
- **Decision:** The drawer never asserts correctness — it shows what the source
  says. If the underlying figure is `suspect_x1000`/`precision_warning`, the
  drawer states that explicitly and shows the raw cell value.
- **Assumption:** Raw payload excerpt is a small bounded JSON/row snippet
  returned by the adapter; the client does not fetch MinIO directly.

## Route and URL state

- No own route. Param on the host route:

```
dovada: string   // EvidenceRef.sourceRowKey (stable across parser runs)
```

- **Decision:** Opening: set `?dovada=<sourceRowKey>`. Closing: remove it. The
  host page passes the matching `EvidenceRef` (it already has it in its data
  bundle) to the drawer; if the host lacks it (direct deep-link), the drawer
  fetches by `sourceRowKey` via the evidence adapter.
- **Decision:** Because multiple figures on a page can share a `sourceRowKey` but
  point at different evidence rows, the trigger may pass an optional
  `evidenceTable`/`evidenceKey` hint (component prop, not URL) to disambiguate;
  the URL keeps just `sourceRowKey` for shareability, and the drawer shows all
  evidence rows for that key if more than one matches.

## Data contract and mock states

Adapter: `src/features/public-investments/api/evidence.live.ts` +
`evidence.mock.ts`.

```ts
type EvidenceDetail = {
  readonly ref: EvidenceRef
  readonly sourceFileName: string | null      // human label for the workbook
  readonly evidenceTable: string | null       // which *_source_facts table
  readonly evidenceKey: string | null
  readonly rawPayloadExcerpt: string | null   // bounded JSON/row snippet
  readonly amountConfidence: AmountConfidence | null  // when tied to a figure
  readonly amountRaw: string | null           // original cell text
  readonly linkHealth: 'ok' | 'dead' | 'unknown'
}
```

- **Mock states:** (1) healthy workbook link + payload; (2) ArcGIS API link
  (`arcgis_api`) + "deschide JSON brut"; (3) dead `mlpda.ro` link
  (`linkHealth: 'dead'`); (4) tied to a `suspect_x1000` figure (shows raw cell +
  warning); (5) multiple evidence rows for one `sourceRowKey`; (6)
  payload-excerpt missing (`null`) → "previzualizare indisponibilă".

## UI structure (drawer)

- **Header:** "Dovada" + `DataStatusBadge` for the figure (ok / avertizare /
  în verificare). Close button.
- **Source line:** `sourceFileName` + a primary link:
  - `workbook` → "Deschide registrul sursă" (external).
  - `arcgis_api` → "Date cartografice (API)" + small note "endpoint tehnic, nu
    pagină navigabilă".
  - `dead` → "Link sursă indisponibil (404)" disabled + a `RequestDatasetAction`
    "Raportează link mort".
  - `unknown` → neutral "Deschide sursa".
- **Provenance grid** (key→value, `copy-button` each): Snapshot
  (`snapshotId` + `FreshnessBadge` `snapshotDate`), Cheie rând (`sourceRowKey`),
  Hash rând (`rowHash`), Fișier sursă (`sourceFileId` / `objectId`), SHA-256
  conținut (`contentSha256`).
- **Valoarea în sursă** (when tied to a figure): the raw cell text
  (`amountRaw`) + the normalized displayed value + a one-line explanation when
  `suspect_x1000`/`precision_warning` ("valoare posibil ×1000 — în verificare").
- **Raw payload excerpt:** monospace, scrollable (`scroll-area`), with a
  "Copiază" button; "previzualizare indisponibilă" when null.
- **Footer note:** "Datele provin din registre oficiale MDLPA/CKAN. Verifică
  întotdeauna cifra în sursă." Link to `HowToReadData`.

## Component reuse and proposed new components

- Reuse: `Sheet` (bottom on mobile, side on desktop), `scroll-area`,
  `copy-button`, `Badge`, `Button`, `Tooltip`, `Skeleton`, `EmptyState`.
- Shared trust (this feature **owns** them): `SourceProvenanceDrawer` (content +
  drawer shell), `EvidenceLink` (the inline trigger), `FreshnessBadge`,
  `DataStatusBadge` (consumed). Other features import `EvidenceLink`.
- `EvidenceLink` API (Decision): `<EvidenceLink ref={evidenceRef}
  label?="Vezi dovada" evidenceTable? evidenceKey? />` — renders a compact
  button that sets `?dovada=` and passes the ref to the drawer context.

## Interactions

- Click any `EvidenceLink` → opens drawer, sets `?dovada=`. Esc/close → removes
  param, returns focus to the trigger.
- External source link opens in a new tab (`rel="noopener"`); dead links are not
  clickable but explained.
- Copy buttons copy each provenance field + raw payload.
- Deep-link entry (`?dovada=` in a shared URL) → drawer opens on load with a
  fetch-by-key if the host page doesn't already hold the ref.

## Loading / empty / error / partial / stale

- **Loading:** drawer opens immediately with a skeleton grid (ref fields the
  host already knows render instantly; payload/file-name stream in).
- **Empty:** no evidence found for the key → `EmptyState` "Dovada nu a putut fi
  localizată" + the `sourceRowKey` shown for manual lookup. (This itself is an
  honesty state, not a silent failure.)
- **Error:** fetch error → inline error + retry; the ref fields still show.
- **Partial:** missing `contentSha256`/`objectId` → field shows "indisponibil",
  not hidden. ArcGIS/dead links labeled per kind.
- **Stale:** snapshot date rendered via `FreshnessBadge`; if older than
  threshold, muted "posibil neactualizat".

## Accessibility and i18n

- Radix `Sheet` focus trap + return focus to trigger; labelled close; the trigger
  has an `aria-label` ("Vezi dovada pentru {field}"). Provenance grid is a real
  description list (`<dl>`). External-link icons are `aria-hidden` with text.
- All copy via Lingui; field labels Romanian; hash/SHA values are LTR `code`.

## Privacy / provenance

- The drawer shows **source provenance**, not party identity — it must not leak a
  gated party name even if it appears in a raw payload excerpt. **Decision:** the
  adapter redacts gated party fields in `rawPayloadExcerpt` (replaced with
  "[nume reținut — verificare în curs]") before it reaches the client; the client
  additionally redacts any field flagged person-like. This is the one place raw
  data is shown, so the redaction is explicit and mandatory.
- Dead/API source links are surfaced honestly (UX R8/R9), never hidden.

## Acceptance checklist

- [ ] `EvidenceLink` opens the drawer and sets `?dovada=`; Esc closes + restores
      focus + clears the param.
- [ ] Drawer shows source URL labeled by kind (workbook / arcgis_api / dead /
      unknown), snapshot + date, row key, row hash, content SHA-256, file/object,
      and a raw payload excerpt.
- [ ] Deep-link `?dovada=` opens the drawer on load (fetch-by-key fallback).
- [ ] Figures with `suspect_x1000`/`precision_warning` show the raw cell + a
      plain warning.
- [ ] Raw payload redacts gated party fields; no gated name is ever shown.
- [ ] `Dovezi` tab reuses the same content component; `yarn typecheck` clean;
      i18n done.

## Non-goals

- Editing/flagging source data (read-only; "raportează link mort" is a request,
  not a write).
- Rendering full MinIO objects/workbooks in-app (link out instead).
- Cross-source reconciliation UI (that is ADV-1, candidate-only).

## Open questions (blockers only)

- None. Redaction of raw payload party fields is specified above; if the adapter
  cannot guarantee server-side redaction at build time, the client redaction is
  the fail-safe and the feature still ships.
