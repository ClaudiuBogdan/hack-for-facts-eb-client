# Client Spec: Campaign Admin Institution Threads

**Status**: Draft
**Date**: 2026-04-16
**Author**: Codex

## Problem

The campaign-admin client already exposes operational pages for interactions,
users, entities, notifications, and analytics, but it has no dedicated UI for
institution email threads.

That leaves a gap between the new server-side institution-thread contract and
the actual admin workspace:

- there is no stable campaign-admin route for reviewing institution threads
- admins cannot inspect one thread’s response history and correspondence from
  the client
- admins cannot append a manual response event from the client
- the current admin navigation has no institution-thread entry point even
  though institution-thread state is now part of the workflow

The UI also has product constraints that need to be expressed deliberately:

- there must be one list view, not separate “started” and “unresolved” pages
- open vs closed is a derived filter grouping, not a separate route family
- resolved threads must not allow another appended response event
- correspondence content must be rendered as untrusted plain text

Without a dedicated client surface, the new server contract remains operational
but unusable in the existing campaign-admin workflow.

## Context

### Existing campaign-admin client structure

The current client admin architecture already follows a consistent pattern:

- route files under `src/routes/admin/campaigns/$campaignKey/`
- feature code under `src/features/campaigns/buget/admin/`
- typed REST client per admin slice under `api/`
- React Query hooks per slice under `hooks/`
- strict Zod response parsing in
  `src/features/campaigns/buget/admin/schemas/api-schemas.ts`
- route search schemas and normalization helpers in
  `src/features/campaigns/buget/admin/schemas/search-schema.ts`
- page shells built on `AdminCampaignLayout`

The route split is already established:

- non-lazy route file for `ssr`, `headers`, `validateSearch`, and `head`
- lazy route file for params/search/navigate/page wiring
- parent-route-with-`Outlet` pattern for nested detail routes

Relevant client references:

- `src/routes/admin/campaigns/$campaignKey/entities.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.$entityCui.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.$entityCui.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.lazy.tsx`
- `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-notifications.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-entities.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications.ts`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminHubPage.tsx`

### Server contract to mirror

The new client slice must consume the existing server API exactly as exposed:

- `GET /api/v1/admin/campaigns/:campaignKey/institution-threads`
- `GET /api/v1/admin/campaigns/:campaignKey/institution-threads/:threadId`
- `POST /api/v1/admin/campaigns/:campaignKey/institution-threads/:threadId/responses`

Authoritative server reference:

- `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604160837-campaign-admin-institution-threads-api.md`

Important server and product rules:

- `stateGroup=open` means `started + pending`
- `stateGroup=closed` means `resolved`
- list ordering is fixed to `updatedAt desc`
- there is no thread meta endpoint
- list filtering supports `threadState`, `responseStatus`, `query`,
  `entityCui`, `updatedAt*`, and `latestResponseAt*`
- detail exposes correspondence text only through `textBody`
- detail does not expose `htmlBody`, recipient arrays, or raw transport
  metadata
- append-response writes are append-only and optimistic via `expectedUpdatedAt`
- resolved threads reject further append attempts

### Client constraints

- keep all new feature code under `src/features/campaigns/buget/admin/`
- do not modify server code
- keep auth gating consistent with existing admin pages via `useAuth()`
- use Lingui `t` for all new user-facing strings
- prefer TanStack `Link` and route search objects over manual `href` strings
- keep all returned message and correspondence text as plain text nodes only

## Decision

Implement institution threads as a new campaign-admin client slice that follows
the existing admin route/API/hook/component structure, with one list page, one
list-side quick-action sheet, one detail page, and one append-response
workflow.

### 1. Route structure

Add four routes:

- `src/routes/admin/campaigns/$campaignKey/institution-threads.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.lazy.tsx`

Behavior:

- `/institution-threads` is the only list page
- `/institution-threads/$threadId` is the nested detail page
- the parent lazy route mirrors the entities route and renders `Outlet` when
  the current pathname is a detail path
- the parent non-lazy route validates the dedicated institution-thread search
  schema
- the detail non-lazy route does not introduce a second search schema
- the detail page preserves the parent list search so “Back to threads” returns
  to the same filtered list state

Route metadata:

- `ssr: false`
- `headers: () => createNoStoreHeaders()`
- `robots: noindex,follow`
- canonical list URL:
  `/admin/campaigns/$campaignKey/institution-threads`
- canonical detail URL:
  `/admin/campaigns/$campaignKey/institution-threads/$threadId`

Recommended head titles:

- `Institution threads - Transparenta.eu`
- `Institution thread - Transparenta.eu`

### 2. Feature files and component boundaries

Add these feature files:

- `src/features/campaigns/buget/admin/api/campaign-admin-institution-threads.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads.ts`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsToolbar.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsTable.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailPage.tsx`

