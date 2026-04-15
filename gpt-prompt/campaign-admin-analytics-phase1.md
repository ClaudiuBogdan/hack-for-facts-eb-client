Campaign Admin Analytics Phase 1 - Implementation Prompt

Goal
- Implement the first client-facing analytics surface for campaign admin using
  the existing server phase-1 stats overview contract.
- The client route should be `/admin/campaigns/$campaignKey/analytics`.
- The backend route remains
  `GET /api/v1/admin/campaigns/:campaignKey/stats/overview`.

Primary UX decision
- Use a hybrid model:
  - dedicated analytics page as the primary home
  - hub page as discovery and compact preview
  - no broad analytics retrofit across all operational pages in phase 1
- Keep existing pages like interactions, users, entities, user detail, entity
  detail, and notifications operational-first.
- If one module-level embed is needed in phase 1, notifications is the only
  acceptable candidate.

Server references
- [server analytics spec](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/specs-202604151141-campaign-admin-marketing-stats-layer.md>)
- [server phase-1 implementation plan](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/docs/specs/implementation-plan-campaign-admin-stats-overview-phase1.md>)
- [server stats types](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/core/types.ts>)
- [server stats schemas](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/shell/rest/schemas.ts>)
- [server stats route](</Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-server/src/modules/campaign-admin-stats/shell/rest/routes.ts>)

Client references
- [client admin route shell](../src/routes/admin/campaigns/$campaignKey/route.tsx)
- [client hub route](../src/routes/admin/campaigns/$campaignKey/index.lazy.tsx)
- [CampaignAdminHubPage](../src/features/campaigns/buget/admin/components/CampaignAdminHubPage.tsx)
- [CampaignAdminUserInteractionsPage](../src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx)
- [CampaignAdminUsersSectionPage](../src/features/campaigns/buget/admin/components/CampaignAdminUsersSectionPage.tsx)
- [CampaignAdminUserPage](../src/features/campaigns/buget/admin/components/CampaignAdminUserPage.tsx)
- [CampaignAdminEntitiesPage](../src/features/campaigns/buget/admin/components/CampaignAdminEntitiesPage.tsx)
- [CampaignAdminEntityDetailPage](../src/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage.tsx)
- [CampaignAdminNotificationsPage](../src/features/campaigns/buget/admin/components/CampaignAdminNotificationsPage.tsx)
- [client admin types](../src/features/campaigns/buget/admin/types.ts)
- [client admin api schemas](../src/features/campaigns/buget/admin/schemas/api-schemas.ts)
- [client users hook pattern](../src/features/campaigns/buget/admin/hooks/use-campaign-admin-users.ts)
- [client notifications hook pattern](../src/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications.ts)

Scope
- Add a dedicated client route:
  - `src/routes/admin/campaigns/$campaignKey/analytics.tsx`
  - `src/routes/admin/campaigns/$campaignKey/analytics.lazy.tsx`
- Add a dedicated analytics page:
  - `src/features/campaigns/buget/admin/components/CampaignAdminAnalyticsPage.tsx`
- Add reusable stats primitives:
  - `CampaignAdminStatsOverviewPanel.tsx`
  - `CampaignAdminStatsMetricCard.tsx`
- Add a new data slice:
  - `api/campaign-admin-stats.ts`
  - `hooks/use-campaign-admin-stats.ts`
- Extend:
  - `types.ts`
  - `schemas/api-schemas.ts`
- Add a prominent analytics entry on `CampaignAdminHubPage.tsx`

Required subagent workflow
- Use subagents for this work.
- Use only `gpt-5.4` with `xhigh` reasoning for every subagent.
- Split the work into four explicit passes:

1. Implementation pass
- Spawn an implementation subagent first.
- It should own the actual code changes for:
  - route files
  - page components
  - stats API client
  - stats hook
  - stats types and schemas
  - hub integration
  - tests
- Keep ownership clear and avoid broad refactors outside the scoped files.

2. Review pass
- After implementation, spawn a separate review subagent.
- It must review the implementation against:
  - this prompt
  - the client spec
  - the server stats contract
- It must produce findings first, ordered by severity.
- Do not let the implementation subagent review its own work.

3. Testing pass
- After review, spawn a separate testing subagent.
- It must run the targeted client commands and summarize:
  - what passed
  - what failed
  - what remains unverified
- It must specifically verify route wiring, strict schema parsing, privacy-safe
  rendering, and hub integration.

