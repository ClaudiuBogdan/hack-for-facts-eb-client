import { z } from "zod";
import { AnalyticsFilterSchema, Currency, defaultYearRange, Normalization } from "@/schemas/charts";
import { GqlReportTypeEnum } from "@/schemas/reporting";


export const entitySearchSchema = z.object({
    lang: z
        .enum(['ro', 'en'])
        .optional()
        .describe('Optional locale for share links and metadata output.'),
    view: z
        .string()
        .optional()
        .describe('Which view to render for the entity page. Current values: main-info, contracts, commitments, ins, profile. Legacy values like overview, map, income-trends, and expense-trends are normalized to main-info.'),
    period: z
        .enum(['YEAR', 'MONTH', 'QUARTER'])
        .optional()
        .describe('Reporting aggregation period. YEAR, QUARTER, or MONTH.'),
    year: z
        .coerce
        .number()
        .min(defaultYearRange.start)
        .max(defaultYearRange.end)
        .optional()
        .describe(`Year filter within [${defaultYearRange.start}, ${defaultYearRange.end}]. Example: ?year=${defaultYearRange.end}`),
    month: z
        .string()
        .regex(/^\d{2}$/)
        .optional()
        .describe('Month as two digits (01-12). Requires period=MONTH. Example: ?month=03'),
    quarter: z
        .string()
        .regex(/^Q\d{1}$/)
        .optional()
        .describe('Quarter as Q1..Q4. Requires period=QUARTER. Example: ?quarter=Q4'),
    report_type: GqlReportTypeEnum
        .optional()
        .describe('Report type. Mirrors GraphQL GqlReportType. Example: Executie bugetara agregata la nivel de ordonator principal'),
    main_creditor_cui: z
        .string()
        .optional()
        .describe('CUI of the main creditor to filter by.'),
    expenseSearch: z
        .string()
        .optional()
        .describe('Full-text search term for expenses table.'),
    incomeSearch: z
        .string()
        .optional()
        .describe('Full-text search term for income table.'),
    analyticsChartType: z
        .enum(['bar', 'pie'])
        .optional()
        .describe('Quick analytics chart type.'),
    analyticsDataType: z
        .enum(['income', 'expense'])
        .optional()
        .describe('Quick analytics data type.'),
    mapFilters: AnalyticsFilterSchema
        .optional()
        .describe('Advanced heatmap filters for the Map view (see AnalyticsFilterSchema).'),
    analytics: z
        .unknown()
        .optional()
        .describe('Challenge-style budget item analytics modal state.'),
    normalization: Normalization
        .optional()
        .describe('Value normalization. total, per_capita, percent_gdp. total_euro and per_capita_euro are legacy (prefer currency=EUR).'),
    currency: Currency
        .optional()
        .describe('Output currency (RON, EUR, USD). Ignored for percent_gdp.'),
    inflation_adjusted: z
        .coerce
        .boolean()
        .optional()
        .describe('Whether to adjust values for inflation (constant 2024 prices). Ignored for percent_gdp.'),
    show_period_growth: z
        .coerce
        .boolean()
        .optional()
        .describe('Whether to show period-over-period growth (%) for trends.'),
    // Line items filter state (shared across all views)
    lineItemsTab: z
        .enum(['functional', 'funding', 'expenseType'])
        .optional()
        .describe('Active tab for line items: functional, funding, expenseType.'),
    selectedFundingKey: z
        .string()
        .optional()
        .describe('Selected funding key for line items.'),
    selectedExpenseTypeKey: z
        .string()
        .optional()
        .describe('Selected expense type key for line items.'),
    // Legacy treemap state kept for saved entity links
    treemapPrimary: z
        .enum(['fn', 'ec'])
        .optional()
        .describe('Treemap primary classification: fn (functional) or ec (economic).'),
    treemapPath: z
        .string()
        .optional()
        .describe('Legacy treemap drilldown path.'),
    accountCategory: z
        .enum(['ch', 'vn'])
        .optional()
        .describe("Account category: 'ch' (cheltuieli/spending) or 'vn' (venituri/revenue)."),
    treemap_account: z
        .enum(['ch', 'vn'])
        .optional()
        .describe('Challenge-style treemap account category.'),
    expense_type: z
        .string()
        .optional()
        .describe('Challenge-style expense type filter.'),
    treemap_primary: z
        .enum(['fn', 'ec'])
        .optional()
        .describe('Challenge-style treemap primary classification.'),
    treemap_depth: z
        .string()
        .optional()
        .describe('Challenge-style treemap detail depth.'),
    treemap_path: z
        .string()
        .optional()
        .describe('Challenge-style treemap drilldown path.'),
    evolution_account: z
        .enum(['ch', 'vn'])
        .optional()
        .describe('Challenge-style category evolution account category.'),
    evolution_primary: z
        .enum(['fn', 'ec'])
        .optional()
        .describe('Challenge-style category evolution primary classification.'),
    public_map: z
        .string()
        .optional()
        .describe('Challenge-style public map preview key.'),
    // Notification modal state
    notificationModal: z
        .enum(['open'])
        .optional()
        .describe('UI state for the notification modal.'),
    transferFilter: z
        .enum(['all', 'no-transfers', 'transfers-only'])
        .optional()
        .describe('Filter for transfers between institutions.'),
    advancedFilter: z
        .string()
        .optional()
        .describe('Advanced filter for line items (e.g., economic:personal, anomaly:missing).'),
    // Commitments view state
    commitmentsGrouping: z
        .enum(['fn', 'ec'])
        .optional()
        .describe('Commitments table grouping dimension: fn (functional) or ec (economic).'),
    commitmentsDetailLevel: z
        .enum(['chapter', 'detailed'])
        .optional()
        .describe('Commitments table detail level: chapter (depth 2) or detailed (depth 4).'),
    commitments_grouping: z
        .string()
        .optional()
        .describe('Challenge-style commitments table grouping dimension.'),
    commitments_detail_level: z
        .string()
        .optional()
        .describe('Challenge-style commitments table detail level.'),
    insDataset: z.string().optional(),
    insSearch: z.string().optional(),
    insRoot: z.coerce.string().optional(),
    insTemporal: z.string().optional(),
    insExplorer: z.string().optional(),
    insSeries: z.string().optional(),
    insUnit: z.string().optional(),
});

export type EntitySearchSchema = z.infer<typeof entitySearchSchema>;