Optional extracted UI:

- institution-thread quick-action sheet component
- append-response dialog or form component, if it keeps the detail page clean

Recommended page composition:

```text
AdminCampaignLayout
  CampaignAdminInstitutionThreadsPage
    CampaignAdminInstitutionThreadsToolbar
    CampaignAdminInstitutionThreadsTable
    CampaignAdminCursorPager
    institution-thread quick-action sheet

AdminCampaignLayout
  CampaignAdminInstitutionThreadDetailPage
    thread summary cards
    response events section
    correspondence section
    append-response dialog
```

The list page owns route search normalization, filter validation, cursor paging,
query orchestration, selected-thread sheet state, and the quick-action sheet
detail fetch.

The detail page owns the detail query, append-response mutation, and the
thread-specific sections.

The same append-response form component may be reused by both the quick-action
sheet and the detail page, but there must remain one mutation path and one
request model.

### 3. Types, constants, and API schemas

Extend:

- `src/features/campaigns/buget/admin/types.ts`
- `src/features/campaigns/buget/admin/constants.ts`
- `src/features/campaigns/buget/admin/schemas/api-schemas.ts`

Add institution-thread-specific values and types:

- `CampaignAdminInstitutionThreadState`
  - `started`
  - `pending`
  - `resolved`
- `CampaignAdminInstitutionThreadStateGroup`
  - `open`
  - `closed`
- `CampaignAdminInstitutionThreadResponseStatus`
  - `registration_number_received`
  - `request_confirmed`
  - `request_denied`

Add DTO types for:

- institution-thread list item
- institution-thread list response
- institution-thread detail response
- response event
- correspondence entry
- correspondence attachment metadata
- append-response request body
- append-response response
- route search and filter objects

Add constants/helpers for:

- value arrays used by Zod and UI selects
- badge labels for `threadState`, `stateGroup`, and `responseStatus`
- fixed list defaults such as `DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT`

Add API schema parsers for:

- list envelope
- detail envelope
- append-response request body
- append-response success envelope

The schemas must stay strict and model the server contract exactly:

- `submissionPath` is the literal `platform_send`
- `textBody` and `messageContent` are nullable or required exactly as returned
- response events remain oldest-first as provided by the server
- list `page.sortBy` is always `updatedAt`
- list `page.sortOrder` is always `desc`

### 4. Search state model

Add a dedicated institution-thread route search schema to
`src/features/campaigns/buget/admin/schemas/search-schema.ts`.

Search state fields:

- `stateGroup?: "open" | "closed"`
- `threadState?: "started" | "pending" | "resolved"`
- `responseStatus?: "registration_number_received" | "request_confirmed" | "request_denied"`
- `query?: string`
- `entityCui?: string`
- `updatedAtFrom?: string`
- `updatedAtTo?: string`
- `latestResponseAtFrom?: string`
- `latestResponseAtTo?: string`
- `selectedThreadId?: string`
- `cursor?: string`
- `pageIndex?: number`
- `limit: number`

There is intentionally no sort field in route search because the server list is
fixed to `updatedAt desc`.

Normalization helpers to add:

