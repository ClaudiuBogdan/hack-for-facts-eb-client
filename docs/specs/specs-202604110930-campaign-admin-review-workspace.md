# Client Spec: Campaign Admin Review Workspace

**Status**: Accepted
**Date**: 2026-04-11
**Author**: Codex

## Problem

The campaign-admin server API now exposes a safe review queue for
`UserInteractions`, but the client needed a dedicated operator workflow for:

- browsing pending review items with campaign-admin auth boundaries
- triaging multiple reviewable interaction types from one queue
- deep-linking to the related entity and interaction element without exposing
  raw interaction payloads
- reviewing mixed interaction types like public-debate requests and website
  links in one consistent table and detail sheet
- staging spreadsheet-friendly bulk review decisions before submit

Without a dedicated client surface, operators would be forced into raw API
inspection, ad hoc spreadsheets, or fragile one-off admin pages.

## Context

- The server API contract lives in:
  - `../hack-for-facts-eb-server/docs/specs/specs-202604102107-campaign-admin-user-interactions-review-api.md`
  - `../hack-for-facts-eb-server/src/modules/learning-progress/shell/rest/campaign-admin-routes.ts`
  - `../hack-for-facts-eb-server/src/modules/learning-progress/shell/rest/campaign-admin-schemas.ts`
- The current route surface is:
  - `GET /api/v1/admin/campaigns/:campaignKey/user-interactions`
  - `GET /api/v1/admin/campaigns/:campaignKey/user-interactions/meta`
  - `POST /api/v1/admin/campaigns/:campaignKey/user-interactions/reviews`
- The client now has a dedicated admin route tree:
  - `/admin/campaigns/$campaignKey`
  - `/admin/campaigns/$campaignKey/user-interactions`
- Safe queue items currently include:
  - queue identity and lifecycle fields
  - review state and thread summary
  - `websiteUrl`
  - `entityName`
  - `interactionElementLink`
- The interaction-type selector is metadata-driven through
  `availableInteractionTypes`, not fully hardcoded in UI state.
- The bulk-review clipboard workflow intentionally reuses patterns from the
  custom map data series editor spec:
  - `docs/specs/specs-202604092015-custom-map-data-series-editor.md`
  - specifically its clipboard/export/import discipline and tabular alias model

## Decision

Implement the campaign-admin review workspace as a dedicated client feature
under `src/features/campaigns/buget/admin/`, with a route-local queue page,
metadata-driven filters, and a staged spreadsheet review workflow.

### 1. Route and feature structure

- Route files:
  - `src/routes/admin/campaigns/$campaignKey/route.tsx`
  - `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
  - `src/routes/admin/campaigns/$campaignKey/user-interactions.lazy.tsx`
- Feature module:
  - `src/features/campaigns/buget/admin/**`
- The admin workspace stays outside the public campaign shell under
  `/provocare` and `/primarie`.
- The route defaults to `reviewStatus=pending` when opened without explicit
  filters, so operators land in the active queue first.

### 2. Queue and metadata contract

- Queue list parsing lives in:
  - `src/features/campaigns/buget/admin/schemas/api-schemas.ts`
  - `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- Metadata parsing and querying live in:
  - `src/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions.ts`
- The client treats the metadata endpoint as the source of truth for available
  interaction types.
- The client still keeps label fallbacks in `constants.ts` so the UI remains
  readable if metadata labels are null or the metadata request fails.

### 3. Operator UI decisions

- Page shell:
  - full-width workflow layout with `max-w-[1600px]`
  - compact summary band instead of heavy dashboard cards
- Filter toolbar:
  - quick filters stay in one desktop row
  - advanced filters open in a right-side sheet, not a popover
  - applied-filter preview is capped in width and rendered as compact rows
- Queue table:
  - mixed interaction types render in one table
  - interaction type is a separate column
  - entity name links to the campaign entity page
  - interaction type links to the `interactionElementLink` when available
- Review sheet:
  - log-style key/value detail rows
  - same entity and interaction links available in the detail context

### 4. Bulk review spreadsheet workflow

Bulk review now supports clipboard round-tripping through:

- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.ts`
- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.test.ts`

Exported tabular columns include:

- `User ID`
- `Record Key`
- `Entity Name`
- `Entity CUI`
- `Interaction Type`
- `Interaction ID`
- `Submitted Value`
- `Entity Link`
- `Interaction Element Link`
- `Decision`
- `Review Feedback`

Behavior:

- export is scoped to the currently selected queue rows
- pasted rows are matched only against the currently selected queue rows
- staged per-row review drafts are keyed by `userId::recordKey`
- staged values are reused in:
  - the bulk review dialog preview
  - bulk submit
  - the individual review sheet
- rows with blank `Decision` and blank `Review Feedback` are skipped during
  import rather than treated as explicit clears

### 5. Spreadsheet safety

Because the workflow explicitly targets Excel and spreadsheet tools, clipboard
export neutralizes formula-like cells that begin with:

- `=`
- `+`
- `-`
- `@`

The export prefixes those cells before writing TSV to the clipboard so review
spreadsheets do not interpret user-controlled content as formulas.

### 6. Persistence boundary

- Staged bulk-review drafts live only in page-local client state.
- They are not persisted to:
  - local storage
  - campaign progress storage
  - analytics payloads
  - the server before explicit submit

This keeps spreadsheet import a review aid, not a hidden background save
channel.

## Consequences

**Positive**

- operators can triage multiple interaction types from one queue
- entity and interaction links are available without raw payload inspection
- spreadsheet review is fast for bulk decisions and review-note entry
- staged decisions can be inspected before submit and reused per row
- the workflow reuses proven import/export patterns from the dataset editor

**Negative**

- clipboard workflow adds another client-side parsing boundary to maintain
- staged review drafts are currently page-local only; they do not survive full
  reloads
- bulk review is clipboard-based, not file-upload-based
- i18n churn is higher because the admin feature now owns a larger operator UI

## Follow-Ups

- Add direct `.csv/.xlsx` upload to bulk review if clipboard-only becomes too
  limiting for operators.
- Consider making staged review drafts recoverable across reloads if the review
  process regularly spans long sessions.
- Add dedicated UI tests for reopening the bulk dialog with existing staged
  drafts and for website-link export cases.

## References

### Code

- `src/routes/admin/campaigns/$campaignKey/route.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.lazy.tsx`
- `src/features/campaigns/buget/admin/types.ts`
- `src/features/campaigns/buget/admin/constants.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsToolbar.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsTable.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminReviewSheet.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminBulkReviewDialog.tsx`
- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.ts`

### Related Specs

- `../hack-for-facts-eb-server/docs/specs/specs-202604102107-campaign-admin-user-interactions-review-api.md`
- `../hack-for-facts-eb-server/docs/specs/implementation-plan-campaign-admin-user-interactions-review-api.md`
- `docs/specs/specs-202604111020-campaign-admin-bulk-review-clipboard.md`
- `docs/specs/specs-202604092015-custom-map-data-series-editor.md`
- `docs/learning/progress-sync-spec.md`
