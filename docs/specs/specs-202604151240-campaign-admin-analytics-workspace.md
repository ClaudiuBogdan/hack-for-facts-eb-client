# Campaign Admin Analytics Workspace

**Status**: Draft
**Date**: 2026-04-15
**Author**: Codex

## Problem

The server now exposes a dedicated phase-1 campaign-admin stats overview, but
the client admin workspace has no stable place to present cross-cutting
campaign analytics.

Today the client admin surface is split into operational pages:

- hub
- interactions queue
- users list
- user page
- entities list
- entity detail
- notifications

Those pages are optimized for review, audit, and drilldown work. They are not a
good primary home for aggregate analytics.

Without a dedicated client analytics surface:

- the new server stats contract is hard to discover
- analytics risks being buried inside an operational page
- multiple pages may duplicate the same counts inconsistently
- marketing and analytics users do not get one stable campaign-level reporting
  destination

## Context

### Existing client admin structure

The current client route tree already has a clear campaign-admin shell:

- `src/routes/admin/campaigns/$campaignKey/route.tsx`
- `src/routes/admin/campaigns/$campaignKey/index.tsx`
- `src/routes/admin/campaigns/$campaignKey/user-interactions.tsx`
- `src/routes/admin/campaigns/$campaignKey/users.tsx`
- `src/routes/admin/campaigns/$campaignKey/users.$userId.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.tsx`
- `src/routes/admin/campaigns/$campaignKey/entities.$entityCui.tsx`
- `src/routes/admin/campaigns/$campaignKey/notifications.tsx`

The current page components are:

- `CampaignAdminHubPage`
- `CampaignAdminUserInteractionsPage`
- `CampaignAdminUsersSectionPage`
- `CampaignAdminUserPage`
- `CampaignAdminEntitiesPage`
- `CampaignAdminEntityDetailPage`
- `CampaignAdminNotificationsPage`

The hub page already acts as the entry point and lightweight summary surface for
the admin workspace.

### Existing client architecture patterns

- typed REST client per admin slice under
  `src/features/campaigns/buget/admin/api/`
- React Query hook per slice under
  `src/features/campaigns/buget/admin/hooks/`
- strict Zod parsing in
  `src/features/campaigns/buget/admin/schemas/api-schemas.ts`
- feature-local UI components under
  `src/features/campaigns/buget/admin/components/`
- route-local page shells built on `AdminCampaignLayout`

### Existing server contract for phase 1

The new server stats surface is:

- `GET /api/v1/admin/campaigns/:campaignKey/stats/overview`

Authoritative references:

- [campaign-admin-stats core types](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/core/types.ts:1>)
- [campaign-admin-stats response schemas](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/shell/rest/schemas.ts:1>)
- [campaign-admin-stats route](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/shell/rest/routes.ts:1>)
- [server analytics spec](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604151141-campaign-admin-marketing-stats-layer.md:1>)
- [server phase-1 implementation plan](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/implementation-plan-campaign-admin-stats-overview-phase1.md:1>)

Phase-1 server scope is intentionally narrow:

- `funky` only
- current server-side state only
- no client telemetry
- no retention or time-spent metrics
- no raw email or payload content

### Constraints

- The client must match the server overview DTO exactly.
- The client must not reuse operational admin schemas for analytics.
- The client route should be user-facing `analytics`, even though the backend
  path is `/stats/*`.
- Phase 1 should not broaden every existing admin page into a reporting
  dashboard.

## Decision

Implement campaign analytics in the client as a hybrid:

- a dedicated campaign analytics page is the primary home
- the hub page provides discovery and a compact preview
- existing operational pages receive only lightweight contextual stats when they
  materially improve the workflow

### 1. Primary route

Add a dedicated client route:

- `/admin/campaigns/$campaignKey/analytics`

Files:

- `src/routes/admin/campaigns/$campaignKey/analytics.tsx`
- `src/routes/admin/campaigns/$campaignKey/analytics.lazy.tsx`
- `src/features/campaigns/buget/admin/components/CampaignAdminAnalyticsPage.tsx`

Reasoning:

- `analytics` is clearer than `stats` in the admin UI
- it avoids mirroring backend naming too literally
- it gives the campaign a stable reporting destination

### 2. Hub page is discovery, not the full analytics home

Update `CampaignAdminHubPage` to include a prominent analytics card or featured
summary block that:

- advertises the new analytics view
- shows a small subset of the overview metrics
- links to the dedicated analytics page
- sits between the existing top KPI strip and the current four-card operational
  grid
- is powered by the new stats overview query, not by stretching one of the
  existing meta query shapes

Do not make analytics just a fifth equal card in the existing operational card
grid. It is cross-cutting, not another narrow admin bucket.

### 3. Existing operational pages stay operational

Phase-1 page placement rules:

- `CampaignAdminUserInteractionsPage`
  Keep the existing queue summary as the main local summary. Optionally add a
  small analytics deep link or a very small campaign funnel strip later.
- `CampaignAdminUsersSectionPage`
  Do not add inline analytics charts or extra table columns in phase 1.
  Provide only a link to the analytics page if needed.
