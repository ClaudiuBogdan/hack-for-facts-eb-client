### Title

As an analyst, I want a private company profile at `/companies/$cui`, so that I can inspect ONRC registry facts and ANAF fiscal signals without conflating them with public budget entities.

### Context

Route: `/companies/$cui` (digits-only CUI). Data from ONRC open data + ANAF public APIs, mocked until GraphQL is ready. No homepage/global search in v1 — entry via direct URL and future deep links (PNRR, SEAP).

Reference: [`private-companies-scraper-data-reference.md`](../private-companies-scraper-data-reference.md).

### Actors

- Journalist / analyst
- Citizen

### User Flow

1. Open `/companies/{cui}` (share link or manual URL).
2. Read header identity, fiscal badges, and source as-of dates.
3. Read the main profile sections in one scrollable summary.
4. Optionally follow future chips (Achiziții publice, PNRR) when implemented.

### Acceptance Criteria

- Given an unknown CUI, when the page loads, then show not-found (no silent empty profile).
- Given a valid company, when loaded, then show legal name, CUI, nr. înmatriculare, legal form, status, and address text.
- Given ANAF TVA `notFound`, when loaded, then show a warning and do not display fiscal KPIs as zero.
- Given `financials` with years 2022 and 2024 only, when the page is open, then show only those years (no empty columns for 2023).
- Given representatives in ONRC data, when the page is open, then show name and role only (no birth date or address by default).
- Given API `geography` with `uatSirutaCode`, when the page is open, then show UAT context only when the match is source-provided.
- Given `geography.matchConfidence` is not `safe`, when geography is shown, then display the confidence label.
- Given ONRC/ANAF snapshots are displayed, when the user reaches the bottom of the page, then show source names and snapshot dates.
- Given mock mode is disabled and live API is unavailable, when fetch runs, then fail loudly in development.

### Error and Empty States

- Page-level not found for missing company.
- Section empty states: no CAEN, no representatives, no EU branches, no bilant years, no geography.
- Distinct copy for ANAF not found vs empty bilant history.

### Analytics & Telemetry

- `company_view_opened`: cui (when instrumented). Respect consent.

### Accessibility

- Section headings are navigable; tables have semantic headers; badges are not color-only.

### Performance

- Route loader prefetches profile for SEO; heavier map/chart components stay out of the first frame until the section plan is approved.

### URL State

- `tab`: `summary` | `activity` | `governance` | `financials` | `location` (optional, default `summary`).

### UI shell (current phase)

- GOV.UK-inspired compact shell (`layout/`) — summary list, inline status badges, 48rem content width, underline tabs.
- Each tab shows real ONRC/ANAF data when present, with explicit empty-state copy when a section has no rows.

### Main Summary Section Plan

Use the main page body for almost all current ONRC/ANAF facts, grouped by user question rather than source file:

1. **At a glance** — latest bilant KPIs from ANAF (`I14`, `I19`/`I20`, `I21`) plus TVA/inactive status already visible in badges.
2. **Registry identity** — legal form, status, registration date, CUI, registration number, raw registered address, and ONRC snapshot month. Most of this can remain in the compact header until the header feels crowded.
3. **Activity** — ONRC authorized CAEN list with labels; show ANAF fiscal CAEN only if it differs from ONRC or if ONRC activity is missing.
4. **Financial history** — simple year table for `financials[]`; show only returned years and distinguish missing bilant from ANAF `notFound`.
5. **People and branches** — legal representatives as name + role only; EU branches with country/type; empty copy should explain that domestic branches and shareholders are not in the open dump.
6. **Location confidence** — raw address always, UAT/county context only from `geography`; no client-side fuzzy matching. A map preview should wait until `matchConfidence === "safe"` and the section has enough surrounding context.

Potential future tabs should be promoted only when a section becomes deep enough to justify its own page area:

- **Activity**: multiple CAEN rows, fiscal CAEN conflicts, industry context.
- **Financials**: multi-year chart/table, ratios, filing gaps.
- **Public Money**: SEAP/PNRR links once same-CUI mocks exist.
- **Governance**: only if richer, safe-to-display representative/branch data exists.

### References

- `src/routes/companies.$cui.tsx`
- `src/features/private-companies/`
