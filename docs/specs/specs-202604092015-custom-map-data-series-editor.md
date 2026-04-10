# Client Spec: Custom Map Data Series Editor

**Status**: Accepted
**Date**: 2026-04-10
**Author**: Codex

## Problem

Users can now persist advanced map datasets on the server, but the client has no dedicated workflow for:

- creating a custom map data series from pasted rows, manual entry, or spreadsheet import
- editing an existing owned dataset with safe draft persistence
- browsing owned datasets separately from public datasets
- cloning public datasets without exposing edit actions for non-owners
- reconciling a spreadsheet-friendly UX with the current backend contract, which now supports row-level numeric and typed JSON values

Without a dedicated client flow, users cannot reliably build map-ready datasets, recover unsaved work, or understand which data is editable versus clone-only.

## Context

- Server support now exists for advanced map datasets:
  - owner APIs: create, list, detail, patch metadata, replace rows, delete
  - public APIs: list public datasets, fetch a shareable dataset by `publicId`
  - advanced map snapshots can reference uploaded datasets and public map reads rewrite those references to `datasetPublicId`
- Uploaded datasets are live references, not immutable snapshot payloads:
  - map snapshots store dataset identifiers, not copied row values
  - replacing dataset rows changes the effective values seen by maps and historical snapshots that reference that dataset
- Current backend constraints are important:
  - dataset rows are persisted as `siruta_code + valueNumber/valueJson`
  - create supports JSON row payloads at `POST /api/v1/advanced-map-datasets/json`
  - row replacement supports JSON row payloads at `PUT /api/v1/advanced-map-datasets/:id/rows`
  - map/grouped-series export consumes only the numeric layer and treats missing numeric values as empty cells
  - datasets cannot be empty when created or replaced
  - public maps may reference only `public` or `unlisted` datasets
  - deleting a dataset or downgrading it to `private` is blocked when referenced by maps
- The client already has a proven editor pattern in advanced map analytics:
  - `/maps/editor/new` materializes or clones a server-backed resource, then redirects to `/maps/editor/$mapId`
  - a per-resource session draft store is persisted with Zustand
  - IndexedDB stores local snapshots with autosave and manual restore
  - initial state resolution prefers the newest session draft or IndexedDB snapshot over the server snapshot
  - clone handoff uses short-lived session storage tokens instead of long query payloads
- The client already has UAT reference lookups through GraphQL and can fetch `id`, `uat_code`, `siruta_code`, `name`, and `county_name`, which is enough to render the reference columns required by the editor.

## Decision

Implement a dedicated client feature under `src/features/advanced-map-datasets/` with a draft-first create flow, an owner edit flow, and a read-only public clone flow.

### 1. Route model

- `/maps/datasets`
  - Landing page for the feature.
  - Two top-level sections:
    - `My data series`
    - `Public explorer`
  - Owner cards expose `Open`, `Clone`, and `Delete`.
  - Public cards expose `Preview` and `Clone`, never `Edit`.
- `/maps/datasets/new`
  - New dataset editor.
  - Search params:
    - `draftId?: string`
    - `cloneRef?: string`
  - If `draftId` is missing, generate one client-side and replace the URL.
  - If `cloneRef` exists, consume a short-lived dataset clone handoff and seed the new draft.
- `/maps/datasets/$datasetId`
  - Owner-only edit route for an existing server dataset.
  - Hydrates from server detail, session draft, and IndexedDB local snapshots using timestamp precedence.
  - Shows a persistent caution banner: editing the dataset updates every map snapshot that references it.
- `/maps/datasets/public/$publicId`
  - Read-only preview for public or unlisted shared datasets.
  - Primary action is `Create editable copy`, which navigates to `/maps/datasets/new?cloneRef=...`.

Reasoning:

- The current backend cannot create an empty dataset, so the create route must be local-draft-first rather than map-style immediate server creation.
- Public preview gets its own route so shared datasets can be inspected and cloned without mixing owner and non-owner behaviors.

### 2. Draft persistence model

- Reuse the map editor’s two-layer draft architecture, adapted for datasets.
- Session draft store:
  - Zustand `persist` in session storage.
  - Keyed by `datasetId` for edit routes and `draftId` for new routes.
  - Holds:
    - metadata draft
    - normalized row draft
    - import parse state
    - `updatedAt`
- IndexedDB local snapshots:
  - Dexie database, e.g. `advanced-map-datasets-local`.
  - One table for local snapshots keyed by `resourceKey = dataset:{id}` or `draft:{draftId}`.
  - Autosave after debounce, plus manual named checkpoints.
