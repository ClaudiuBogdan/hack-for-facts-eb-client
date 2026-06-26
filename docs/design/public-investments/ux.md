# Public Investments — UX Brief (Investiții Publice)

- Source UX document: `docs/ux-research/public-investments.md`
- Shared foundation: `docs/design/README.md`
- Domain slug: `public-investments` · Route base: `/investitii-publice`

## Product intent

Turn an inert-but-gate-green corpus of **17,642 public investment objectives**
(Anghel Saligny / PNDL / PNCCRS / PNMC) into a navigable, evidence-forward
surface that lets anyone follow public money to the ground: *here is the water
main / school / road in your commune, its contracted vs. reimbursed amount, its
implementation stage, who is building it — and the official source workbook
behind every figure.* The domain's defining promise is **"fiecare cifră are o
dovadă"** (every number has evidence). Trust is the product; the map and the
absorption bar are the hooks.

## User roles and top jobs

- **Fact (UX §3.1) — Casual local resident.** Job: "What is being built in my
  commune, and is it progressing?" Arrives by county/UAT name, map click, or a
  shared link. Needs plain Romanian, an obvious map, one-number-at-a-time
  clarity, and a stage badge they can read at a glance.
- **Fact (UX §3.2) — Journalist / analyst / NGO / watchdog.** Job: filter
  cohorts (low absorption, stalled, repeat contractors), follow a contractor CUI
  out to companies/procurement, quote a per-figure source URL, export CSV.
- **Fact (UX §3.3) — Domain expert / auditor / public administration.** Job:
  program-level cohorts, contract numbers, designer/contractor CUIs, snapshot
  provenance, identity-candidate confidence, and reconcile the published
  projection back to the source workbook row.

## MVP scope (build first, in order)

1. **Objectives map + landing** (`/investitii-publice`) — national map, headline
   KPIs, program chips, search entry, coverage/freshness ribbon, "top stalled"
   teaser. (UX MVP-1.)
2. **Objective detail hub** (`/investitii-publice/obiective/$id`) — the trust
   artifact: header, Alocat/Contractat/Decontat/Absorbție cards, stage badge,
   tabs (Prezentare / Plăți / Contract / Părți / Dovezi), "Vezi dovada" beside
   every amount. (UX MVP-2.)
3. **Objectives search & listing** (`/investitii-publice/cautare`) — map↔list
   sync, filters (program, domain, county, stage, amount/absorption ranges),
   CSV export. (UX MVP-3.)
4. **Evidence viewer** ("Vezi dovada") — per-figure provenance drawer: source
   URL, snapshot date, row key, content hash, raw payload excerpt. (UX MVP-4.)
5. **Locality / county pages** (`/investitii-publice/localitati/$siruta`,
   `/investitii-publice/judete/$countyCode`) — territory-scoped objectives,
   absorption summary, cross-links to `/primarie/$cui` and budget. (UX MVP-5.)

## High-value next scope

- **Payments ledger** per objective (UX N1) — `payment_source_facts`, table +
  cumulative line, rendered as the `Plăți` tab.
- **Contractor / designer directory** (UX N2) — privacy-gated; only reviewed,
  non-gated parties; CUI link-out to companies/procurement.
- **Absorption analytics dashboard** (UX N3) — county choropleth + ranking +
  stalled cohort + program/domain breakdown.
- **Stage timeline** (UX N4) — vertical per-objective stage history; ships
  disabled ("istoric indisponibil momentan") until historical backfill lands.

## Source / data constraints (all Fact unless noted)

- **Fact:** Only `project_objectives_current` + per-snapshot
  `*_source_facts` + `source_evidence` are serving. No backend module, no client
  route, no MCP tool exist yet — this is a greenfield product surface over a
  ready dataset. **Implication:** mock-first; mock shapes mirror the serving
  schema so a later API adapter swaps in without rebuilding UI.
- **Fact:** Coverage is uneven — PNDL (11,636) + Anghel (5,772) dominate;
  PNCCRS 227; PNMC 7. CNI / MIPE Cohesion / ANL / PNSS are **not yet captured**.
  The map can look complete without being complete (UX R7).
