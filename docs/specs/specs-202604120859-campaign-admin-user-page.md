# Client Spec: Campaign Admin User Page

**Status**: Accepted
**Date**: 2026-04-12
**Author**: Codex

## Problem

Campaign admins can already review user interactions from the campaign-wide
queue, but there is no dedicated user-scoped page for auditing one user inside
one campaign.

Today, operators must work backwards from `/admin/campaigns/$campaignKey/user-interactions`
and manually apply `userId` filters to reconstruct a user-level view. That
creates a few gaps:

- there is no stable deep link for a campaign admin user page
- the existing queue is optimized for global triage, not for auditing a single
  user over multiple interaction records
- there is no dedicated user-scoped workspace for pinning rows, building a
  selection, and reviewing only that user’s items
- notifications are explicitly out of scope for this iteration, so the page
  must stay focused on user interactions and review actions only

Without a dedicated user page, campaign admins are forced to reuse a global
queue surface for a narrower workflow that deserves its own route, layout, and
client-side workspace behavior.

## Context

- The existing campaign-admin route surface is:
  - `src/routes/admin/campaigns/$campaignKey/route.tsx`
  - `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
  - `src/routes/admin/campaigns/$campaignKey/user-interactions.lazy.tsx`
- The existing client feature already implements:
  - queue filters and routing search state
  - row selection
  - bulk clipboard review staging
  - single-item review sheets
  - multi-item review submit validation
- The existing API already supports filtering interaction data by `userId`
  through:
  - `GET /api/v1/admin/campaigns/:campaignKey/user-interactions`
  - `GET /api/v1/admin/campaigns/:campaignKey/user-interactions/meta`
  - `POST /api/v1/admin/campaigns/:campaignKey/user-interactions/reviews`
- The list endpoint already appends `userId` to the query string in:
  - `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- The current search schema already supports `userId`, `reviewSelectionKey`,
  cursor paging, and review filters in:
  - `src/features/campaigns/buget/admin/schemas/search-schema.ts`
- The existing campaign-admin interaction model does not have server-side
  concepts for user-page workspace state beyond reviewable interaction rows.
- Because the API must be consumed as-is, batch-selection behavior must stay a
  client-side workspace concern built on top of existing queue items, not a new
  server mutation.
- Notifications are explicitly out of scope. This spec must not introduce:
  - notification routes
  - notification tabs
  - notification queries
  - notification placeholders

## Decision

Implement a dedicated campaign-admin user page at
`/admin/campaigns/$campaignKey/users/$userId` as a user-scoped interaction
workspace that reuses the existing interaction list, metadata, and review
mutation APIs, while adding client-side pinning and selection behavior.

### 1. Route structure

- Add a user-scoped route pair:
  - `src/routes/admin/campaigns/$campaignKey/users.$userId.tsx`
  - `src/routes/admin/campaigns/$campaignKey/users.$userId.lazy.tsx`
- The canonical user page URL is:
  - `/admin/campaigns/$campaignKey/users/$userId`
- The page remains inside the existing campaign-admin shell and inherits the
  same route constraints already used by the admin queue:
  - `ssr: false`
  - `createNoStoreHeaders()`
  - `noindex,follow`
  - campaign-key validation through the existing admin route boundary
- The route search schema should be derived from the existing queue search
  schema, with one important rule:
  - `userId` is not user-editable search state on this page
  - `params.userId` is the source of truth for the user-scoped query
- Deep-linkable state on the new page includes:
  - queue filters such as `reviewStatus`, `interactionId`, `payloadKind`,
    `recordKey`, `threadPhase`, and date filters
  - sorting
  - `reviewSelectionKey` for opening the review sheet on a specific row
- Client-side workspace state is intentionally not encoded in the URL:
  - selected rows are local operator state, not canonical route state
- Notifications remain absent from the route tree in this iteration.

### 2. Page structure and component boundaries

- Build the user page as a dedicated interaction workspace, not as a tabbed
  dashboard with empty placeholders.
- Recommended component tree:

```text
AdminCampaignLayout
  CampaignAdminUserPage
    CampaignAdminUserPageHeader
    CampaignAdminUserPageFilters
    CampaignAdminUserInteractionsTable
    CampaignAdminReviewSheet
    CampaignAdminSendValidationDialog
```

- `CampaignAdminUserPage` owns route search state, query orchestration, and the
  local workspace state for selected rows.
- `CampaignAdminUserPageHeader` shows:
  - campaign admin context
  - the scoped `userId`
  - current filter summary
  - a link back to the global campaign admin queue
- `CampaignAdminUserPageFilters` reuses the existing queue filter model but
  removes the `userId` input because the page is already user-scoped.
- The batch-review bar shows:
  - selected row count
  - bulk action entry points
  - clear workspace actions
- `CampaignAdminUserInteractionsTable` remains the primary audit surface and
  extends the current row actions with:
  - `Inspect` or `Review`
  - `Add`
- `CampaignAdminReviewSheet` and
  `CampaignAdminSendValidationDialog` remain the review primitives. The user
  page reuses them instead of inventing a separate review model.

### 3. Client-side workspace actions

The user page introduces one explicit workspace action:

- `Add to selection`

This action is client-side only.

- `Add to selection` means:
  - add an existing interaction row to the current review workspace
  - it does not create a new interaction
  - it does not mutate server state

Behavior rules:

- successful review submit clears submitted rows from the active selection and
  clears their staged review drafts

Persistence rules:

- selected rows live in page-local state
- staged review drafts reuse the existing staged-review storage pattern, with a
  user-scoped storage key to avoid bleed between user pages

### 4. Data and query strategy

- Reuse the existing API client in:
  - `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- Reuse the existing React Query hooks in:
  - `src/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions.ts`
- The user page may wrap those hooks with user-page-specific adapters, but it
  must not rebuild the transport layer or duplicate API parsing logic.

List query strategy:

- The user page fetches all available interaction rows for one `userId` by
  repeatedly consuming the existing cursor-based list endpoint until the user’s
  result set is exhausted.
- Client-side filters and sort then operate on that user-scoped result set.
- This keeps the server contract unchanged while giving the user page complete
  per-user counts, pinning, and selection behavior without route-level paging.

Metadata strategy:

- Continue using `GET /user-interactions/meta` for:
  - `availableInteractionTypes`
  - label and filter-option hydration
- Do not present `meta.stats` as user-scoped counts on the user page because
  the current metadata endpoint is campaign-wide, not filtered by `userId`.
- User-page summary cards are computed from the fetched per-user interaction
  set and include totals such as pending, approved, rejected, and risk-flagged
  counts.

Review mutation strategy:

- Continue using `POST /user-interactions/reviews`.
- Single-row review submits a one-item payload.
- Multi-row review submits the selected rows with the existing validation and
  staged-draft rules.
- After mutation success:
  - patch or invalidate the existing campaign-admin queue queries
  - clear submitted selections
  - clear submitted staged drafts

### 5. Review flows

#### Single-row review

- The operator opens a row from the table.
- The page writes `reviewSelectionKey` into route search state.
- The review sheet resolves the selected row from the current user-scoped
  interaction set.
- The sheet pre-fills staged values when they already exist.
- Submit sends one review item through the existing review mutation.

#### Multi-row review

- The operator builds a workspace selection from the user’s filtered rows.
- The existing clipboard-first bulk review flow remains available through copy /
  paste plus send validation.
- Pasted spreadsheet data maps only against the current selected rows, keyed by
  selection key.
- The send-validation dialog is reused before submit so:
  - non-pending rows are blocked
  - rejected rows require feedback
  - risky approvals require explicit acknowledgement
- Submit sends only rows with valid staged state.

#### Workspace navigation

- Clicking `Add` from the table brings the row into the active selection set.
- Clearing selection removes rows from the current workspace batch.

### 6. Consequences for future implementation

- The first implementation stays fully interaction-focused and does not create
  dead-end notification scaffolding.
- The user page gets a stable route that other admin screens can link to from a
  row’s `userId`.
- The client gains a reusable pattern for user-scoped admin workspaces without
  inventing new server contracts.
- Because the existing metadata endpoint is not user-filtered, the page must
  compute its summary from the fetched per-user interaction set instead of
  campaign-wide metadata.

## Consequences

**Positive**

- campaign admins get a stable user-scoped route instead of a manual filter
  workflow
- the implementation reuses the existing interaction list and review APIs
- the user page can support deep links to a specific review row through
  `reviewSelectionKey`
- selection provides a practical operator workspace without any new backend work
- the design stays extensible for future user-page capabilities while keeping
  this iteration narrow

**Negative**

- the page fetches all interaction rows for one user, which is acceptable for
  this scoped workflow but would not scale to a campaign-wide queue
- the new page adds another route and workspace model to maintain alongside the
  existing global queue

## Non-Goals

- notifications
- notification composer UI
- notification history UI
- creating new user interactions from the user page
- changing the existing campaign-admin interaction API contract
- replacing the global queue route

## Follow-Ups

- Add direct links from the global campaign-admin queue to
  `/admin/campaigns/$campaignKey/users/$userId`.
- Consider a future user-scoped summary endpoint if operators need accurate
  all-time user totals instead of current-query summaries.
- Add notification routes and data flows only when the notification API and UX
  are ready for a separate spec.

## References

### Code

- `src/routes/admin/campaigns/$campaignKey/route.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/users.$userId.tsx`
- `src/routes/admin/campaigns/$campaignKey/users.$userId.lazy.tsx`
- `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/schemas/search-schema.ts`
- `src/features/campaigns/buget/admin/types.ts`
- `src/features/campaigns/buget/admin/components/AdminCampaignLayout.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserPageFilters.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsTable.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminReviewSheet.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminSendValidationDialog.tsx`
- `src/features/campaigns/buget/admin/utils/staged-review-session-storage.ts`
- `src/features/campaigns/buget/admin/utils/bulk-review-clipboard.ts`
- `src/features/campaigns/buget/admin/utils/filter-campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/utils/review-workspace.ts`

### Related Specs

- `docs/specs/specs-202604110930-campaign-admin-review-workspace.md`
- `docs/specs/specs-202604111020-campaign-admin-bulk-review-clipboard.md`
