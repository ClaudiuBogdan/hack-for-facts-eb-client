# Primarie Entity Page Implementation Plan

Date: 2026-04-18
Status: Revised after 3 parallel architectural reviews

## 0. What Changed From The Original Draft

This revision changes the original plan in several important ways.

### 0.1 Removed The New Dehydration Model

Changed:

- The original draft proposed returning dehydrated query state inside `EntityPageBootstrap`.

Why:

- The repo already uses router-level SSR/query hydration.
- A second dehydration path would risk silent hydration misses and duplicate fetches.
- The revised plan keeps `setupRouterSsrQueryIntegration` as the only hydration mechanism.

### 0.2 Replaced A Fully Route-Agnostic Resolver With Route Adapters Plus Shared Primitives

Changed:

- The original draft described a mostly route-agnostic request resolver.

Why:

- `/entities/$cui` and `/primarie/$cui` have materially different search schemas, canonicalization rules, and compatibility behavior.
- The revised plan keeps route-specific adapters at the wrapper layer and shares only overlapping SSR-sensitive primitives.

### 0.3 Made Cache-Safe Public SSR A Hard Contract

Changed:

- The original draft mentioned URL-as-truth, but did not turn it into a hard rule.

Why:

- Public SSR must not read persisted client preferences for cacheable HTML.
- The revised plan introduces a strict `publicResolvedSettings` contract derived from URL state only.

### 0.4 Moved Server Canonicalization Ahead Of Fetch, Metadata, And Cache

Changed:

- The original draft did not require redirect-before-fetch / redirect-before-head semantics.

Why:

- SSR on non-canonical URLs would otherwise cache canonicalized content under dirty URLs.
- The revised plan makes server-side canonical redirect decisions a prerequisite for SSR, metadata, and share-image work.

### 0.5 Reordered SSR Ahead Of SEO Cutover

Changed:

- The original draft put metadata and share-image work ahead of `/primarie/$cui` SSR enablement.

Why:

- SEO parity on a still-CSR route is not a real milestone.
- The revised plan enables SSR and canonical server routing before any indexing or metadata cutover.

### 0.6 Made The Bootstrap Data Source Explicit

Changed:

- The original draft assumed a lightweight bootstrap query.

Why:

- The current APIs do not provide one query that cleanly covers routing, report type, SEO inputs, and planning hints.
- The revised plan explicitly starts by reusing the existing entity details query for bootstrap behavior, and only introduces a lighter bootstrap endpoint later if backend support exists.

### 0.7 Added A Route-Policy Matrix And Share-Image Compatibility Strategy

Changed:

- The original draft left canonical ownership and share-image migration too abstract.

Why:

- `/entities/$cui` and `/primarie/$cui` currently emit different robots/canonical behavior.
- Existing embeds already depend on `/entities/$cui/share-image.png`.
- The revised plan adds an explicit transitional route-policy matrix and requires dual-route share-image compatibility during migration.

## 1. Goal

Rebuild `/primarie/$cui` as the new implementation target for entity-page behavior, starting with non-UI concerns:

- SSR
- request resolution
- cache-safe public rendering
- metadata and SEO
- share-image generation
- data-fetch orchestration
- route-state normalization

After the shared non-UI foundation is stable and `/primarie/$cui` uses it successfully, `/entities/$cui` will be reimplemented as a thin wrapper over the same core.

## 2. Locked Architectural Decisions

### 2.1 Public SSR Settings Are URL-Only

For any route using public cache headers:

- fetch settings used by SSR must be derived from URL state only
- persisted client preferences must not influence cacheable SSR output
- if a route ever needs personalized SSR, it must use `no-store`

Locked output contract:

- `publicResolvedSettings`

Contents:

- `normalization`
- `currency`
- `inflationAdjusted`
- `showPeriodGrowth`

Rule:

- no server-side reads of persisted user preferences for cacheable public pages

### 2.2 Canonical Redirects Must Happen Before Fetch, Head, Or Cache

Canonicalization is not a client concern.

For SSR routes:

- canonical redirect decision must happen before data fetching
- canonical redirect decision must happen before metadata generation
- canonical redirect decision must happen before cacheable HTML is produced

### 2.3 Shared Core Plus Route Adapters

Shared code will handle:

- overlapping SSR-sensitive request normalization
- execution context
- query-input construction
- SEO snapshot construction
- query planning