- `CampaignAdminUserPage`
  Do not add a large analytics section in phase 1. User-scoped analytics should
  wait for server-side user analytics support.
- `CampaignAdminEntitiesPage`
  Keep the current entity summary cards as the operational summary. Do not add a
  second large analytics band in phase 1.
- `CampaignAdminEntityDetailPage`
  This is the first good candidate for future scoped analytics when the server
  exposes entity-scoped stats. Not phase 1.
- `CampaignAdminNotificationsPage`
  This is the only operational page that may benefit from an optional phase-1
  inline stats strip because the new overview adds delivered, opened, clicked,
  and suppressed counts that the page does not currently summarize.

### 4. Data layer shape

Add a dedicated client data slice for stats:

- `src/features/campaigns/buget/admin/api/campaign-admin-stats.ts`
- `src/features/campaigns/buget/admin/hooks/use-campaign-admin-stats.ts`

Add separate stats-specific types and parsers inside:

- `src/features/campaigns/buget/admin/types.ts`
- `src/features/campaigns/buget/admin/schemas/api-schemas.ts`

Rules:

- keep stats types in a clearly separated `CampaignAdminStatsOverview*` section
- use a dedicated React Query key subtree such as:
  `["campaign-admin", campaignKey, "stats", "overview"]`
- use:
  - `staleTime: 60_000`
  - `refetchOnWindowFocus: false`
  - `retry: false`

### 5. Reusable UI strategy

Build one canonical overview renderer for the server overview contract:

- `CampaignAdminStatsOverviewPanel`
- `CampaignAdminStatsMetricCard`
- optional small section shell or coverage-status primitive

Re-use those primitives in exactly two places in phase 1:

- the dedicated analytics page
- the hub preview card or block

Do not refactor all existing summary cards across the admin feature in this
phase.

### 6. Privacy and contract rules

The client must treat the server stats overview as a separate sanitized
contract.

Hard rules:

- do not reuse operational parsers or DTOs for analytics
- do not surface fields such as:
  - `institutionEmail`
  - contact emails
  - document URLs from operational payload summaries
  - sender names
  - email subject, html, or text
  - clicked URLs
  - raw payload summaries
- keep parser schemas strict and reject unexpected fields
- render `coverage.hasClientTelemetry` and
  `coverage.hasNotificationAttribution` as capability flags, not metric values
- do not invent rates, retention, time-spent, discovery, or client-telemetry
  metrics in phase 1

### 7. Future extension path

Phase 2 and later may add contextual stats views to:

- interactions
- notifications
- entities
- entity detail
- users
- user detail

But only when the server has section-specific analytics contracts. The dedicated
analytics page remains the source of truth for aggregate reporting.

## Alternatives Considered

### Put analytics only on the hub

Rejected because the hub is the right discovery surface but too shallow for a
stable campaign reporting destination.

### Put analytics primarily inside Notifications or Interactions

Rejected because those pages are operator workspaces, not cross-campaign
reporting surfaces. Doing this would bury analytics in a page with a narrower
mental model.

### Add inline analytics everywhere immediately

Rejected because it would duplicate metrics, add UI noise to operational pages,
and outpace the current server contract.

### Mirror the backend path as `/stats`

Rejected for the client route because `analytics` is clearer in the admin UI.
The backend can stay `/stats/*`.

## Consequences

**Positive**

- campaign analytics gets a clear, discoverable home
- the hub can advertise analytics without becoming the entire reporting surface
- operational pages stay focused on their primary workflows
- the client implementation lines up cleanly with the new server phase-1 slice
- privacy is easier to enforce because analytics uses its own typed contract

**Negative**

- the admin route tree gains one more page
- some summary metrics will appear twice between the hub preview and analytics
  page
- module-level analytics embedding is deferred rather than delivered
  immediately

## References

- [server analytics spec](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604151141-campaign-admin-marketing-stats-layer.md:1>)
- [server phase-1 implementation plan](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/implementation-plan-campaign-admin-stats-overview-phase1.md:1>)
- [server stats types](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/core/types.ts:1>)
- [server stats schemas](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/shell/rest/schemas.ts:1>)
- [admin route shell](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/routes/admin/campaigns/$campaignKey/route.tsx:1>)
- [hub route](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/routes/admin/campaigns/$campaignKey/index.lazy.tsx:1>)
- [CampaignAdminHubPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminHubPage.tsx:1>)
- [CampaignAdminUserInteractionsPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx:1>)
- [CampaignAdminUsersSectionPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminUsersSectionPage.tsx:1>)
- [CampaignAdminUserPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminUserPage.tsx:1>)
- [CampaignAdminEntitiesPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminEntitiesPage.tsx:1>)
- [CampaignAdminEntityDetailPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage.tsx:1>)
- [CampaignAdminNotificationsPage](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/features/campaigns/buget/admin/components/CampaignAdminNotificationsPage.tsx:1>)
- [client admin review workspace spec](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/docs/specs/specs-202604110930-campaign-admin-review-workspace.md:1>)
- [client admin user page spec](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/docs/specs/specs-202604120859-campaign-admin-user-page.md:1>)
