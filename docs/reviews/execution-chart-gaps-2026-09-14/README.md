# Execution chart gap rendering

Scope: rendering only. Keep the existing API and YEAR/QUARTER/MONTH controls.
The user deferred recovered range totals and new table availability fields.

The entity chart uses the union of all series labels and explicit missing periods,
leaves unknown points blank, retains real zero and breaks the balance line across
gaps. It rerenders when coverage changes. Native charts no longer zero-fill a
missing sibling bucket when coverage metadata is present; null/omitted metadata
retains the compatibility behavior.

Astra xhigh reviewed correctness; GLM was run read-only as
`zai-coding-plan/glm-5.3#max` in plan mode, security-only and lower-trust. GLM
reported no high/medium findings and two low oversized-backend-payload risks:
repeated linear lookups and function-argument spreading. Root replaced the
lookups with maps/sets and max spreading with reduction. No schema cap, silent
truncation, external data access or authorization change was introduced.
The null metadata inconsistency was independently checked against the existing
nullish schema and corrected with a regression.

Focused tests: 36 pass across EntityFinancialTrends.test.tsx and
useChartData.native.test.tsx. Full `yarn run check` passes on the final code (types and lint). Astra
rechecked the lookup, null handling and first-value duplicate-label regressions
after the security follow-ups and returned GO. The normal commit hook is retained.

The existing local client at 127.0.0.1:3311 loaded CUI 26429279's monthly entity
page and financial chart. It still reads pre-quarantine financial data; this is
only a rendering smoke check, not repaired July output verification. Gap fixtures
were checked in the component/hook tests. No deployment or database write.

Limits: the entity adapter still does not provide source-derived missing periods.
Do not manufacture that metadata from every absent filtered row. Server source
coverage, partial aggregate prevention, and exact quarantine publication remain
separate prerequisites. This commit alone does not make publication safe.

Unrelated src/TODO.md is excluded. Reviewed implementation hashes follow.

- `src/components/entities/EntityFinancialTrends.tsx`: `9db5be675d96d4c4f49bd293595637be1a9a6f7a46a90359ce1666e4c6b571b0`
- `src/components/entities/EntityFinancialTrends.test.tsx`: `4dff2e91ddf4f70ce8bbcc776432b3dd3ffc757403f7dadbcf3089ba90836a03`
- `src/components/charts/hooks/useChartData.ts`: `1138edeb20c8b900fa7e9ff442f5ba1b2bab35e75b086c8bf3d9e99353dcdebd`
- `src/components/charts/hooks/useChartData.native.test.tsx`: `642218db3a6847095c1eed1b9e7d751a358d88d10c6cfa3f9232f148a0216f8d`