Route adapters will retain:

- their own `validateSearch` schema
- route-specific compatibility rules
- pass-through parameters
- route-specific canonicalization policy
- route-specific layout or shell

### 2.4 No New Dehydration Channel

We will keep the existing router-level SSR/query hydration integration.

The shared bootstrap layer will carry:

- resolved execution context
- exact query-input objects
- SEO snapshot input
- canonical policy outcome

It will not carry a second serialized dehydration payload.

### 2.5 `effectiveReportType` Is Internal Execution State

When `report_type` is absent:

- the system may resolve an internal `effectiveReportType`
- that resolved value must not automatically be written back into canonical URL state

Reason:

- existing URLs must not silently change ownership, cache keys, or metadata semantics just because internal execution resolved a fallback

### 2.6 Initial Bootstrap Reuses Existing Entity Details Behavior

Until a backend bootstrap endpoint exists, the initial bootstrap source will reuse the current entity-details path rather than inventing a speculative lightweight query.

Future optimization is allowed, but not assumed.

### 2.7 Query Planning Must Encode Execution Class

The planner must distinguish:

- `blocking`
- `backgroundPrefetch`
- `clientOnly`

It must also express prerequisites such as:

- `requiresEntityDetails`
- `requiresExecutionLineItems`

### 2.8 Transitional Canonical Ownership Stays Conservative

During the foundation and migration phases:

- `/entities/$cui` remains the indexed canonical owner
- `/primarie/$cui` remains non-canonical until SSR and metadata parity are proven
- existing `/entities/$cui/share-image.png` remains supported

The cutover decision is deferred until parity is validated.

## 3. Transitional Route-Policy Matrix

This matrix is the initial locked migration policy.

| Route | Transitional Robots | Transitional Canonical Owner | Transitional OG / Share Image Owner | Notes |
| --- | --- | --- | --- | --- |
| `/entities/$cui` | `index,follow` | `/entities/$cui` | `/entities/$cui` | Public contract stays stable during foundation |
| `/entities/$cui/share-image.png` | n/a | n/a | active | Must remain supported during migration |
| `/primarie/$cui` | `noindex,follow` until SSR + metadata parity are proven | `/entities/$cui` | `/entities/$cui` until explicit cutover | May adopt shared core before canonical ownership flips |
| future `/primarie/$cui/share-image.png` | n/a | n/a | compatibility endpoint only at first | Must not break old embeds or hard-coded image URLs |

## 4. Migration Scope

### 4.1 Foundation Scope

The shared non-UI core must be broad enough to support the existing entity-page behavior, not just the current `/primarie/$cui` subset.

### 4.2 First Full Destination Scope

The first end-to-end consumer remains `/primarie/$cui`.

However:

- `/entities/$cui` will be used as the contract harness for current SSR, SEO, metadata, and query behavior
- `/primarie/$cui` will not be treated as architectural proof until its SSR and metadata behavior are real, not client-only approximations

### 4.3 Route Coverage Caveat

Current preferred navigation only sends non-county UATs to `/primarie/$cui`.

The shared core must not assume that one public route currently owns all entity types.

## 5. Target Architecture

## 5.1 Shared Primitives Layer

Shared primitives should normalize only overlapping SSR-sensitive inputs.

Proposed responsibilities:

- normalize locale
- normalize period / month / quarter
- normalize main creditor
- normalize normalization mode
- resolve URL-only public settings
- resolve internal execution report type
- build exact query-input objects

Proposed outputs:

- `EntityPageExecutionContext`
- `EntityPagePublicSettings`
- `EntityPageQueryInputs`

## 5.2 Route Adapter Layer

Each route adapter should:

- validate its own search contract
- define param compatibility rules
- preserve route-specific pass-through state
- decide canonical redirect outcome
- translate route state into shared primitives

Examples:

- `/entities/$cui` adapter
- `/primarie/$cui` adapter

## 5.3 Shared Bootstrap Layer

The bootstrap layer should:

- consume the route adapter output
- reuse the existing entity-details path initially
- build enough state for query planning and metadata
- return exact query-input objects, not ad hoc re-derived summaries

Proposed output:

- `EntityPageBootstrap`

Contents:

- canonical route policy result
- normalized execution context
- exact query-input objects
- initial entity summary from the bootstrap data source
- SEO snapshot input

