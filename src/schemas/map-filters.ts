import { z } from 'zod';
import { lazySchema, type LazyOutput } from '@/lib/route-contract';
import { analyticsFilterSchema } from './analytics-filter-search';
import { createDefaultExecutionYearReportPeriod } from './chart-defaults';
import type { AnalyticsFilterType } from './charts';

export const defaultMapFilters: AnalyticsFilterType = {
  account_category: 'ch',
  // A plain value (no schema), the one call this contract module runs as it loads.
  // eslint-disable-next-line no-restricted-syntax
  report_period: createDefaultExecutionYearReportPeriod(),
  normalization: 'total',
  is_territorial_executive: true,
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
}

/**
 * Total by construction: this parses URL search params, and `.default()` only
 * covers a *missing* value — an invalid one still throws. Both call sites
 * (`/map`'s `beforeLoad` and `useMapFilter`) use bare `.parse`, so a single
 * junk param used to escape as a raw ZodError and render the whole map route
 * as a 500 (`/map?mapZoom=abc`). A stale or hand-edited link must degrade to
 * the default view, not to an error page. `.catch()` is the same idiom the
 * procurement and classification routes use for their search params. Built on
 * first use: `/map` is a route file every page evaluates (docs/route-contracts.md).
 */
export const MapStateSchema = lazySchema(() =>
  z.object({
    preset: z.enum(["expenses", "income", "balance", "local-taxes"]).optional().catch(undefined),
    filters: analyticsFilterSchema.schema().default(defaultMapFilters).catch(defaultMapFilters),
    activeView: z.enum(["map", "table", "chart"]).default("map").catch("map"),
    mapViewType: z.enum(["UAT", "County"]).default("UAT").catch("UAT"),
    // Persist and restore map view state via URL
    mapCenter: z.tuple([z.number(), z.number()]).optional().catch(undefined),
    mapZoom: z.number().optional().catch(undefined),
  }),
);

export type MapUrlState = LazyOutput<typeof MapStateSchema>;