- `normalizeCampaignAdminInstitutionThreadsSearch`
- `getCampaignAdminInstitutionThreadsFilters`
- `createCampaignAdminInstitutionThreadsPaginationSignature`
- `createEmptyCampaignAdminInstitutionThreadsSearch`

Default behavior:

- default `stateGroup` to `open`
- default `limit` to `DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT`
- preserve explicit `threadState` when it is compatible with `stateGroup`
- trim string inputs
- parse `limit`, `cursor`, and `pageIndex` like the existing admin search
  helpers
- preserve `selectedThreadId` as route UI state without sending it to the API

Date filter behavior:

- use the existing date-input helper pattern from the admin feature
- treat toolbar date inputs as day-range filters
- convert visible date input values into UTC ISO range boundaries via the
  existing `toUtcRangeBoundary` helper

Contradiction handling:

- reject contradictory filter combinations before firing a request
- minimum blocked combinations:
  - `stateGroup=closed` with `threadState=started`
  - `stateGroup=closed` with `threadState=pending`
  - `stateGroup=open` with `threadState=resolved`
- the page should surface an inline `Alert` for invalid combinations and set
  the list query to `enabled: false`
- the toolbar should also constrain thread-state options based on the selected
  `stateGroup` so contradictory URLs are harder to produce interactively

Pagination behavior:

- mirror the existing entities and notifications pages
- when any non-pagination filter changes, clear stale `cursor` and `pageIndex`
- treat `selectedThreadId` like `reviewSelectionKey` in the user-interactions
  route: it must not affect filter equality or pagination reset rules
- use `CampaignAdminCursorPager`
- maintain a local `previousCursors` stack in the page component

### 5. API client behavior

Implement the transport in
`src/features/campaigns/buget/admin/api/campaign-admin-institution-threads.ts`.

Mirror the existing admin API pattern:

- reuse `getApiBaseUrl`
- reuse `getAuthToken`
- reuse `API_FETCH_REFERRER_POLICY`
- reuse `CampaignAdminApiError`
- reuse JSON envelope parsing and fallback error handling patterns
- parse success payloads through Zod helpers from `api-schemas.ts`

Exports:

- `listCampaignAdminInstitutionThreads`
- `getCampaignAdminInstitutionThreadDetail`
- `appendCampaignAdminInstitutionThreadResponse`

List serialization rules:

- include only supported server params
- serialize `stateGroup`, `threadState`, `responseStatus`, `query`,
  `entityCui`, date filters, `cursor`, and `limit`
- do not send unsupported sort fields
- never send `selectedThreadId`

Detail rules:

- fetch by `threadId`
- no client-side rewriting of the DTO

Append-response rules:

- `POST` JSON body with:
  - `expectedUpdatedAt`
  - `responseDate`
  - `messageContent`
  - `responseStatus`
- include `Content-Type: application/json`
- map error envelopes into `CampaignAdminApiError`

### 6. Hooks and query keys

Implement
`src/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads.ts`.

Add a dedicated query-key subtree, for example:

- `campaignAdminInstitutionThreadsKeys.all`
- `campaignAdminInstitutionThreadsKeys.allForCampaign(campaignKey)`
- `campaignAdminInstitutionThreadsKeys.threadsForCampaign(campaignKey)`
- `campaignAdminInstitutionThreadsKeys.list(campaignKey, filters, cursor, limit)`
- `campaignAdminInstitutionThreadsKeys.detail(campaignKey, threadId)`

Add query helpers and hooks:

- list query options + hook
- detail query options + hook
- append-response mutation hook

Hook behavior:

- list/detail use `staleTime: 15_000`
- list refetches on window focus
- detail can refetch on window focus
- hooks accept `enabled?: boolean`

Mutation behavior:

- on success invalidate:
  - institution-thread list queries for the campaign
  - the specific detail query for the thread
- keep auth gating at the page level with:
  - `enabled: isLoaded && isSignedIn`

### 7. List page behavior

`CampaignAdminInstitutionThreadsPage` should mirror the structure and behavior
of the existing admin list pages.

Page requirements:

- use `AdminCampaignLayout`
- include breadcrumb header back to the campaign hub
- include sign-in required, loading, 403/404, generic error, and empty states
- keep one table view only
- keep all strings translated with Lingui `t`

Toolbar requirements:

- mirror the entities-toolbar pattern with a local draft state plus
  `Apply`, `Reset`, and `Refresh`
- include filters for:
  - query
  - state group
  - thread state
  - response status
  - entity CUI
  - updated-at range
  - latest-response-at range
  - page limit

Table requirements:

- reuse existing admin table/card patterns
- recommended columns:
  - entity
  - institution email
  - subject
  - thread state
  - current response status
  - latest response at
  - updated at
  - response event count
  - actions
- use `Badge` for `threadState` and `currentResponseStatus`
- rows represent threads, not entities; `entityCui` and any entity-name field
  are context columns on the thread row
- provide two row actions:
  - open quick-action sheet
  - open full detail page
- use `Link` for the detail action and pass search objects, not string-built
  URLs
- render nullable fields with the existing admin “Unavailable” style

Sorting requirements:

- no client sort controls in v1
- table headers are not sortable because the API has a single fixed order

Quick-action sheet requirements:

- opening a row writes `selectedThreadId` into route search, similar to the
  existing `reviewSelectionKey` sidebar pattern
- closing the sheet clears `selectedThreadId` while preserving the rest of the
  list search state
- the sheet fetches thread detail by `selectedThreadId`; it must not rely only
  on list-row data for writes
- the sheet shows:
  - thread summary
  - latest response events preview
  - compact correspondence preview
  - append-response action when the thread is not resolved
  - link to the full detail page
- the sheet is a fast operator workflow and must remain smaller than the full
  detail page; it should not duplicate the entire detail timeline UI
- the sheet should preview only a recent subset of response events and
  correspondence items; the full timeline remains on the detail page
- navigating from the sheet to the full detail route must not add
  `selectedThreadId` to the detail route; browser back should still restore the
  prior list-route state, including the open sheet when that was the previous
  history entry

### 8. Detail page and append-response workflow

`CampaignAdminInstitutionThreadDetailPage` is the authoritative drilldown
surface for one thread.

Detail-page requirements:

- use `AdminCampaignLayout`
- include breadcrumb navigation back to the institution-threads list
- show a summary section for the top-level thread DTO
- show response events and correspondence as separate sections

Response events section:

- render the server-provided response events in append order
- show:
  - response date
  - response status
  - actor user id
  - created at
  - message content

Correspondence section:

- render each correspondence entry as a safe plain-text record
- show:
  - direction
  - source
  - from address
  - subject
  - occurred at
  - `textBody`
  - attachment metadata list
- do not render HTML
- do not use `dangerouslySetInnerHTML`
- do not auto-linkify untrusted text
- use plain text nodes with `whitespace-pre-wrap` / `break-words` styling so
  untrusted text is visible without becoming executable markup
- attachment rows show metadata only because the API does not expose a download
  URL

Append-response workflow:

- available only when `threadState !== "resolved"`
- supported from both:
  - the list-side quick-action sheet
  - the detail page
- the operator action must be framed as `record institution response`, not as
  arbitrary phase editing
- form fields:
  - `responseDate`
  - `responseStatus`
  - `messageContent`
- `responseDate` should use a local date-time input and be converted to ISO for
  the request payload
- `messageContent` must be trimmed before submit
- the mutation payload must always use the current detail row’s
  `expectedUpdatedAt = detail.updatedAt`
- the allowed choices are the server response statuses only:
  - `registration_number_received`
  - `request_confirmed`
  - `request_denied`
- the resulting `threadState` is always rendered from the server response; the
  client must not compute or patch phase transitions locally

Success behavior:

- close the dialog when submit originated from the detail page
- keep the sheet open when submit originated from the quick-action sheet unless
  the operator explicitly closes it
- show a success toast
- invalidate the list and detail queries
- render the fresh detail with the new response event and derived thread state

Conflict/error behavior:

- if the server returns `409`, keep the operator on the current surface
- surface the server error message in a destructive alert or toast
- refetch or invalidate detail immediately so the page reflects the latest
  authoritative thread state