- Dirty tracking:
  - Hash the canonical payload, not the raw grid.
  - Strip empty rows before hashing.
  - Normalize row ordering by `sirutaCode`.
  - Exclude reference-only fields (`cui`, `name`, `countyName`) from the persisted payload hash.

The create flow differs from the map editor in one place:

- New datasets do not create a server record until the first successful save.
- After first successful create, navigate from `/maps/datasets/new?draftId=...` to `/maps/datasets/$datasetId`.
- Preserve the local snapshot chain by migrating local draft records from `draft:{draftId}` to `dataset:{datasetId}` after create succeeds.

### 3. Client-side draft shape

Use a client draft model that mirrors the current server row model while keeping
spreadsheet editing ergonomic.

```ts
type CustomDatasetDraft = {
  identity: {
    mode: 'new' | 'edit' | 'public-clone'
    draftId?: string
    datasetId?: string
    publicId?: string
  }
  metadata: {
    title: string
    description: string
    markdown: string
    unit: string
    visibility: 'private' | 'unlisted' | 'public'
  }
  rows: Array<{
    sirutaCode: string
    valueNumber: string
    valueJson: null | { type: 'text' | 'link' | 'markdown', value: unknown }
    rawValue: string
    parsedNumber?: number
    reference: {
      cui: string | null
      name: string
      countyName: string
    }
    source: 'manual' | 'paste' | 'import'
    isEmpty: boolean
    validation?: {
      level: 'error' | 'warning'
      message: string
    }
  }>
  importState: {
    sourceFileName?: string
    sourceKind?: 'csv' | 'xlsx' | 'xls' | 'paste'
    lastImportedAt?: string
    parseErrors: Array<{ rowNumber: number; message: string }>
  }
  updatedAt: string | null
}
```

Notes:

- `rawValue` / `valueNumber` stay string in the draft so paste/import stays
  lossless.
- `parsedNumber` is derived client-side only for map preview and local numeric
  validation.
- `valueJson` uses a code-defined typed item registry with the initial payloads
  `text`, `link`, and `markdown`.

### 4. UAT reference data and grid behavior

The editor grid always starts from the UAT directory, not from arbitrary uploaded rows.

- Reference columns:
  - `sirutaCode`
  - `cui`
  - `name`
  - `countyName`
- Editable columns:
  - `value`
  - `payload`
- Metadata fields above the grid:
  - `title`
  - `unit`
  - `visibility`
  - `description`
  - `markdown / notes`

Grid modes:

- `Paste / import`
  - Accept TSV/CSV paste from spreadsheets.
  - Accept `.xlsx`, `.xls`, and `.csv` files.
  - Parse into the normalized draft rows.
  - Ignore blank lines and rows where both numeric value and payload are empty.
  - Match incoming columns through header aliases.
  - Add a workbook parser dependency for Excel files, preferably `xlsx`, while reusing `papaparse` for CSV/TSV parsing.
  - Support at least:
    - `siruta_code`
    - `siruta`
    - `uat_code`
    - `cui`
    - `name`
    - `county`
    - `value`
    - `text`
    - `link`
    - `markdown`
- `Manual entry`
  - Start from the full UAT directory.
  - Search by UAT name.
  - Filter by county.
  - Show only non-county UATs, matching server validation.
  - Empty rows remain in the local draft for convenience, but are stripped from save payloads.

Implementation notes:

- Create a dedicated `useUatDirectoryQuery` backed by the existing GraphQL `uats` query shape already used in campaign code.
- Prefer server-backed GraphQL directory data over hard-coded geojson extraction for the main grid because it already exposes `uat_code` and `siruta_code`.

### 5. Save and API flow

#### Create

1. User edits local draft in `/maps/datasets/new`.
2. Client validates:
   - metadata required fields
   - at least one non-empty row
   - all non-empty rows have valid `sirutaCode`
   - all saved rows have at least one of `valueNumber` or `valueJson`
   - any present numeric value is representable by the server contract
   - any present JSON payload matches the supported typed schema
3. Client canonicalizes rows:
   - drop empty rows
   - dedupe by `sirutaCode` with inline validation before submit
   - preserve numeric text as entered
   - preserve typed JSON payloads as `{ type, value }`
4. Client submits `POST /api/v1/advanced-map-datasets/json`.
5. On success:
   - seed React Query detail cache
   - migrate local draft identity from `draftId` to `datasetId`
   - navigate to `/maps/datasets/$datasetId`
   - reset dirty baseline

