# Public Companies / State-Owned Enterprises — UX Design Summary

- Source UX document: `docs/ux-research/public-companies.md`
- Shared foundation: `docs/design/README.md` (obeyed throughout)
- Domain slug: `public-companies`
- Output folder: `docs/design/public-companies`

## Labeling note

- **Fact:** Source counts, lane status, and constraints below are taken from
  `docs/ux-research/public-companies.md`.
- **Decision:** This bridge document preserves the UX scope but normalizes it
  into the shared design handoff format from `docs/design/README.md`.
- **Assumption:** Any implementation field names not present in the UX source are
  deferred to the feature specs and must stay adapter-local.

## Product intent

Turn the AMEPIP / OUG 109/2011 state-owned-enterprise dataset (already live and
lineage-complete on the scraper side) into a dedicated, plain-language product
surface at `/intreprinderi-publice`. A citizen, journalist, or analyst should be
able to find a state-owned enterprise (întreprindere publică, ÎP), understand
what it is, see who controls it, read its headline performance over time, and
verify every number against the official AMEPIP source — without ever reading a
43-KPI spreadsheet. The domain's defining strength is traceability: every serving
fact chains back to a retrievable workbook snapshot (SHA-256 + source URL +
accepted-at), so the UX must make that lineage visible, not hide it.

## User roles and top jobs

- **Casual public user** (Fact, §3) — Citizens, students, engaged voters. Top
  jobs: "What is this SOE?", "Who is responsible for it?", "Is it doing well?".
  Needs plain language, one-screen summaries, no financial training assumed.
- **Journalist / analyst / NGO / watchdog** (Fact, §3) — Highest-value recurring
  users, most demanding on provenance. Top jobs: filter and rank the SOE
  universe, track indicators over time, compare peers, cite exact source
  evidence, export.
- **Domain expert (public admin / finance / BVB watcher)** (Fact, §3) — Top jobs:
  exact `kpi_code` + `measure_unit` depth, authority portfolios, state-aid
  schemes, sanctions under specific OUG 109 articles, BVB filings, programmatic
  access.

## MVP scope (ships on the live AMEPIP core lane)

1. **Landing page** `/intreprinderi-publice` — explainer, headline stats, search
   entry, freshness/coverage ribbon. (`public-enterprises-landing.md`)
2. **Enterprise Profile** `/intreprinderi-publice/$cui` — identity, controlling
   authority slot, "performance at a glance", source lineage banner, tabs that
   degrade when a lane is gated. The MVP anchor. (`enterprise-profile.md`)
3. **KPI Time Series tab** — indicator picker over the 43-KPI dictionary,
   multi-year chart + year×indicator table, all four `value_kind` variants.
   (`kpi-time-series-tab.md`)
4. **Enterprise listing** `/intreprinderi-publice` (query state) — faceted,
   sortable, paginated SOE list. (`enterprise-listing.md`)
5. **Source lineage / "verify this"** — cross-cutting provenance components on
   every fact block. (`source-lineage-verify.md`)

## High-value next scope (built but deploy-gated; design to degrade)

- **Controlling Authority / Ownership tab** (S1001 + `json_apt`) —
  (`controlling-authority-tab.md`)
- **BVB Market & Reports tab** (19 listed SOEs) — (`bvb-market-reports-tab.md`)
- **State Aid tab** (RegAS) — (`state-aid-tab.md`)
- **Sanctions / Enforcement tab** (AMEPIP HTML tables) —
  (`sanctions-enforcement-tab.md`)
- **Governance Document Viewer** (URL index today, PDFs later) —
  (`governance-document-viewer.md`)

Out of scope for these docs (named for traceability, designed elsewhere/later):
comparison page `/intreprinderi-publice/comparare`, analytics dashboard
`/intreprinderi-publice/analiza`, map views, snapshot diff, money-flow Sankey,
ownership graph, MCP tools (UX §14). The IA below reserves their routes.

## Source / data constraints (Fact unless noted)

