import { z } from 'zod';
import { AnalyticsFilterSchema, AnalyticsFilterType, createDefaultExecutionYearReportPeriod } from '@/schemas/charts';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults';
import { withDefaultExcludes } from '@/lib/filterUtils';

const MapViewEnum = z.enum(["map", "table", "chart"]);
const MapViewTypeEnum = z.enum(["UAT", "County"]);

export const defaultMapFilters: AnalyticsFilterType = withDefaultExcludes({
  account_category: 'ch',
  report_period: createDefaultExecutionYearReportPeriod(),
  normalization: 'total',
  is_uat: true,
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
  exclude: {
    economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES],
  },
})

/**
 * Total by construction: this parses URL search params, and `.default()` only
 * covers a *missing* value — an invalid one still throws. Both call sites
 * (`/map`'s `beforeLoad` and `useMapFilter`) use bare `.parse`, so a single
 * junk param used to escape as a raw ZodError and render the whole map route
 * as a 500 (`/map?mapZoom=abc`). A stale or hand-edited link must degrade to
 * the default view, not to an error page. `.catch()` is the same idiom the
 * procurement and classification routes use for their search params.
 */
export const MapStateSchema = z.object({
  filters: AnalyticsFilterSchema.default(defaultMapFilters).catch(defaultMapFilters),
  activeView: MapViewEnum.default("map").catch("map"),
  mapViewType: MapViewTypeEnum.default("UAT").catch("UAT"),
  // Persist and restore map view state via URL
  mapCenter: z.tuple([z.number(), z.number()]).optional().catch(undefined),
  mapZoom: z.number().optional().catch(undefined),
});

export type MapUrlState = z.infer<typeof MapStateSchema>;