4. Final check pass
- After any fixes, spawn a final-check subagent.
- It must do one last pass on:
  - phase-1 scope discipline
  - privacy boundary
  - route structure
  - i18n readiness
  - test coverage adequacy
- It must report residual risks separately from confirmed findings.

Subagent integration rules
- Integrate review findings before the final check.
- If review or testing finds problems, fix them before closing the task.
- The final response for the implementation task must include:
  - files changed
  - tests run
  - findings found and fixed
  - residual risks or follow-ups

Do not do in phase 1
- Do not add retention, time-spent, discovery, CTA, or client-telemetry metrics
- Do not invent client-side rates or derived ratios beyond what the server
  already returns
- Do not reuse operational admin parsers for the stats route
- Do not add large analytics sections to users, entities, interactions, or user
  detail pages
- Do not expose raw email, raw payload, raw clicked URL, or correspondence
  content
- Do not refactor all admin summary cards into a shared analytics system

Route and naming rules
- Client route name should be `analytics`, not `stats`
- Data-layer naming can remain `campaign-admin-stats` to match the backend
- Keep the page inside the existing campaign-admin shell
- Follow the current route validation pattern for the `funky` campaign key

Data contract rules
- Treat the server response schema as the source of truth
- Match the exact stats overview sections:
  - `coverage`
  - `users`
  - `interactions`
  - `entities`
  - `notifications`
- Keep the client parser strict
- Reject unexpected extra fields
- Keep integer-only count semantics

Privacy rules
- Never render or store:
  - email addresses
  - institution emails
  - contact emails
  - document URLs
  - sender names
  - message subjects
  - html or text email content
  - raw clicked URLs
  - raw payload summaries
  - payload summaries copied from operational endpoints
- analytics parsers must never import or reuse operational payload-summary or
  notification-projection schemas
- `coverage.hasClientTelemetry` and `coverage.hasNotificationAttribution` are
  capability flags, not counts
- Show “not available yet” copy where appropriate instead of pretending missing
  telemetry equals zero

Implementation shape
- Add a new API client similar to `campaign-admin-users.ts`
- Add a new React Query hook similar to `use-campaign-admin-users.ts` and
  `use-campaign-admin-notifications.ts`
- Use a query key like:
  - `["campaign-admin", campaignKey, "stats", "overview"]`
- Use:
  - `staleTime: 60000`
  - `refetchOnWindowFocus: false`
  - `retry: false`
- Build one canonical overview panel that renders all five sections
- Reuse that panel:
  - on the analytics page
  - in a compact form on the hub

Hub behavior
- Add a featured analytics card or summary block to the hub
- It should:
  - link to `/admin/campaigns/$campaignKey/analytics`
  - preview a few top-level counts
  - sit between the current top KPI strip and the existing four-card grid
  - be powered by the new stats overview query
  - not be just another equal operational card in the existing grid

Notifications page
- Optional phase-1 enhancement only:
  - add a small aggregate strip for delivered/opened/clicked/suppressed counts
  - only above the audit surface
  - do not create a new notifications analytics tab
- If this adds too much surface, skip it and keep analytics page plus hub only

Testing requirements
- Add API tests for the new stats client:
  - 401
  - 403
  - 404
  - invalid JSON
  - invalid schema
- Add schema tests:
  - accepts only the strict overview shape
  - rejects extra fields like `email`, `institutionEmail`, `subject`, `html`,
    `clickedUrl`, `payloadSummary`
  - rejects non-integer count fields
- Add hook tests:
  - query key
  - `staleTime`
  - `refetchOnWindowFocus`
  - `retry: false`
- Add page/component tests:
  - loading
  - signed-out
  - 403
  - 404
  - successful render of all five sections
  - capability-flag messaging when telemetry is unavailable
- Update `CampaignAdminHubPage.test.tsx` to cover the new analytics entry

Route implementation checklist
- Add route files:
  - `src/routes/admin/campaigns/$campaignKey/analytics.tsx`
  - `src/routes/admin/campaigns/$campaignKey/analytics.lazy.tsx`
- Follow the existing admin route pattern:
  - `ssr: false`
  - `headers: createNoStoreHeaders()`
  - canonical `head`
  - `noindex,follow`
  - campaign-key validation like the current admin routes
- Add route tests:
  - `analytics.test.tsx`
  - `analytics.lazy.test.tsx`
- Verify `src/routeTree.gen.ts` is updated, or run `yarn router:generate`

Completion requirements
- Run `yarn typecheck`
- Run the targeted client tests you add or touch
- Keep all user-facing text i18n-ready
- Keep the implementation phase-1 only