- **AMEPIP core lane is LIVE and validated** (Fact, §1/§5): `213,680` indicator
  values, `6,886` enterprise-year rows, `1,342` distinct CUIs, `43` KPI
  dictionary entries, `4,044` form groups, `2,494` company links. Current
  snapshot `amepip-core-3a44f2c099fb711c`, CC-BY-4.0, weekly hash-poll.
- **Five supplemental lanes are built but deploy-gated** (Fact, §1): controlling
  authority, RegAS state aid, BVB market, sanctions/enforcement, governance docs.
  Not promoted to prod serving as of the 2026-06-25 hardening runbook (PC-3
  deploy blocker). UI must treat each as "available soon after deploy unblock".
- **No downstream surface exists today** (Fact, §1): no server module, GraphQL
  slice, MCP tool, or client route. Global search currently routes
  `public_enterprise` hits to the budget-centric `/entities/$cui` — the wrong
  page (Fact, §15). This domain is a greenfield build on mature data.
- **Indicators are ratios/KPIs, never absolutes** (Fact, §6/§15) — the single
  biggest correctness risk. "Cota de piață" = `0.0425` is a share, not a balance
  value. Every indicator must carry `measure_unit` and a ratio/KPI label; link to
  `companies.financials` (ANAF) for absolute balance-sheet figures.
- **Mixed `value_kind`** (Fact, §6): `number | boolean | text | empty`. All four
  must render without breaking charts or tables.
- **Nullable `kpi_code` and `ticker_symbol`** (Fact, §6): filters/badges must
  never show "null".
- **S1001 universe (~1,773) is broader than AMEPIP (1,342)** (Fact, §6): includes
  inactive/insolvent firms. UI must distinguish "in the current AMEPIP workbook"
  from "in the official S1001 list only".
- **`company_links.link_status`** can be `matched | missing | ambiguous |
  not_checked` (Fact, §5): AMEPIP identity is evidence, not canonical ONRC truth.
- **Listed-but-not-SOE trap** (Fact, §15): SNP (OMV Petrom), EL (Electrica), FP
  (Fondul Proprietatea) are liquid BVB symbols but NOT AMEPIP enterprises. The UI
  must never imply they are SOEs.
- **Governance PDFs are URL-index only** (Fact, §5): ~2,459 `media_apt` URLs
  exist; the binaries are not downloaded/parsed yet.

## Privacy / provenance constraints (Fact)

- **Sanctions `responsible` person/role is privacy-gated, raw-only** (Fact, §6) —
  must never appear in serving UI. Only sanction text, date, legal basis, source.
- **Link, never merge** (Fact, §7): AMEPIP facts stay AMEPIP-labelled; ONRC/ANAF
  facts stay companies-labelled. No merged "official truth" block. All
  cross-registry relations are CUI-based link evidence with visible `link_status`.
- **Lineage on every fact** (Decision, README + §5): source name, snapshot id,
  workbook/accepted date, official URL, "verifică ↗".

## Design implications

- One profile, tabbed; tabs are data-availability-driven. Live lanes render;
  gated lanes show a labelled "în curând / nu este încă live" state, never an
  empty error.
- Reuse the `private-companies` feature architecture wholesale (route loader +
  Zod search schema + tab-config + mock/live API switch + source footer). It is
  the closest shipped analog.
- Provenance is a first-class, reusable surface (`SourceLineageBadge` +
  `SourceProvenanceDrawer`), not a footnote.
- Ratio/KPI labelling and the plain-language indicator glossary are correctness
  features, not polish.
- Degradation is a designed product state with explicit copy, per lane.

## Blockers only

None block MVP. The MVP ships entirely on the live AMEPIP core lane. The
deploy-gated lanes (UX Open Q2) and headline-KPI key confirmation (UX Open Q4)
are handled by graceful degradation and a configurable KPI list, not by holding
the build. See each feature file's "Open questions" for the one true blocker per
gated lane (the prod serving contract / API shape).