## 5.4 Shared Query Planner Layer

The planner must operate on exact execution context and bootstrap data.

Proposed interface:

- `getEntityPageQueryPlan(context, bootstrap)`

Required output categories:

- `blocking`
- `backgroundPrefetch`
- `clientOnly`

Required prerequisites support:

- entity-details-dependent queries
- execution-line-items-dependent queries
- environment gating for client-only resources like GeoJSON warmups that are not SSR-safe

## 5.5 Shared SEO And Share-Image Layer

A single route-policy-aware snapshot should drive:

- title
- description
- canonical URL
- robots
- hreflang
- Open Graph
- Twitter metadata
- JSON-LD
- share-image rendering

Proposed type:

- `EntityPageSeoSnapshot`

## 6. Migration Inventory Before Cutover

Before any canonical or share-image ownership flip, inventory all route emitters that currently hard-code `/entities`.

Must include:

- route builders
- navigation helpers
- copy/share surfaces
- OG/share-image paths
- footer and in-image URLs
- crawl hints and public machine-readable route listings

Examples to inspect:

- `buildEntityDetailsPath`
- hard-coded `/entities` links
- `public/llms.txt`
- `public/ai/index.json`

## 7. Revised Implementation Phases

### Phase 1. Lock The Public Route Policy Matrix

Deliverables:

- transitional route-policy matrix
- steady-state cutover decision criteria
- explicit ownership rules for canonical URL, robots, hreflang, `og:url`, JSON-LD URL, and share-image URL

Why first:

- the plan cannot safely restructure SEO or wrappers until ownership is explicit

### Phase 2. Extract Shared SSR-Safe Primitives From Current `/entities/$cui`

Deliverables:

- shared URL-only settings resolver
- shared exact query-input builder
- shared internal `effectiveReportType` resolver
- regression tests against current `/entities/$cui` behavior

Why second:

- `/entities/$cui` is the only route that already exercises working SSR, metadata, and preference-sync semantics

### Phase 3. Build Route Adapters And Server Canonical Redirect Contract

Deliverables:

- `/entities/$cui` route adapter
- `/primarie/$cui` route adapter
- canonical redirect decision before fetch/head/cache
- per-param compatibility table classifying params as:
  - `SSR-canonical`
  - `pass-through`
  - `route-specific`

Why third:

- SSR-safe canonical routing must exist before enabling `/primarie/$cui` SSR

### Phase 4. Decide The Bootstrap Data Source Explicitly

Deliverables:

- initial bootstrap reuses existing entity-details behavior
- explicit decision record for whether a future backend bootstrap endpoint is needed

Why fourth:

- query planning and metadata depend on real data-source boundaries

### Phase 5. Define The Query Planner Contract Before Changing Loaders

Deliverables:

- `getEntityPageQueryPlan(context, bootstrap)`
- support for `blocking`, `backgroundPrefetch`, and `clientOnly`
- explicit prerequisites and environment-gating rules

Why fifth:

- the planner must exist before bootstrap and loader behavior can rely on it

### Phase 6. Build The Shared Bootstrap Object Without New Dehydration

Deliverables:

- `EntityPageBootstrap`
- exact query-input objects
- SEO snapshot input
- no second hydration channel

Why sixth:

- this formalizes the non-UI contract without destabilizing existing hydration behavior

### Phase 7. Enable `/primarie/$cui` SSR On The Shared Contract

Deliverables:

- SSR-enabled `/primarie/$cui`
- canonical redirect-before-fetch behavior
- URL-only public settings in SSR
- existing router hydration preserved

Constraint:

- `/primarie/$cui` remains `noindex,follow` until metadata parity is verified

Why seventh:

- SSR must exist before any SEO parity claim is meaningful

### Phase 8. Move `/primarie/$cui` Metadata Onto The Shared SEO Snapshot

Deliverables:

- route-policy-aware metadata generation for `/primarie/$cui`
- canonical, robots, hreflang, OG, Twitter, and JSON-LD driven by shared snapshot

Constraint:

- no canonical ownership flip yet

Why eighth:

- metadata should only move after the route is SSR-capable

### Phase 9. Introduce Shared Share-Image Contract With Dual-Route Compatibility

Deliverables:

