# Routing Sidebar I18n Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/routing-sidebar-i18n.json`

## Summary

Sidebar wiring covers 10–11 flat top-level destinations and aligns with generated routes for ONG-uri, Statistici, Alegeri, Achiziții, and Legislație, but prefix-based active matching mis-highlights Map on /maps/*, several major modules remain sidebar-hidden, English catalogs keep Romanian nav labels, and new ONG route metadata is hardcoded/unextracted. Route tests were renamed with TanStack’s leading “-” convention and remain discoverable by Vitest.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/components/sidebar/nav-main.tsx:106 | Map nav item active on /maps/* routes due to naive prefix match | Match on segment boundaries (e.g. pathname === url \|\| pathname.startsWith(url + '/')) or derive active state from TanStack route IDs/match chain instead of string prefix. |
| medium | src/components/sidebar/nav-main.tsx:28 | Major routable modules absent from primary sidebar navigation | Either add gated sidebar entries for ready modules, or document intentional discoverability (deep links, in-feature nav, footer) and add route-level beforeLoad redirects when modules are not meant to be public. |
| medium | src/components/sidebar/nav-main.tsx:78 | Întreprinderi publice nav visibility gated by mock flag but route remains public | Mirror the sidebar gate with a route beforeLoad guard or keep the route registered but show a feature-unavailable shell when mock mode is off. |
| medium | src/components/sidebar/nav-main.tsx:33 | Navigation overload: long flat list without grouping | Introduce SidebarGroup labels (Explore, Datasets, Civic data) or collapse secondary items behind a “More” disclosure; align order with product priority. |
| medium | src/locales/en/messages.po:662 | English locale leaves multiple sidebar labels untranslated (Romanian msgstr equals msgid) | Provide English msgstr (Public procurement, Legislation, Elections, NGOs, Statistics, Public enterprises) and prefer English msgids for new nav strings to avoid mixed-source catalogs. |
| medium | src/routes/ong-uri/index.tsx:18 | Route head metadata hardcoded in Romanian, not i18n-wrapped | Use t`...` macros in head() as done in intreprinderi-publice/index.tsx:16–22, run yarn i18n:extract, and translate in .po files. |
| medium | src/routes/ong-uri.servicii.tsx:21 | ONG servicii route head metadata hardcoded and untranslated | Wrap head strings with t`...`, extract to catalogs, and keep copy consistent with ONG landing page terminology. |
| low | src/locales/ro/messages.po:11002 | Romanian catalog has empty msgstr for some sidebar labels | Fill ro msgstr explicitly (even when equal to msgid) or normalize msgids to English with ro translations for consistency with Lingui workflow. |
| low | src/routes/statistici/index.tsx:4 | Statistici and Alegeri index routes omit localized head metadata | Add head() with t`-wrapped title/description for landing routes newly promoted into sidebar. |
| low | src/routeTree.gen.ts:273 | Inconsistent route layout patterns across new modules | Standardize on folder layout route + index for modules with multiple child routes (statistici/teritorii, alegeri/contest) to share headers, breadcrumbs, and mock banners. |
| low | src/components/sidebar/nav-main.test.tsx:262 | Active-state test coverage gaps for prefix bug and several nav targets | Add regression tests for Map vs /maps/* and for remaining sidebar targets’ subpaths; consider testing match-chain behavior if isActive logic changes. |
| low | src/routes/statistici/-index.lazy.test.tsx:1 | Statistics route test uses bare @testing-library/react instead of project test-utils | Align with @/test/test-utils for consistent provider wrapping if route components later depend on i18n or router context. |
| info | vitest.config.ts:24 | Route test renames to leading “-” remain Vitest-discoverable | Document the “-filename.test.tsx” convention in AGENTS.md/mock-first docs so new route tests are not added without the prefix (which would pollute routeTree.gen.ts). |
| info | src/routeTree.gen.ts:192 | Generated route tree includes all new sidebar targets and siblings consistently | Regenerate after route file changes in CI; keep MainItemUrl union in nav-main.tsx synced with typed Link routes to catch drift at compile time. |

## Detailed Evidence

### high: Map nav item active on /maps/* routes due to naive prefix match

- Location: `src/components/sidebar/nav-main.tsx:106`
- Evidence: isActive uses currentPath.startsWith(url) for non-root URLs; '/maps/editor'.startsWith('/map') is true while routeTree.gen.ts registers /maps/editor, /maps/datasets, etc. separately from /map.
- Recommendation: Match on segment boundaries (e.g. pathname === url || pathname.startsWith(url + '/')) or derive active state from TanStack route IDs/match chain instead of string prefix.
- Residual risk: Other future paths sharing a prefix (e.g. /chart vs /charts if added) could regress unless matching is centralized.

### medium: Major routable modules absent from primary sidebar navigation

- Location: `src/components/sidebar/nav-main.tsx:28`
- Evidence: mainItems lists 10–11 entries; routeTree.gen.ts also exposes /investitii-publice (layout at investitii-publice/route.tsx), /justitie, /parlament/, /primarie/, /companies/, and /maps/* with no corresponding sidebar links.
- Recommendation: Either add gated sidebar entries for ready modules, or document intentional discoverability (deep links, in-feature nav, footer) and add route-level beforeLoad redirects when modules are not meant to be public.
- Residual risk: Users bookmark or land on hidden routes with no way back except browser history; investitii-publice already ships its own header nav but justitie/parlament do not inherit global wayfinding.

### medium: Întreprinderi publice nav visibility gated by mock flag but route remains public

- Location: `src/components/sidebar/nav-main.tsx:78`
- Evidence: Sidebar spreads isPublicEnterpriseMockEnabled() at lines 78–86; routeTree.gen.ts always registers /intreprinderi-publice/ and /intreprinderi-publice/$cui regardless of mock mode.
- Recommendation: Mirror the sidebar gate with a route beforeLoad guard or keep the route registered but show a feature-unavailable shell when mock mode is off.
- Residual risk: Direct URL access exposes a module hidden from nav; API layer may fail opaquely when mock is disabled.

### medium: Navigation overload: long flat list without grouping

- Location: `src/components/sidebar/nav-main.tsx:33`
- Evidence: Single SidebarMenu renders Dashboard, Map, Charts, National Budget, ONG-uri, Entity Analytics, Achiziții publice, Legislație, optional Întreprinderi publice, Alegeri, and Statistici (10–11 items); nav-main.test.tsx:194 expects length 10.
- Recommendation: Introduce SidebarGroup labels (Explore, Datasets, Civic data) or collapse secondary items behind a “More” disclosure; align order with product priority.
- Residual risk: Collapsed sidebar (icon-only) hides labels entirely (nav-main.tsx:139), making 10+ icons hard to distinguish on mobile.

### medium: English locale leaves multiple sidebar labels untranslated (Romanian msgstr equals msgid)

- Location: `src/locales/en/messages.po:662`
- Evidence: Nav-main msgids Achiziții publice, Legislație, Alegeri, ONG-uri, Statistici, Întreprinderi publice have msgstr identical to Romanian msgid in en/messages.po (e.g. lines 662–663, 8323–8324, 1157–1158, 11007–11008, 14605–14606, 7872–7873); only Dashboard/Map/Charts/National Budget/Entity Analytics are English in source.
- Recommendation: Provide English msgstr (Public procurement, Legislation, Elections, NGOs, Statistics, Public enterprises) and prefer English msgids for new nav strings to avoid mixed-source catalogs.
- Residual risk: English UI shows Romanian sidebar labels; inconsistent with footer/product copy that uses Trans for English strings.

### medium: Route head metadata hardcoded in Romanian, not i18n-wrapped

- Location: `src/routes/ong-uri/index.tsx:18`
- Evidence: head() sets title 'ONG-uri si servicii sociale | Transparenta.eu' and Romanian description string literals; strings absent from locales catalogs (grep finds no Servicii sociale ONG / Explorare mock-first entries).
- Recommendation: Use t`...` macros in head() as done in intreprinderi-publice/index.tsx:16–22, run yarn i18n:extract, and translate in .po files.
- Residual risk: English locale users get Romanian document titles/descriptions for ONG landing and related pages.

### medium: ONG servicii route head metadata hardcoded and untranslated

- Location: `src/routes/ong-uri.servicii.tsx:21`
- Evidence: head() title 'Servicii sociale ONG | Transparenta.eu' and description 'Descoperire mock-first...' are plain strings with no Lingui macros or catalog entries.
- Recommendation: Wrap head strings with t`...`, extract to catalogs, and keep copy consistent with ONG landing page terminology.
- Duplicate of: `ong-uri-head-hardcoded`
- Residual risk: Secondary ONG sub-route (/ong-uri/servicii) stays invisible to i18n tooling and SEO localization.

### low: Romanian catalog has empty msgstr for some sidebar labels

- Location: `src/locales/ro/messages.po:11002`
- Evidence: ONG-uri (line 11002–11003), Statistici (14600–14601), Alegeri (1157–1158), Achiziții publice (662–663), Legislație (8318–8319) have msgstr "" while Dashboard/Map/Charts have proper Romanian translations (e.g. Tablou de bord, Hartă, Grafice).
- Recommendation: Fill ro msgstr explicitly (even when equal to msgid) or normalize msgids to English with ro translations for consistency with Lingui workflow.
- Duplicate of: `en-untranslated-nav-labels`
- Residual risk: Fallback to msgid works today but empty entries complicate translation QA and crowdin-style completeness checks.

### low: Statistici and Alegeri index routes omit localized head metadata

- Location: `src/routes/statistici/index.tsx:4`
- Evidence: statistici/index.tsx only validateSearch; alegeri/index.tsx sets SSR/cache headers but no head(); contrast ong-uri/index.tsx and intreprinderi-publice/index.tsx which define meta titles.
- Recommendation: Add head() with t`-wrapped title/description for landing routes newly promoted into sidebar.
- Residual risk: Browser tab titles and social previews stay generic or inherited from root layout for new sidebar modules.

### low: Inconsistent route layout patterns across new modules

- Location: `src/routeTree.gen.ts:273`
- Evidence: StatisticiIndexRoute and AlegeriIndexRoute attach directly to root (lines 273–277, 336–340); OngUriIndexRoute nests under OngUriRoute (294–298); Achizitii/Legislație/Investitii use layout route.tsx shells; Justitie uses dot-file justitie.index.tsx pattern.
- Recommendation: Standardize on folder layout route + index for modules with multiple child routes (statistici/teritorii, alegeri/contest) to share headers, breadcrumbs, and mock banners.
- Residual risk: Generated tree stays valid, but cross-module UX (shared layout chrome, cache headers) remains uneven and harder to maintain.

### low: Active-state test coverage gaps for prefix bug and several nav targets

- Location: `src/components/sidebar/nav-main.test.tsx:262`
- Evidence: Tests cover /charts/123, /achizitii/cautare, /alegeri/contest/..., /ong-uri/*, /statistici/teritorii/* but not /maps/* false positive for Map, nor /legislatie/acte/*, /budget-explorer, /entity-analytics subpaths; no assertion that Map is inactive on /maps/editor.
- Recommendation: Add regression tests for Map vs /maps/* and for remaining sidebar targets’ subpaths; consider testing match-chain behavior if isActive logic changes.
- Duplicate of: `map-prefix-active-state`
- Residual risk: Prefix matching regressions or new collisions could ship without CI signal.

### low: Statistics route test uses bare @testing-library/react instead of project test-utils

- Location: `src/routes/statistici/-index.lazy.test.tsx:1`
- Evidence: File imports render from @testing-library/react (line 1) while peer route tests (ong-uri/-index.lazy.test.tsx, alegeri/-index.lazy.test.tsx) use @/test/test-utils with Lingui/router providers.
- Recommendation: Align with @/test/test-utils for consistent provider wrapping if route components later depend on i18n or router context.
- Residual risk: Low today because the test mocks the page component, but future loader/context assertions may fail or miss locale regressions.

### info: Route test renames to leading “-” remain Vitest-discoverable

- Location: `vitest.config.ts:24`
- Evidence: include pattern src/**/*.{test,spec}.{ts,tsx} matches 43 route tests such as alegeri/-index.test.tsx, -justitie.index.test.tsx, statistici/-index.lazy.test.tsx; no non-prefixed *.test.* files remain under src/routes/.
- Recommendation: Document the “-filename.test.tsx” convention in AGENTS.md/mock-first docs so new route tests are not added without the prefix (which would pollute routeTree.gen.ts).
- Residual risk: A future contributor adding routes/foo.test.tsx without “-” would be picked up by TanStack as a route file and break generation until renamed.

### info: Generated route tree includes all new sidebar targets and siblings consistently

- Location: `src/routeTree.gen.ts:192`
- Evidence: OngUriRoute (192–196), StatisticiIndexRoute (273–278), AlegeriIndexRoute (336–340), InvestitiiPubliceRouteRoute (248+), JustitieRoute (202+) are imported and wired; typed path map lists /ong-uri/, /statistici/, /alegeri/, /achizitii/, /legislatie/ alongside hidden paths.
- Recommendation: Regenerate after route file changes in CI; keep MainItemUrl union in nav-main.tsx synced with typed Link routes to catch drift at compile time.
- Residual risk: Manual edits to routeTree.gen.ts or stale generated output would desync typed navigation until next dev build.

