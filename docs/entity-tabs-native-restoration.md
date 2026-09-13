# Entity tabs: original presentation over native APIs

Date: 2026-09-13. Scope: entity and primarie pages, Chronos dev only.

The native migration had replaced the Commitments dashboard with a report-interval table and the INS dashboard with source inspection. This change reuses the existing main-branch presentation and provides native data adapters. The standalone statistics pages are unchanged.

## Commitments

The original three cards, trend chart, chapter comparison, functional/economic detail drilldown and report downloads are restored. All period choices come from the shared Period panel. Reported interval details are a secondary disclosure under the dashboard; their endpoint bounds follow that same panel and full original spans remain visible. Obsolete local month inputs are no longer used.

The new bounded `budgetCommitmentDashboard` query supplies one entity's classification rows for the selected year and totals for the trend years. It reads existing Chronos tables; no migration or data reload is needed. Budget and commitment authority are endpoint balances. Legal commitments and payments are monthly/quarterly movements or latest YTD for the yearly view. Different sector endpoints are disclosed. Transfers are excluded. Missing source periods, factors or population remain unavailable; balances are never added across periods. The same query is available through MCP.

Decimal strings are summed before conversion for the existing numeric chart/table widgets. The previously approved numeric presentation precision remains; no new decimal-input schema is introduced. Drilldown uses the same complete response, avoiding extra legacy queries. Known sectors are conservatively checked across the year, so creation/closure dates are not guessed.

The embedded commitment evolution chart is restored. Its separate chart-editor shortcut remains deferred: the standalone commitment-series API has not been migrated. A dead shortcut would be misleading; extending that separate surface is outside this entity restoration.

## INS

The original summary cards, derived-indicator groups, collapsible dataset explorer, metadata card and blue history chart are reused. A single fixed batch obtains source defaults for the dashboard; complete histories share the selected-detail query cache. A changed default within the same publication changes the preparation key. URL state retains selected datasets, explorer state and source coordinates.

Each observation retains exact canonical geography, publication identity, source dimension/member pairs, units, cadence and qualifications. Annual/monthly/quarterly selections are projected locally from complete histories; distinct periods are never silently added. Missing selected observations remain N/A, and failed verification is distinguished from missing data. Derived indicators require matching annual periods and compatible source units; qualified inputs are excluded and the rule is shown.

Native catalog paths contain human-readable `>` breadcrumbs rather than the legacy dotted codes. A display-only adapter maps known root letters to the original root controls, retains section labels, and sends unknown paths to Other. Catalog entries are filtered by the entity's geographic level. This grouping never participates in source identity or numeric queries.

The INS chart shortcut retains exact source pins and actual observed periods. It does not use the old 1900–2100 sentinel interval, which the native completeness check correctly rejects. Unsupported cadences and incomplete histories have no shortcut. Full original source rows, CSV export, qualification markers and an INS Tempo source link remain available.

## Review and validation

Astra xhigh reviewed both implementations and the final deltas. GLM 5.3 max reviewed security only, with agent tools denied and a source-only bundle. Its URL warnings were checked against the full code: commitment report URLs already pass an HTTP(S)-only Zod boundary; INS links use a fixed official host plus URLSearchParams. The official legacy HTTP Tempo link is retained, with no referrer or opener access; no credentials are attached.

Local browser validation used the local client/server with read-only Chronos data. Iași 2026 nominal RON showed approximately 2.11B allocated budget, 5.01B legal commitments and 1.41B payments. Unsupported 2026 EUR conversion stayed unavailable. INS 2025 showed population 379,371 and the 1992–2026 population history; the exact-source shortcut rendered successfully in the chart editor. These are serving checks, not a new audit or approval of source financial data.

The real-migration PostgreSQL suite passed 10 tests; GraphQL/MCP contract tests passed 6. Client regression checks cover both original and native presentation, shared routes/period controls, missing-vs-zero, complete source history, mixed cadence, chart pins/periods and same-publication default refresh. Production build and dev CI are required before deployment is considered complete.