- route-aware share-image contract
- continued support for `/entities/$cui/share-image.png`
- optional compatibility endpoint for `/primarie/$cui/share-image.png`
- route-aware rendered footer and route-aware `og:image` ownership

Why ninth:

- old embeds and cached previews must keep working during migration

### Phase 10. Move `/primarie/$cui` Onto The Shared Non-UI Core End-To-End

Deliverables:

- `/primarie/$cui` uses shared request primitives, route adapter, bootstrap, planner, metadata, and share-image contract
- campaign-specific shell remains outside the shared core

Why tenth:

- this validates the destination route under the new architecture after the foundational contracts are already stable

### Phase 11. Reimplement `/entities/$cui` As A Thin Wrapper

Deliverables:

- `/entities/$cui` consumes the same shared non-UI core
- route-specific adapter remains for compatibility
- wrapper keeps canonical ownership until explicit cutover

Why eleventh:

- do this only after the shared core and `/primarie/$cui` integration are stable

### Phase 12. Decide Canonical Ownership Cutover

Deliverables:

- explicit decision whether `/primarie/$cui`, `/entities/$cui`, or a subset-based split owns indexing long term
- redirect strategy
- updated route-policy matrix

Why twelfth:

- cutover should be a decision backed by proven parity, not an early assumption

## 8. Better-Than-Current Decisions

### 8.1 Preserve The Existing Hydration Contract

Instead of inventing a second dehydration path:

- reuse the current router SSR/query hydration integration
- share exact query-input builders between loader and client

### 8.2 Treat Canonicalization As A Server Contract

Instead of client `useEffect` cleanup:

- make canonical redirects server-first and cache-safe

### 8.3 Keep `effectiveReportType` Internal

Instead of writing fallback behavior back into URLs:

- resolve execution defaults internally
- keep canonical URLs based on user-supplied state unless an explicit compatibility policy says otherwise

### 8.4 Use Route Adapters Instead Of Forcing One Search Contract

Instead of flattening `/entities` and `/primarie` into one search schema:

- keep their wrappers honest
- share only the logic that truly overlaps

### 8.5 Make Share Images Route-Policy-Aware

Instead of hard-coding `/entities` forever or flipping abruptly:

- support dual-route compatibility during migration

## 9. Testing Strategy

Add regression tests before UI-heavy migration work for:

- canonical redirect outcomes
- URL-only SSR settings resolution
- exact query-input parity between loader and client
- internal `effectiveReportType` behavior when `report_type` is absent
- metadata generation
- robots/canonical/hreflang policy
- share-image URL ownership and fallback behavior
- planner classification of `blocking`, `backgroundPrefetch`, and `clientOnly`
- preservation of route-specific pass-through params such as `ins*`

## 10. Edge Cases The Implementation Must Explicitly Cover

- requests without `currency` / `inflation_adjusted` when the browser has persisted preferences
- absent `report_type` where the entity default is `DETAILED`
- invalid `month`, `quarter`, `public_map`, analytics JSON, or whitespace in `main_creditor_cui`
- dirty URLs like `period=YEAR&month=03`
- `/primarie/$cui` versus `/primarie/$cui/`
- encoded JSON params and `+` versus `%20` variants
- old social embeds still requesting `/entities/$cui/share-image.png`
- bootstrap null / 404 / partial GraphQL failure on cacheable routes
- client-only map warmups being accidentally executed during SSR
- background prefetch failure or timeout not breaking page render

## 11. Best Initial Implementation Slice

The first implementation slice will be:

- extract a pure shared server-side request and execution-context module from the current `/entities/$cui` loader behavior
- include:
  - URL-only public settings resolution
  - exact query-input construction
  - internal `effectiveReportType` resolution
- lock it down with golden tests against current `/entities/$cui` behavior

Why this comes first:

- it protects the existing public SSR/query contract
- it addresses the highest-risk consensus issues: cache safety, canonical behavior, and query-key stability
- it creates a real foundation for `/primarie/$cui` without prematurely introducing new bootstrap or dehydration abstractions

## 12. Deferred Decisions

These are intentionally deferred until the foundation is implemented and validated:

- whether `/primarie/$cui` becomes the long-term canonical indexed route
- whether canonical ownership remains split by entity type or route subset
- whether a dedicated backend bootstrap endpoint should replace the initial entity-details bootstrap reuse
- whether dual-route share-image support remains permanent or transitional