#### Edit metadata

1. User edits metadata in `/maps/datasets/$datasetId`.
2. Save metadata only through `PATCH /api/v1/advanced-map-datasets/:id`.
3. If the API returns `DatasetInUseError` on visibility downgrade, show referencing maps in the confirmation/error surface.

#### Replace rows

1. User changes grid data in `/maps/datasets/$datasetId`.
2. Client sends full row payloads using the current draft row model.
3. Submit `PUT /api/v1/advanced-map-datasets/:id/rows`.
4. On success:
   - refresh detail and owner list queries
   - update dirty baseline
   - retain local snapshots for history

#### Public clone

1. User opens `/maps/datasets/public/$publicId`.
2. Client fetches public detail.
3. `Create editable copy` writes a session clone handoff token.
4. Navigate to `/maps/datasets/new?cloneRef=...`.
5. New route seeds a local draft with:
   - copied metadata
   - copied rows
   - forced visibility default `private`
   - title suffix strategy: either blank suffix or `Copy of ...`

### 6. UI composition

- `DatasetListPage`
  - Mirrors `MapAnalyticsListPage` structure.
  - Includes owner and public sections with separate query states.
- `DatasetEditorPage`
  - Dedicated layout for metadata + grid + import affordances.
  - One compact payload column is shown in the values table.
  - CSV/clipboard export uses payload type names as column names when payload
    rows are present.
  - Sticky action bar:
    - save metadata
    - save rows
    - clone
    - restore local snapshot
    - delete for owners only
- `DatasetGrid`
  - Virtualized table for large UAT sets.
  - Search and county filter pinned above rows.
  - Optional toggle:
    - `Show edited rows only`
    - `Show all UATs`
- `DatasetImportDialog`
  - Paste area
  - File upload
  - Header mapping preview
  - Validation summary
- `DatasetLocalSnapshotsModal`
  - Same semantics as map local snapshots.
- `DatasetUnsavedChangesDialog`
  - Route leave + tab-close warning for dirty drafts.
- `DatasetUsageWarning`
  - Owner edit-only banner explaining that dataset edits are live for referencing maps.
  - If the backend later exposes `reference_count` or referencing map summaries in detail payloads, upgrade this banner to show exact impact.

### 7. Validation and interface rules

- Client-side validation should be stricter than transport, not looser.
- Before save:
  - strip empty rows
  - reject duplicate `sirutaCode`
  - reject unsupported county-level rows
  - reject invalid numeric text when a numeric value is present
  - reject invalid `link` payload URLs
- Row content rules:
  - each saved row must contain at least one of `valueNumber` or `valueJson`
  - `valueJson` must match one of the supported typed payloads: `text`, `link`, or `markdown`
  - spreadsheet import may populate at most one payload type per row
  - payload-only rows are valid dataset content
- Map/export rules:
  - advanced map grouped-series and map preview consume only `valueNumber`
  - payload-only rows remain visible in the dataset UI and dataset JSON export
  - CSV/clipboard export uses payload type names as columns (`text`, `link`, `markdown`) when those payloads are present

### 8. Query keys and client API module

Add `src/features/advanced-map-datasets/api/advanced-map-datasets-api.ts` and `.../hooks/use-advanced-map-datasets.ts`.

Suggested query keys:

```ts
advancedMapDatasetKeys = {
  ownerList: ['advanced-map-datasets', 'owner-list'],
  ownerDetail: (datasetId: string) => ['advanced-map-datasets', 'owner-detail', datasetId],
  publicList: ['advanced-map-datasets', 'public-list'],
  publicDetail: (publicId: string) => ['advanced-map-datasets', 'public-detail', publicId],
}
```

Suggested API surface:

- `listAdvancedMapDatasets()`
- `getAdvancedMapDataset(datasetId)`
- `createAdvancedMapDataset(input)`
- `updateAdvancedMapDatasetMetadata(datasetId, patch)`
- `replaceAdvancedMapDatasetRows(datasetId, input)`
- `deleteAdvancedMapDataset(datasetId)`
- `listPublicAdvancedMapDatasets()`
- `getPublicAdvancedMapDataset(publicId)`

Notes:

- Owner writes use JSON row payloads, not multipart CSV.
- Public/share flows use `publicId` as the external handle.
- The client may normalize a stable local `id` from `publicId` for rendering convenience, but that fallback must not leak into outbound share/public API calls.

### 9. Testing strategy

#### Unit

