### Title

As an analyst, I want a compact entity analysis page that reuses the newer primarie experience, so that I can inspect budgets consistently across city halls and other public entities.

### Context

Route: `/entities/$cui`. The route keeps its canonical entity URL and SEO policy, but renders `ChallengeEntityAnalysisPage` through the entities route adapter.

Current views are `main-info`, `contracts`, `commitments`, `ins`, and `profile`. Legacy view values such as `overview`, `map`, `expense-trends`, `income-trends`, `related-charts`, `relationships`, `reports`, and `employees` are accepted for saved links and normalized to the new view model.

### Actors

- Analyst
- Citizen

### User Flow

1. Arrive via search, map click, share link, or deep link.
2. Open the main info view by default unless a supported view is present in the URL.
3. Adjust report period, report type, main creditor, normalization, and analysis controls.
4. Inspect grouped line items, trends, public map preview where supported, reports teaser, contracts, commitments, INS data, or profile.

### Acceptance Criteria

- Given no entity data, when loaded, then show the entity not-found/error state.
- Given no `report_type` URL value, when the entity is a non-main-creditor entity, then use the detailed report type.
- Given a legacy view URL, when loaded, then render without redirecting and normalize into the new view state.
- Given a non-UAT entity, when loaded, then hide UAT-only controls such as INS, per-capita, administrative-expense, and geographic map options.
- Given a UAT or supported county council entity, when loaded, then show the relevant public map entry points.
- Given a map-selected entity inside the analysis page, when confirmed, then navigate to `/entities/$cui`.

### Scenarios

- Given an entity has multiple main creditors, when selecting a main creditor, then report, line-item, commitments, SEO, and subordinate queries keep that CUI.
- Given a legacy EUR normalization link, when loaded, then preserve the EUR override while normalizing the query.
- Given a UAT with INS codes, when opening INS, then load INS dashboards and preserve INS URL params.
- Given a non-UAT or entity missing INS codes, when opening INS via a stale link, then show the unsupported/missing-code state without issuing invalid INS queries.

### Error and Empty States

Use the challenge analysis loading shell and section-level empty states. Contracts, commitments, reports, map, and INS sections should fail independently where possible.

### Analytics & Telemetry

Capture view changes and analysis interactions through the challenge analysis instrumentation. Respect consent.

### Accessibility

Controls should remain keyboard operable, use labeled form fields, and keep confirmation dialogs clear when switching selected entities.

### Performance

The route loader bootstraps entity details and execution line items. Expensive sections remain lazy-loaded behind the challenge analysis deferred section gates.

### URL State

- `view`: current compact view (`main-info`, `contracts`, `commitments`, `ins`, `profile`) or accepted legacy value.
- `year`, `period`, `month`, `quarter`: report period selection.
- `report_type`, `main_creditor_cui`: report scope.
- `normalization`, `currency`, `inflation_adjusted`, `show_period_growth`: value display settings and legacy migration inputs.
- `treemap_account`, `treemap_primary`, `treemap_depth`, `treemap_path`, `expense_type`: grouped line-item state.
- `public_map`: public map preview state.
- `analytics`: budget item analytics modal state.
- `commitments_grouping`, `commitments_detail_level`: commitments table state.
- `insDataset`, `insSearch`, `insRoot`, `insTemporal`, `insExplorer`, `insSeries`, `insUnit`: INS explorer state.

### References

- `src/routes/entities.$cui.tsx`
- `src/routes/entities.$cui.lazy.tsx`
- `src/features/entities/page-core/route-adapters/entities-entity-route-adapter.ts`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`