- if the thread is now resolved, hide or disable the append-response action

### 9. Hub page integration

Update `src/features/campaigns/buget/admin/components/CampaignAdminHubPage.tsx`
to add a new institution-threads card that matches the existing hub-card style.

The card should:

- link to `/admin/campaigns/$campaignKey/institution-threads`
- use a default search of:
  - `stateGroup: "open"`
  - `limit: 50`
- use copy that describes the workflow:
  - review started, pending, and resolved institution threads
  - inspect correspondence
  - append manual admin responses

Because the server intentionally does not provide an institution-thread meta
endpoint, the hub card should use descriptive summary text in v1 rather than
adding a second background query purely for hub counts.

### 10. Test plan

Add or extend tests in these files:

- `src/features/campaigns/buget/admin/api/campaign-admin-institution-threads.test.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads.test.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsPage.test.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailPage.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.lazy.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.lazy.test.tsx`
- extend `src/features/campaigns/buget/admin/schemas/search-schema.test.ts`
- extend `src/features/campaigns/buget/admin/schemas/api-schemas.test.ts`
- extend `src/features/campaigns/buget/admin/components/CampaignAdminHubPage.test.tsx`

Required API test coverage:

- list request URL and query serialization
- detail request URL
- append-response request body
- auth header behavior
- error envelope parsing

Required hook test coverage:

- list query success
- detail query success
- append-response mutation invalidates list and detail queries

Required route test coverage:

- list route `validateSearch` and `head`
- lazy list-route search/navigate wiring
- parent-route `Outlet` behavior for nested detail rendering
- detail route `head`
- detail lazy-route param wiring

Required page/component coverage:

- sign-in required state
- empty list state
- successful list rendering
- filter/search interaction
- sheet open/close route-search interaction
- sheet detail fetch and compact preview rendering
- append-response happy path
- append-response conflict handling
- append-response disabled for resolved threads in sheet and detail
- response events render correctly
- correspondence text renders safely as plain text in sheet and detail

Hub-page coverage:

- institution-threads card renders
- institution-threads card links to the correct route and default search

## Alternatives Considered

### Add separate list pages for started and unresolved threads

Rejected because product explicitly wants one list with filters, not competing
pages.

### Put append-response only on the full detail page

Rejected because the write requires thread-level context, current
`updatedAt` concurrency state, and visible response/correspondence history.
The list-side sheet provides enough focused context for a quick operator
workflow while the full detail page remains available for deep inspection.

### Add a dedicated institution-thread meta endpoint to support hub counts

Rejected for v1 because the server intentionally does not expose one and the
client should not assume a parallel contract that does not exist.

## Consequences

**Positive**

- institution threads become a first-class campaign-admin workflow
- the implementation stays inside the existing admin architecture
- list and detail navigation become deep-linkable
- the list-side sheet matches the existing admin operator workflow better than a
  detail-page-only action model
- manual admin responses are recorded through the official append-only route
- correspondence content stays safely rendered as plain text

**Negative**

- the admin feature gains another route slice, query subtree, and test surface
- the hub card cannot rely on a lightweight meta endpoint in v1
- the sheet adds one more route-state concern on the list page

## Non-Goals

- server changes
- HTML correspondence rendering
- recipient-array rendering
- attachment downloads
- alternate list sort controls
- separate institution-thread hub metrics endpoint
- manual outbound email composition
- support for non-`platform_send` threads

## References

- `src/routes/admin/campaigns/$campaignKey/route.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.$entityCui.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.$entityCui.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.lazy.tsx`
- `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-notifications.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-entities.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications.ts`
- `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminNotificationsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminHubPage.tsx`
- `src/features/campaigns/buget/admin/schemas/api-schemas.ts`
- `src/features/campaigns/buget/admin/schemas/search-schema.ts`
- `src/features/campaigns/buget/admin/components/AdminCampaignLayout.tsx`
- `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604160837-campaign-admin-institution-threads-api.md`
