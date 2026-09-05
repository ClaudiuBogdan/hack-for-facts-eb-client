# Native grouped budget analytics

The entity analytics table, line items, budget explorer and challenge lesson aggregate consumers now use the native GraphQL endpoint for `entityAnalytics` and `aggregatedLineItems`. Public reads send no authorization token; AbortSignals reach fetch. Query caches use new native keys, including route prefetch.

Per-capita amounts are nullable. Availability follows the metric, not a single population field: a valid sum of yearly ratios may have no single population. CSV preserves missing values as blank. Per-capita entity ranking defaults to territorial executives only when the filter is absent; saved explicit false remains false.

Classification consumers require a complete vector. They request the server's 100,000 maximum and reject a next-page flag or count mismatch rather than display partial totals. Entity CSV export checks stable counts, nonempty progress, unique CUIs and complete count. Missing factor/population errors provide an actionable period or normalization hint. Two unimported chart/KPI components were removed because they recomputed unsupported county ratios from paginated rows.

This is a bounded dev migration slice. Annual INS population custody, immutable publication vintage, release consistency and the rest of the native roots remain required before full migration acceptance. The current server snapshot is not presented as an annual INS implementation.

Validation: 7,552 unit/component tests passed (12 skipped); check and production build passed; 1,466 built JavaScript files validated. All 77 affected browser checks passed (two existing skips), including production Romanian error hints, annual-ratio availability and incomplete-vector rejection. Astra high, Fable high and GLM 5.3 approved; evidence is in the scrapper migration record. Mocked browser tests prove UI behavior, not live source parity.
