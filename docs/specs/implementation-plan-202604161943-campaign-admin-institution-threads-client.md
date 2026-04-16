# Implementation Plan: Campaign Admin Institution Threads

**Status**: Draft for review  
**Date**: 2026-04-16  
**Author**: Codex

## Scope And Objectives

### Target scope

Implement a client-side campaign-admin institution-thread workflow in the
existing `buget/admin` architecture using the current server API only.

In scope:

- campaign-admin institution-threads list route
- thread-first table with `entityCui` and related entity context as columns
- filter/search/pagination via route search state
- list-side quick-action sheet for selected thread
- full detail route for one thread
- append-response workflow using the existing POST response-event API
- hub-page card linking into the new route
- client-side tests for API, schemas, hooks, routes, pages, and hub integration

Out of scope:

- server changes
- arbitrary phase mutation
- entity-summary aggregation layer
- attachment download support
- rendering HTML correspondence
- new meta endpoint or new analytics surface for institution threads
- non-`platform_send` thread support

### Objectives

- Keep the implementation thread-first and aligned with the current API.
- Match the existing campaign-admin architecture and navigation patterns.
- Prioritize security, predictability, and low-complexity state management.
- Support a fast admin workflow from the list through a side sheet without
  removing the full detail page.
- Keep all write behavior constrained to the append-response contract.

### Source of truth

- Updated client spec:
  [specs-202604161920-campaign-admin-institution-threads-client.md](/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/docs/specs/specs-202604161920-campaign-admin-institution-threads-client.md:1)
- Server contract:
  [/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604160837-campaign-admin-institution-threads-api.md](/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604160837-campaign-admin-institution-threads-api.md)

## Constraints And Limitations

### Product and API constraints

- The list endpoint is a thread list, not an entity summary.
- `stateGroup=open` maps to `started + pending`.
- `stateGroup=closed` maps to `resolved`.
- The list sort is fixed to `updatedAt desc`.
- The only write operation is appending a manual response event.
- Allowed response statuses are:
  - `registration_number_received`
  - `request_confirmed`
  - `request_denied`
- Resolved threads cannot accept another appended response.
- The client must not invent unsupported phase transitions.

### UI and architecture constraints

- Keep new code under `src/features/campaigns/buget/admin/`.
- Follow the existing route split:
  - non-lazy route file for metadata and search validation
  - lazy route file for params/search/page wiring
- Follow the existing parent-route-with-`Outlet` pattern for nested detail.
- Use TanStack route search objects rather than manual URL strings.
- Preserve the current `buget` namespace spelling.
- Do not edit `routeTree.gen.ts`.

### Operational limitations

- There is no institution-thread meta endpoint for lightweight counts.
- The side sheet must fetch detail for the selected row before enabling writes.
- Attachment metadata is visible, but attachments are not downloadable in v1.

## Security Requirements

### Untrusted content handling

- Treat all `messageContent`, `textBody`, `subject`, and related thread text as
  untrusted plain text.
- Do not use `dangerouslySetInnerHTML`.
- Do not render HTML content from thread data.
- Do not auto-linkify untrusted text.
- Render untrusted content with plain text nodes and safe layout classes such as
  `whitespace-pre-wrap` and `break-words`.

### Auth and permission handling

- Keep auth gating consistent with the existing campaign-admin UI:
  - `useAuth()`
  - query `enabled: isLoaded && isSignedIn`
- Preserve sign-in-required and permission-error states used by other admin
  pages.
- Do not bypass the existing bearer-token API path.

### Concurrency and mutation safety

- Append-response must always use the latest detail payload’s `updatedAt` as
  `expectedUpdatedAt`.
- Never submit from list-row data alone.
- On `409`, immediately refetch or invalidate the detail query and surface the
  server message.
- Disable submit while mutation is pending.
- Hide or disable append-response actions for resolved threads in both the side
  sheet and the detail page.

### Simplicity rules

- Keep one mutation path for append-response.
- Reuse one form component for sheet and detail if practical.
- Render server-derived `threadState` and `currentResponseStatus` directly.
- Do not duplicate full-detail rendering inside the side sheet.

## Implementation Approach

### Phase 1: Types, constants, schemas, and API client

Files:

- `src/features/campaigns/buget/admin/types.ts`
- `src/features/campaigns/buget/admin/constants.ts`
- `src/features/campaigns/buget/admin/schemas/api-schemas.ts`
- `src/features/campaigns/buget/admin/schemas/search-schema.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-institution-threads.ts`

Deliverables:

- thread state / response status value arrays and type definitions
- strict Zod parsers for list, detail, and append-response responses
- search schema with `selectedThreadId` route state
- normalization and filter helpers
- thread API client functions using existing auth and error-envelope patterns

### Phase 2: Hooks and query model

Files:

- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads.ts`

Deliverables:

- list query key and query options
- detail query key and query options
- append-response mutation
- invalidation rules for list + detail on success and conflict-prone failures

### Phase 3: Routes and list-page workflow

Files:

- `src/routes/admin/campaigns/$campaignKey/institution-threads.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.lazy.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.lazy.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsPage.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsToolbar.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsTable.tsx`
- optional side-sheet component

Deliverables:

- list route metadata and search validation
- thread-first table with entity context columns
- filter toolbar with contradiction blocking
- route-backed `selectedThreadId` side-sheet state
- quick-action sheet that fetches detail, shows compact context, allows
  append-response, and links to full detail
- sheet previews only a recent subset of events/correspondence while the full
  timeline stays on the detail page

### Phase 4: Detail page and shared append-response UI

Files:

- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailPage.tsx`
- optional shared append-response form/dialog component

Deliverables:

- detail route and page rendering top-level thread data
- response-events timeline
- correspondence timeline rendered safely as plain text
- append-response form reused by detail and sheet when feasible

### Phase 5: Hub integration and final polish

Files:

- `src/features/campaigns/buget/admin/components/CampaignAdminHubPage.tsx`

Deliverables:

- new institution-threads card
- route link using default search
- consistent copy and admin visual patterns

## Testing Strategy

### Unit tests

Focus:

- schema parsing
- search normalization
- contradiction blocking
- API request serialization
- error-envelope parsing
- helper functions and label mappings

Files:

- `src/features/campaigns/buget/admin/schemas/search-schema.test.ts`
- `src/features/campaigns/buget/admin/schemas/api-schemas.test.ts`
- `src/features/campaigns/buget/admin/api/campaign-admin-institution-threads.test.ts`

Required unit assertions:

- list URL contains the correct query params
- detail URL is correct
- append-response body is correct
- missing auth fails before fetch
- error envelopes map to `CampaignAdminApiError`
- `selectedThreadId` is preserved as route UI state but excluded from API filters
- contradictory filter combinations are recognized and blocked

### Integration tests

Focus:

- React Query hooks
- route wiring
- page behavior with mocked hooks
- sheet state and append-response interactions

Files:

- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.lazy.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.test.tsx`
- `src/routes/admin/campaigns/$campaignKey/institution-threads.$threadId.lazy.test.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsPage.test.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailPage.test.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminHubPage.test.tsx`

Required integration assertions:

- list query success
- detail query success
- append-response invalidates list and detail queries
- list route `validateSearch` and `head`
- detail route `head`
- lazy route search and navigate wiring
- nested detail route renders through `Outlet`
- sheet open/close updates `selectedThreadId`
- closing the sheet preserves list filters
- resolved threads cannot append in sheet or detail
- `409` conflict handling refreshes state and surfaces an error
- correspondence text renders as literal text, including malicious HTML-like
  payloads

### E2E coverage

Target:

- Add one focused Playwright flow if the test harness and fixtures can support
  it without brittle setup.

Preferred scenarios:

- hub -> institution threads -> filter -> open sheet -> append response ->
  observe refreshed state
- navigate from sheet to full detail -> go back -> list search preserved
- resolved thread path shows append-response disabled

If practical E2E coverage is blocked by auth or fixture cost, record that as a
known limitation and keep strong integration coverage instead of forcing a
fragile test.

## Acceptance Criteria

### Functional acceptance

- The campaign-admin hub shows an institution-threads card linking to the new
  route.
- The institution-threads page shows a thread-first table with `entityCui` and
  entity context columns.
- Filters and search work through route search state.
- Contradictory filters are blocked before the request is sent.
- Clicking a row opens a right-side quick-action sheet.
- The sheet fetches thread detail for the selected row.
- The sheet supports append-response for non-resolved threads.
- The sheet links to the full detail page.
- The detail page renders full thread summary, response events, and
  correspondence.
- A successful append-response refreshes both list and detail state.
- Resolved threads cannot accept another append-response from any UI surface.

### Security acceptance

- Thread and correspondence text is rendered as plain text only.
- No HTML from thread content is executed or injected.
- The client uses the authenticated admin API path only.
- The write flow uses optimistic concurrency via `expectedUpdatedAt`.

### UX acceptance

- Closing the sheet returns the admin to the same filtered list state.
- Back/forward navigation behaves predictably with sheet state and detail route.
- Navigating from the sheet to full detail does not carry `selectedThreadId`
  into the detail route, but browser back restores the prior list state.
- Empty, loading, sign-in-required, 403/404, and generic error states match the
  quality of existing campaign-admin pages.

## Definition Of Done

- The updated spec and this implementation plan are reflected in the code.
- All in-scope routes, components, hooks, schemas, and API clients are added.
- All required user-facing strings are wrapped with Lingui `t`.
- New and changed tests are implemented and passing.
- `yarn typecheck` passes with no errors.
- Targeted Vitest commands for the new or changed files pass.
- The implementation review has been completed and all material findings are
  addressed or explicitly documented.
- Remaining limitations and trade-offs are written down before handoff.

## Known Trade-Offs

- The side sheet uses an extra detail fetch to keep writes safe and simple.
- There is no lightweight meta query for hub counts in v1.
- E2E coverage may remain narrower than unit/integration coverage if auth and
  fixture setup is too costly.

## Stop Conditions

Pause before implementation if any of these turn out false:

- the list must remain thread-first
- the side sheet is part of v1
- append-response remains the only write path
- thread content must be displayed as plain text only

If any of those change, the plan and spec need to be updated before coding.
