# TODO

## Funky Campaign

- Fix main share card and also improve campaign share cards.

- [ ] Bifa email primarie.
- [ ] Add notification transaction to disable all in server.
- [ ] Add a forceSync flag on the interactive element for sensitive data, like send public debate email or terms and conditions.

- [ ] Review path and make sure it is production ready.
- [ ] Update terms and conditions page.
- [ ] Review the user interaction elements:
  - [ ] Send public debate email.
  - [ ] Add calendar start date.
  - [ ] Review the budget link.
- [ ] In the demo or intro video, mention that the user can subscribe to multiple entities.

The main elements that I need to review and test is:

- Add public budget link.
- Add calendar date for public budget.
- Send public debate email.
- Make sure the public debate state updates the user interactive element.
- Review the dynamic interactive elements.
- Add a campaign notification page.
- Add a dedicated page for the forum.
- Add the video links.
- Update the terms and conditions.
- Update the landing page.
- Review Diana's feedback and implement it.

### To-do: User Stories Documentation Plan

- [ ] Create documentation index at `docs/user-stories/README.md`
- [ ] App Shell and Navigation → `docs/user-stories/app-shell-and-navigation.md`
- [ ] Landing Page → `docs/user-stories/landing-page.md`
- [ ] Charts: List → `docs/user-stories/charts-list.md`
- [ ] Charts: Create → `docs/user-stories/charts-create.md`
- [ ] Charts: Detail → `docs/user-stories/charts-detail.md`
- [ ] Entity Details → `docs/user-stories/entity-details.md`
- [ ] Entity Analytics → `docs/user-stories/entity-analytics.md`
- [ ] Map → `docs/user-stories/map.md`
- [ ] Cookies and Policies → `docs/user-stories/cookies-and-policies.md`
- [ ] Global Search and Navigation → `docs/user-stories/global-search-and-navigation.md`
- [ ] Filters System → `docs/user-stories/filters-system.md`
- [ ] Data and Analytics Utilities → `docs/user-stories/data-and-analytics-utilities.md`
- [ ] Storage and Persistence → `docs/user-stories/storage-and-persistence.md`
- [ ] Error Handling and Telemetry → `docs/user-stories/error-and-telemetry.md`
- [ ] Performance and Routing → `docs/user-stories/performance-and-routing.md`
- [ ] Miscellaneous → `docs/user-stories/miscellaneous.md`
- [ ] Deep-links and Python Tools → `docs/user-stories/deeplinks-and-python-tools.md`

- General App Shell and Navigation
  - Document `__root` layout: global providers (`QueryClientProvider`, `ThemeProvider`, `HotkeysProvider`, `SidebarProvider`), `AppSidebar`, `SidebarInset` shell, `Toaster`, `CookieConsentBanner`, `MobileSidebarFab`.
  - Global SEO and analytics: `Seo`, `JsonLd`, `Analytics.pageviewHook`.
  - Floating search: `FloatingEntitySearch` behavior + hotkeys.

- Landing Page (/)
  - Entity quick search flow: `EntitySearchInput`, `QuickEntityAccess`, search UX, keyboard support.
  - Marketing cards navigation: `PageCard` to Charts, Map, Entity Analytics.
  - Title animation behavior and persisted state.

- Charts: List, Create, Detail
  - Charts List (/charts)
    - Loading charts from local storage, searching (text + hashtags), sorting, favorites.
    - Categories management (`ChartCategories`): add, rename, assign, filter.
    - Backup/restore (`ChartsBackupRestore`) and toasts; empty state UX.
  - Create Chart (/charts/new)
    - Auto-create chart id, redirect to detail with config view; analytics capture.
  - Chart Detail (/charts/$chartId)
    - URL state hydrate/validate (`chartUrlStateSchema`), local storage save on enter.
    - Views: overview vs config dialogs (config, series-config, annotation-config).
    - ChartView: renderer, legend, tooltip, title/subtitle, export/share.
    - ChartConfigView: chart options (grid, legend, tooltip, year range, annotations toggles).
    - SeriesConfigView: add/edit series types:
      - Line-items aggregated yearly: filters (entity_cuis, account_category, functional/economic prefixes, entity types, report type).
      - Aggregated series calculation: recursive formula builder, cycle detection, evaluation.
      - Custom series data/value: manual data entry, validation.
      - Static series: dataset picker, fetch/merge data.
    - Filters Detail UIs: account type, prefixes, entity/entity-type selection, flags, year, amount range, funding source.
    - Annotations: list, item menu, edit modes, in-chart rendering.
    - Quick config and share flow; copy/paste chart/annotations; diff view.
    - Aggregated charts: bar/pie/sankey/treemap behaviors, units handling, in-chart year range subtitle.

