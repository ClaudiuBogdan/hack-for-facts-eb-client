# Client Spec: Campaign Admin Bulk Review Clipboard Workflow

**Status**: Accepted
**Date**: 2026-04-11
**Author**: Codex

## Problem

Campaign admins can already approve or reject queue items one-by-one, but bulk
review still breaks down in real operator workflows:

- link-heavy review is easier in spreadsheets than inside a modal list
- operators need to compare multiple rows in Excel or Sheets before deciding
- the existing bulk dialog only supports one shared decision and one shared
  feedback value
- there is no structured import path back from reviewed spreadsheet rows into
  staged per-item review decisions

Without a spreadsheet-friendly boundary, reviewers fall back to ad hoc copy,
manual re-entry, or external notes that are hard to reconcile with the queue.

## Context

- The admin queue feature is documented in:
  - `docs/specs/specs-202604110930-campaign-admin-review-workspace.md`
- The bulk dialog and page orchestration live in:
  - `src/features/campaigns/buget/admin/components/CampaignAdminBulkReviewDialog.tsx`
  - `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- The implementation deliberately reuses ideas from the dataset editor import /
  export flow:
  - `docs/specs/specs-202604092015-custom-map-data-series-editor.md`
  - `src/features/advanced-map-datasets/utils/clipboard.ts`
  - `src/features/advanced-map-datasets/utils/draft.ts`
  - `src/features/advanced-map-datasets/components/dataset-import-dialog.tsx`
- Queue rows already expose enough safe context for spreadsheet review:
  - `entityName`
  - `entityCui`
  - interaction type
  - submitted value (`institutionEmail` or `websiteUrl`)
  - entity link
  - interaction element link

## Decision

Implement a clipboard-first bulk review workflow that exports selected queue
rows as TSV, parses edited spreadsheet rows back into staged per-item review
drafts, and uses those staged drafts during bulk submit and individual review.

### 1. Clipboard format

Export selected rows as TSV with the following headers:

- `User Interaction ID`
- `User ID`
- `Record Key`
- `Entity Name`
- `Entity CUI`
- `Interaction Type`
- `Interaction ID`
- `Entity Link`
- `Interaction Element Link`
- `Submitted Value`
- `Decision`
- `Review Feedback`

This format is implemented in:

- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.ts`

### 2. Parser behavior

The parser accepts tabular pasted data only and supports header aliases for the
editable review columns:

- decision aliases:
  - `decision`
  - `status`
  - `review status`
  - `review decision`
  - `approval`
  - `result`
- feedback aliases:
  - `review feedback`
  - `feedback`
  - `feedback text`
  - `review note`
  - `note`
  - `comment`
  - `reason`

Decision values normalize to:

- `approved`
- `rejected`

including Romanian and yes/no style aliases.

The parser must:

- require `User Interaction ID` or a legacy `Record Key`, plus `Decision`
- reject invalid decision values
- reject duplicate review rows by the effective selected-row id
- reject ambiguous legacy record keys when the current selection contains more
  than one row with the same record key
- reject rows that do not belong to the currently selected queue items
- skip rows where both `Decision` and `Review Feedback` are blank

### 3. Selected-row scoping

Clipboard export and import are intentionally scoped to the current queue
selection:

- export writes only `selectedItems`
- import matches rows only against `selectedItems`, using the composite
  `${userId}::${recordKey}` identifier as the primary key
- legacy pasted sheets can still match by `User ID` + `Record Key`, or by
  `Record Key` alone when that key is unambiguous in the current selection
- unknown or unselected rows are reported as issues, not silently imported

This keeps spreadsheet review aligned with the explicit operator selection
boundary already present in the UI.

### 4. Staged draft model

Imported rows are stored as staged per-item review drafts keyed by:

- `${userId}::${recordKey}`

Current draft shape:

```ts
type CampaignAdminStagedReviewDraft = {
  userId: string
  recordKey: string
  status: 'approved' | 'rejected'
  feedbackText: string
}
```

These drafts live in page-local state inside:

- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`

### 5. Reuse of staged values

Staged spreadsheet values must be reused in three places:

- bulk dialog preview
- bulk submit
- single review sheet

Current behavior:

- bulk submit uses the staged row decision when present
- bulk submit falls back to the dialog-wide default decision for rows without a
  staged draft
- single review sheet prefills the review note from the staged draft and shows
  an alert indicating staged approval or rejection already exists

### 6. Spreadsheet safety

Because operators paste exported rows into spreadsheet software, export must
neutralize formula-like cells that start with:

- `=`
- `+`
- `-`
- `@`

The implementation prefixes those values before writing TSV to the clipboard so
user-controlled values do not execute as spreadsheet formulas.

## Consequences

**Positive**

- operators can review links and values externally, then import decisions back
  into the queue
- bulk review no longer forces one shared decision for every selected row
- parser/export logic is testable in isolation
- direct paste can import clipboard content immediately without a separate
  manual import step
- the workflow reuses known clipboard/import conventions from the dataset
  editor

**Negative**

- clipboard import/export adds a client parsing boundary to maintain
- staged drafts are not persisted across full reloads
- this is not yet a file-upload-based spreadsheet workflow
- imported rows only apply to currently selected queue items, which is safer but
  stricter than a global import

## Non-Goals

- direct `.csv`, `.tsv`, `.xlsx`, or `.xls` upload in the bulk review dialog
- persistent server-side draft save before submit
- automatic clearing when a pasted row leaves decision and feedback blank

## Follow-Ups

- Add direct file upload if clipboard-only review proves too limiting.
- Add explicit UI for editing staged decision state inside the single review
  sheet, not just staged-note prefill and status messaging.
- Add UI tests for reopening the bulk dialog with existing staged drafts.
- Add export tests for additional interaction types beyond the current ones if
  the queue grows.

## References

### Code

- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.ts`
- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.test.ts`
- `src/features/campaigns/buget/admin/components/CampaignAdminBulkReviewDialog.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminReviewSheet.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.test.tsx`

### Related Specs

- `docs/specs/specs-202604110930-campaign-admin-review-workspace.md`
- `docs/specs/specs-202604092015-custom-map-data-series-editor.md`