- **Fact:** Only the latest snapshot is projected — **no time series yet** (UX
  R6). Stage timeline must be designed but gated until backfill.
- **Fact (PI-1, UX R1):** ~10,900+ amounts may be stored ×1000 until a
  human-gated reparse/backfill. **The single biggest UX risk.** Amount displays
  must guard impossible values and show a data-status warning, or trust
  collapses on first use.
- **Fact:** `money_precision` warning — 13 rows where `decontat > contractat`
  (real source anomaly, triaged). Expose as a labeled caveat/filter, never
  silently clamp away.
- **Fact:** `Stadiu obiectiv` is **not a clean enum** (mixes %, sci-notation,
  free text). Normalize to a small bucket and always keep the raw verbatim in a
  disclosure (UX R3).
- **Fact:** Objective identity is conservative/sometimes weak
  (`program:siruta:md5(title)`); some PNMC rows lack SIRUTA. Never silently
  assert a cross-source merge; surface candidate confidence in expert mode
  (UX R4).
- **Fact:** Some source links are machine ArcGIS API endpoints (label "date
  cartografice (API)") and some legacy `mlpda.ro` links 404 (label dead, do not
  hide). UX R8/R9.
- **Assumption:** PNRR-funded investment lives in the existing `/pnrr` slice and
  is **cross-linked, not duplicated** here. (UX §1.)

## Privacy / provenance constraints

- **Fact:** `party_evidence` rows with `potential_natural_person = true` carry
  `privacy_class = 'personal_moderate'` and **must not be served**; unreviewed
  `public_aggregate` party names are **default-deny** until human review (same
  posture as the judicial-cases slice). The UI must **never** render a gated
  party name as canonical; it shows a `PrivacyBoundaryNotice` instead. Gating is
  enforced at the API layer; the client must additionally fail safe.
- **Decision (orchestrator):** The privacy boundary applies to **all
  parties / person-like evidence** across every PI surface (detail, directory,
  contract tab, search facets).
- **Decision (orchestrator):** Do **not** model public-investment data as
  `flows.money_flows`. No merged money-flow diagrams joining PI to budget/
  procurement. Cross-domain connections are **evidence-led link-outs only**
  (CUI → `/companies/$cui` or `/entities/$cui`, candidate-only → `/achizitii`),
  each showing *why* two records are linked, until an approved cross-source
  policy exists.
- **Fact:** Every exposed fact traces to `source_evidence` (`source_url`,
  `source_file_id`, `object_id`, `source_row_key`) + a content-addressed MinIO
  object. "Vezi dovada" is mandatory beside every figure (UX §2, MVP-4).

## Design implications

- **Map + list is the spine.** Lead with the national map and the absorption
  bar; everything else is progressive disclosure (UX §11–12).
- **Objective is the hub.** Payments/contracts/stages/parties are tabs;
  source-evidence is the trust layer under every figure (UX §7).
- **Honesty is a first-class state.** Coverage gaps, PI-1 inflation, the
  money-precision anomaly, "no history yet", weak identity, and gated parties
  are *product states with their own UI*, not footnotes (foundation Quality
  Bar). A persistent "Cum citesc aceste date" explainer defines `contractat`,
  `decontat`, `absorbție`, `stadiu obiectiv` for casual users (UX R10).
- **Amounts are guarded everywhere.** A single `AmountWithEvidence` pattern
  carries the value, the PI-1/precision guard state, and the "Vezi dovada"
  trigger, so no screen can show a raw unguarded number.

## Blockers (true product blockers only)

- **B1 — Party-review pipeline timing.** The contractor/designer directory (N2)
  cannot launch with real names until the `public_aggregate` review workflow
  exists. *Design proceeds*: directory ships with mock/reviewed-only data and a
  visible "în curs de verificare" state for the rest; this only blocks
  **real-data launch of N2**, not the design or the MVP. (UX Open Q4.)
- **B2 — PI-1 reparse/backfill timeline.** Whether amount displays may launch
  before the ×1000 reparse is a **product-owner decision** (UX Handoff Note,
  Open Q5). *Design proceeds* with impossible-value guards + a domain data-status
  notice; PO must confirm the launch gate. This is the only blocker touching the
  MVP critical path.