- Entity Details (/entities/$cui)
  - URL state: `view`, `year`, `trend`, `expenseSearch`, `incomeSearch`, analytics toggles.
  - Header: entity identity, sticky year selector, views switcher with availability rules.
  - Overview view
    - Financial summary (income, expense, balance) cards.
    - Line items: dual-column accordion (expense/income), chapter/function/economic hierarchy, search, highlight, skeletons.
    - Line items analytics: data type toggle, chart type toggle, independent year selector, top categories logic.
  - Reports view: list, metadata, download links.
  - Trends views (expense, income): prefetch of top functional groups, chart rendering, URL search sync.
  - Map view (for UAT/county): map filters bridge, prefetch geojson/heatmap; click to navigate rules.

- Entity Analytics (/entity-analytics)
  - Unified filter panel with view toggle (table vs line-items).
  - Table view
    - Server query with stable keys, sorting, pagination, density, currency formats, column visibility/pinning/sizing/order.
    - CSV export batching and analytics capture.
  - Line-items view
    - Conditional fetch by view, 90% top categories selection to chart functionality handshake.
  - KPIs and charts (if present in layout file scope).
  - State hashing for cache; clear filters UX.

- Map (/map)
  - Map state schema: `mapViewType` UAT/Judet, filters (years, normalization, account category).
  - Data fetching: geojson, heatmap, caching windows; loading states and combined errors.
  - Interactive map: style scaling by percentiles, tooltips, click navigation logic to entity pages.
  - Legend (desktop vs modal on mobile), mobile filter modal, quick nav floater.
  - Table and Chart subviews under map: sorting/pagination, data display parity with map filter.

- Cookies and Policies
  - Cookie Settings (/cookies)
    - Consent model: essential, analytics (PostHog), Sentry enhanced error reporting.
    - Switch interactions, accept all/essential only, save; updated timestamp; linking to policies.
  - Cookie Policy (/cookie-policy)
    - At-a-glance bullets, storage examples, manage preferences links.
  - Privacy Policy (/privacy)
    - Local-first design, data sources, processors, rights, retention, changes.
  - Terms (/terms)
    - Disclaimer, no government affiliation, attribution requirements, limitation of liability.

- Global Search and Navigation
  - FloatingEntitySearch: modal trigger, search, keyboard shortcut; result selection and navigation.
  - Sidebar: structure of navigation, responsive FAB.

- Filters System (shared)
  - Base filter components and patterns: infinite multi-select, loading states, errors, empty states.
  - Entity/type/county/UAT/economic/functional prefixes, budget sector, funding source, flags, amount range, report type, year.
  - Label resolution via lazy-loaded JSON, React Query caches, and local storage caching.

- Data and Analytics Utilities
  - Chart data hooks: merging dynamic/static series, query keys, cancellation, error handling.
  - Calculation utilities: recursive evaluation, alignment by year, units, guardrails.
  - Analytics utils: functional chapter maps, income subchapter maps, lazy load + cache; top group code extraction; processing for charts.
  - SEO utilities: default + entity-specific metadata, JSON-LD on root.

- Storage and Persistence
  - Charts store: localStorage schema, CRUD, categories, favorites, backup/restore.
  - Persisted UI state hooks (density, column settings, animation flags).

- Error Handling and Telemetry
  - Error context provider usage and scope.
  - Analytics events tracking across major flows.
  - Sentry gating by consent; minimal telemetry defaults.

- Performance and Routing
  - Route splitting: lazy UI vs file route for loaders, prefetch strategy alignment with React Query options.
  - Intent preloading with links; caching windows; keep-previous-data semantics where applicable.

- Miscellaneous
  - Test-error route behavior and error boundary expectations.
  - The Python chart generator scripts usage scenarios for deep-linking.

This list is organized so each bullet can become a standalone user story doc describing actors, goals, flows, states, and acceptance criteria.

- Key areas covered: routes/pages, core components, filters, data fetching, caching, persistence, analytics, SEO, accessibility, and UX on desktop/mobile.
- If you want, I can generate the file scaffolds (one per bullet) next.