- CSV serialization strips empty rows and preserves strict header order.
- Paste/import normalization recognizes header aliases and rejects ambiguous mappings.
- Dirty hash ignores empty rows and reference-only columns.
- Draft migration from `draftId` to `datasetId` keeps content and snapshots.
- Clone handoff expires and is single-use.
- Route search parsing for `draftId` and `cloneRef`.

#### Component

- `/maps/datasets/new` generates a local draft when no `draftId` exists.
- `/maps/datasets/new?cloneRef=...` seeds a cloned draft and does not create a server record until save.
- `/maps/datasets/$datasetId` resolves newest state among server, session draft, and IndexedDB snapshot.
- Grid search and county filter update the visible UAT rows without mutating saved payload shape.
- Save buttons disable correctly on invalid drafts or pending mutations.
- Public preview never renders edit or delete actions.

#### Integration

- Owner list + public explorer query invalidation after create/update/delete/clone.
- Create and replace rows flows send JSON rows with `valueNumber` and `valueJson`.
- Import/export and clipboard preserve typed payload columns named by payload type.
- Replace rows flow sends only non-empty rows.
- API `DatasetInUseError` is surfaced with referencing map titles.
- Visibility downgrade failure keeps local draft intact.

#### E2E / manual

- Paste data from spreadsheet with extra reference columns.
- Import `.xlsx` file and resolve header mapping.
- Recover unsaved local draft after refresh.
- Restore an older local snapshot after destructive edits.
- Clone a public dataset into a private editable draft.
- Publish a dataset, use it in a map, then verify delete/private downgrade protection UX.

## Alternatives Considered

### 1. Reuse `/maps/editor` and embed dataset editing inside the map editor

Rejected because:

- dataset authoring has a different object lifecycle than map authoring
- the grid/import workflow is substantially heavier than map series configuration
- ownership and public-clone rules need their own list and preview surfaces

### 2. Create an empty server dataset immediately on `/maps/datasets/new`

Rejected because the current backend contract forbids empty datasets and only creates persisted datasets once the client has a valid row payload to submit.

### 3. Keep drafts only in React state

Rejected because:

- spreadsheet imports are high-friction and easy to lose
- the map editor already established a better persistence pattern
- refresh and crash recovery are required for this workflow

### 4. Force the client draft model to be numeric-only

Rejected because:

- paste/import ergonomics benefit from storing raw strings losslessly
- typed JSON payloads are part of the current save contract
- future payload expansion should not require a second client-state redesign

## Consequences

**Positive**

- Aligns dataset authoring with the existing map editor draft architecture.
- Supports manual entry, paste, and file import without waiting for a richer backend draft API.
- Keeps public exploration clearly separated from owner editing.
- Makes backend map/export limitations explicit while still supporting richer dataset payloads.
- Produces a testable route and API contract before UI implementation.

**Negative**

- New dataset create flow is not identical to the map editor because the backend cannot create empty records.
- CSV remains numeric-oriented for spreadsheet workflows even though datasets can store typed payloads.
- Advanced map grouped-series still ignores payload data and depends on the numeric layer.
- Additional complexity is introduced for draft migration from local-only `draftId` to server `datasetId`.

## References

- Server dataset schema: `hack-for-facts-eb-server/src/infra/database/user/schema.sql`
- Server CSV parser: `hack-for-facts-eb-server/src/modules/advanced-map-datasets/shell/utils/parse-uploaded-dataset-csv.ts`
- Server dataset routes: `hack-for-facts-eb-server/src/modules/advanced-map-datasets/shell/rest/routes.ts`
- Server dataset repo: `hack-for-facts-eb-server/src/modules/advanced-map-datasets/shell/repo/advanced-map-datasets-repo.ts`
- Server map snapshot dataset canonicalization: `hack-for-facts-eb-server/src/modules/advanced-map-analytics/shell/rest/routes.ts`
- Client map new route: `src/routes/maps/editor/new.lazy.tsx`
- Client map draft store: `src/features/advanced-map-analytics/store/map-editor-draft-store.ts`
- Client map local snapshots DB: `src/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db.ts`
- Client map list/clone flow: `src/features/advanced-map-analytics/components/map-analytics-list-page.tsx`
- Existing UAT directory query: `src/features/campaigns/buget/api/subscription-stats.ts`
- Existing map editor decisions: `docs/advanced-map-analytics-tech-decisions.md`
- Existing alerts spec pattern: `docs/ALERTS_DATA_SERIES_SPEC.md`
