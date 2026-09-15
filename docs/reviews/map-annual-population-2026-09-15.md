# Annual map population — 2026-09-15

New population series use `annualPopulation` and persist an explicit year. Existing saved `geojson-dataset-series` with `insPop2021`, including old configurations where the dataset key was omitted, retain the census dataset. No silent conversion of saved maps.

The editor and public viewer use the same annual population loader and decimal-text vector adapter. Requests are deduplicated per year and UAT/County level. County values come directly from server county cells; geometry supplies keys and geographic filters only. Missing values remain unavailable, never zero or census fallback. Provenance states the applied year, number of territories using earlier observations, oldest source year, maximum age and missing count.

Unused disabled population series do not request data or block the map. Disabled inputs still load when referenced by an enabled calculation, group or filter. Runtime period overrides align companion population with the latest effective financial year. Multi-year/subannual periods that reject a single-year override retain their effective year. Independent saved population years stay unchanged without a runtime override. The raster census overlay remains a separate unchanged layer.

## Validation and rollout

Astra high reviewed the design and implementation; GLM 5.3 max performed a lower-trust security review. Regression coverage includes saved-map compatibility, year switching, request deduplication, no fallback on failure, geographic filters, disabled dependencies, runtime periods and presets. 57 focused client tests passed; typecheck, lint, SSR compilation and Lingui compilation passed. The final production build uses explicit `NODE_ENV=production`: the local `.env` sets development mode, which otherwise includes prototype assets. The production output validator passed: 1,506 JavaScript files and 1,526 files checked for prototype leakage. Server validation: 97 real-DDL PostgreSQL cases and 5,357 suite tests passed; local live query returned 3,186 UATs / 42 counties.

The public entity map renders locally and its source description identifies annual INS population. Local browser editor validation requires signing back in with the development test account after the machine restart. No deployment is claimed here. Deploy the additive server query before this client. No database migration or population reload is required.

## Separate security follow-ups

GLM raised existing owner-dataset cache/auth-transition concerns, URL-state size limits and cache hashing. These need a focused reproduction and separate scoped review; no broad authentication redesign is included in the population change. The new public population query sends no auth token, validates year/key/value responses, and retains no inactive cache (`staleTime`/`gcTime` zero), matching financial map behavior. See the matching server review note for the security adjudication and source evidence.

Final Astra delta review: GO for the scoped map changes; no remaining release blocker identified. Private dataset access was also checked: server owner queries constrain `user_id`, so GLM did not demonstrate an IDOR.
