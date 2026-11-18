import { z } from 'zod';
import { lazySchema } from '@/lib/route-contract';

export const reportTypeSchema = lazySchema(() => z.enum(['Executie bugetara agregata la nivel de ordonator principal', 'Executie bugetara agregata la nivel de ordonator secundar', 'Executie bugetara detaliata'])
  .describe('The aggregation level of budget execution reports in the Romanian public finance system. "Executie bugetara agregata la nivel de ordonator principal" (PRINCIPAL_AGGREGATED): data aggregated at the level of main budget administrators (e.g., Ministry of Education) - use for high-level analysis. "Executie bugetara agregata la nivel de ordonator secundar" (SECONDARY_AGGREGATED): data aggregated at secondary budget administrators - use for more detailed analysis. "Executie bugetara detaliata" (DETAILED): itemized budget execution with full detail - use for granular analysis. Choose based on desired detail level.'));

export const commitmentsMetricSchema = lazySchema(() => z.enum([
  'CREDITE_ANGAJAMENT',
  'PLATI_TREZOR',
  'PLATI_NON_TREZOR',
  'RECEPTII_TOTALE',
  'RECEPTII_NEPLATITE_CHANGE',
  'LIMITA_CREDIT_ANGAJAMENT',
  'CREDITE_BUGETARE',
  'CREDITE_ANGAJAMENT_INITIALE',
  'CREDITE_BUGETARE_INITIALE',
  'CREDITE_ANGAJAMENT_DEFINITIVE',
  'CREDITE_BUGETARE_DEFINITIVE',
  'CREDITE_ANGAJAMENT_DISPONIBILE',
  'CREDITE_BUGETARE_DISPONIBILE',
  'RECEPTII_NEPLATITE',
]).describe('Commitments metric to query for the time series. Each metric maps to a backend commitments analytical field.'));

export const normalizationSchema = lazySchema(() => z.enum(['total', 'total_euro', 'per_capita', 'per_capita_euro', 'percent_gdp'])
  .describe('How to normalize monetary values for fair comparison. "total": absolute amounts. "per_capita": amounts divided by population for fair comparisons between different-sized entities. "percent_gdp": express as % of GDP. "total_euro" and "per_capita_euro" are legacy; prefer normalization="total"|"per_capita" + currency="EUR".'));

export const currencySchema = lazySchema(() => z.enum(['RON', 'EUR', 'USD'])
  .describe('Output currency for normalized values. "RON": Romanian Leu (default). "EUR": Euro. "USD": US Dollar.'));

export const reportPeriodTypeSchema = lazySchema(() => z.enum(['YEAR', 'MONTH', 'QUARTER'])
  .describe('Time granularity for budget data. "YEAR": annual data points (e.g., 2020, 2021, 2022) - use for multi-year trends and long-term analysis. "MONTH": monthly data points (e.g., 2023-01, 2023-02) - use for seasonal patterns and detailed timing analysis. "QUARTER": quarterly data points (e.g., 2023-Q1, 2023-Q2) - use for mid-range analysis balancing detail and clarity. Choose based on your analysis needs: yearly for trends, monthly for patterns, quarterly for balance.'));

export const reportPeriodSchema = lazySchema(() => {
  const DateInputZ = z.string().describe('Date string in format matching the period type. For YEAR: "2023". For MONTH: "2023-01". For QUARTER: "2023-Q1". Must be consistent with the period type specified.');

  const PeriodSelectionZ = z.union([
    z.object({
      interval: z.object({
        start: DateInputZ.describe('Start date of the continuous period. Format depends on type: YEAR="2020", MONTH="2020-01", QUARTER="2020-Q1". Inclusive boundary - data from this date is included.'),
        end: DateInputZ.describe('End date of the continuous period. Format depends on type: YEAR="2024", MONTH="2024-12", QUARTER="2024-Q4". Inclusive boundary - data up to and including this date is included.')
      }).describe('Continuous date range from start to end. Use for analyzing trends over time. Example: { start: "2020", end: "2024" } for a 5-year period. All dates between start and end are included.'),
      dates: z.undefined().optional(),
    }).describe('Select a continuous interval of dates. Use when analyzing trends or changes over time. Example: analyzing education spending from 2020 to 2024.'),
    z.object({
      dates: z.array(DateInputZ).describe('Array of specific, non-continuous dates to query. Use for comparing specific time points or non-adjacent periods. Example: ["2020", "2022", "2024"] to see only even years. Format depends on type: YEAR=["2020","2021"], MONTH=["2023-01","2023-06"], QUARTER=["2023-Q1","2023-Q4"].'),
      interval: z.undefined().optional(),
    }).describe('Select specific non-continuous dates. Use when you need specific time points rather than a continuous range. Example: comparing Q1 across multiple years ["2020-Q1", "2021-Q1", "2022-Q1"].'),
  ]).describe('Period selection mode: use "interval" for continuous ranges (most common), or "dates" for specific non-continuous time points. Only one mode can be active at a time.');

  return z.object({
    type: reportPeriodTypeSchema.schema(),
    selection: PeriodSelectionZ,
  }).describe('Complete period specification for budget data queries. Combines granularity (YEAR/MONTH/QUARTER) with either a continuous interval or specific dates. Example: { type: "YEAR", selection: { interval: { start: "2020", end: "2024" } } } for yearly data from 2020-2024.');
});

export const analyticsFilterSchema = lazySchema(() => z.object({
  // Required
  report_period: reportPeriodSchema.schema().optional().describe('Time period specification for the data query. Combines granularity (YEAR/MONTH/QUARTER) with date selection (interval or specific dates). Required for most queries. Example: { type: "YEAR", selection: { interval: { start: "2020", end: "2024" } } } retrieves annual data for 5 years.'),
  account_category: z.enum(['ch', 'vn']).default('ch').describe('Type of budget account: "ch" (cheltuieli/expenses) for spending data, or "vn" (venituri/revenue) for income data. Default is "ch". Use "ch" for analyzing government expenditures (education, healthcare, infrastructure). Use "vn" for analyzing revenue sources (taxes, fees, transfers).'),

  // Dimensional filters
  report_ids: z.array(z.string()).optional().describe('Filter by specific report IDs from the budget execution database. Use when you have exact report identifiers to query. Rarely used in typical analysis - prefer filtering by entity, period, or classification instead.'),
  report_type: reportTypeSchema.schema().optional().describe('Aggregation level of the budget data. Choose based on detail needed: use "Executie bugetara agregata la nivel de ordonator principal" for high-level ministry/department totals, "Executie bugetara agregata la nivel de ordonator secundar" for intermediate detail, or "Executie bugetara detaliata" for itemized line-by-line data. Most common: principal aggregated for trends, detailed for deep dives.'),
  main_creditor_cui: z.string().optional().describe('Filter by the CUI (Cod Unic de Identificare - unique fiscal identifier) of the main creditor/budget holder. Use to analyze spending by a specific top-level institution. Example: Ministry of Education\'s CUI to see all education-related spending. Single value only - use entity_cuis array for multiple entities.'),
  reporting_years: z.array(z.number()).optional().describe('Legacy filter for years (deprecated - prefer using report_period instead). Array of calendar years as numbers. Example: [2020, 2021, 2022]. Note: report_period provides more flexibility with monthly/quarterly granularity.'),
  entity_cuis: z.array(z.string()).optional().describe('Filter by specific public entity CUIs (fiscal identifiers). Use to analyze one or more specific institutions. Example: ["12345678", "87654321"] for two specific schools or hospitals. For geographic entities (counties, cities), use uat_ids instead. Can combine multiple entities to create comparison charts.'),
  functional_codes: z.array(z.string()).optional().describe('Filter by exact Romanian COFOG3 functional classification codes. Use full codes for precise filtering. Example: ["70.11.01"] for primary education specifically. Format: XX.XX.XX (2 digits + 2 digits + 2 digits). For broader categories, use functional_prefixes instead. See Romanian COFOG3 classification: 70=Education, 84=Health, 60=Infrastructure, etc.'),
  functional_prefixes: z.array(z.string()).optional().describe('Filter by functional classification prefixes to include entire categories and subcategories. More common than functional_codes. Example: ["70."] includes ALL education spending (70.11 primary, 70.12 secondary, 70.13 higher, etc.). ["84."] for all healthcare. ["60."] for all infrastructure. Use prefixes for broad analysis, exact codes for precision. Most queries use prefixes.'),
  economic_codes: z.array(z.string()).optional().describe('Filter by exact Romanian economic classification codes. Economic classifications categorize spending by type (personnel, goods, services, investments). Example: ["20.30.01"] for base salaries specifically. Format varies by level (chapters, subchapters, articles). For broader categories like "all personnel expenses", use economic_prefixes instead.'),
  economic_prefixes: z.array(z.string()).optional().describe('Filter by economic classification prefixes to include entire expense categories. Example: ["20."] for ALL personnel expenses (salaries, bonuses, social contributions). ["30."] for goods and services. ["60."] for capital investments. Combine with functional filters for detailed analysis like "personnel expenses in education": functional_prefixes=["70."] + economic_prefixes=["20."].'),
  funding_source_ids: z.array(z.string()).optional().describe('Filter by funding source identifiers. Funding sources distinguish between state budget, local budgets, EU funds, loans, etc. Use to analyze specific financing mechanisms. Example: filter to show only EU-funded projects. Available source IDs depend on the budget structure - query the funding sources API for valid values.'),
  budget_sector_ids: z.array(z.string()).optional().describe('Filter by budget sector identifiers. Sectors represent organizational divisions within the public finance system. Use to analyze specific sectors or compare across sectors. Query the budget sectors API for available IDs and their meanings. Less commonly used than functional/economic classifications.'),
  expense_types: z.array(z.enum(['dezvoltare', 'functionare'])).optional().describe('Filter by expense type in Romanian public finance. "dezvoltare" (development/capital expenses): investments, infrastructure, equipment purchases - one-time costs that create assets. "functionare" (operational/current expenses): salaries, utilities, maintenance - recurring costs. Use to distinguish between investment spending and day-to-day operations. Example: ["dezvoltare"] to see only capital projects.'),
  program_codes: z.array(z.string()).optional().describe('Filter by budget program codes. Programs are strategic groupings of activities toward specific goals (e.g., "Rural Development Program", "Digital Transformation Program"). Use to track spending on specific policy initiatives. Available codes depend on government program structure - less standardized than COFOG3 classifications.'),

  // Geography
  county_codes: z.array(z.string()).optional().describe('Filter by Romanian county codes (județ codes). Use to analyze specific counties or compare regions. Example: ["CJ"] for Cluj county, ["B", "CJ", "TM"] for București, Cluj, and Timiș. County codes are 1-2 letter abbreviations. Combine with functional/economic filters for regional analysis like "education spending in Cluj". See Romanian county code list for all values.'),
  regions: z.array(z.string()).optional().describe('Filter by development regions (regiuni de dezvoltare). Romania has 8 development regions (Nord-Est, Sud-Est, Sud, Sud-Vest, Vest, Nord-Vest, Centru, București-Ilfov). Use for macro-regional analysis and EU fund distribution studies. Example: ["Nord-Vest"] for northwestern Romania. Less granular than county_codes but useful for regional policy analysis.'),
  uat_ids: z.array(z.string()).optional().describe('Filter by UAT (Unitate Administrativ-Teritorială) identifiers - administrative territorial units like cities, towns, communes. Use to analyze local budgets. Example: specific city hall budgets. More granular than county_codes. When is_uat is true, this filters to local government entities. Essential for per-capita comparisons between cities.'),
  entity_types: z.array(z.string()).optional().describe('Filter by type of public entity (e.g., "school", "hospital", "city_hall", "ministry"). Use to analyze spending patterns across similar institution types. Example: ["hospital"] to compare all hospitals\' budgets. Available types depend on entity classification in the database. Less standardized than COFOG3 - prefer functional_prefixes for broad categories.'),
  tags: z.array(z.string()).optional().describe('Filter by faceted classification tags in namespace::value form (e.g. "kind::hospital", "level::local"). Tags in the SAME facet (same namespace) combine with OR, tags in DIFFERENT facets combine with AND: ["kind::hospital","kind::clinic","level::local"] means (hospital OR clinic) AND locally-owned. Ancestor roll-up is built in: "kind::school" also matches every school subtype. The vocabulary ships as the entity-tags.json asset.'),
  is_uat: z.boolean().optional().describe('Boolean flag: when true, filters to only UAT (local government) entities; when false or omitted, includes all entity types. Critical for local vs national analysis. Set to true for analyzing city/commune budgets. Set to false or omit for central government. Combine with uat_ids for specific local governments. Essential when using normalization=per_capita for meaningful comparisons.'),
  is_territorial_executive: z.boolean().optional().describe('Filter geographic executive authorities independently of creditor hierarchy. False explicitly excludes executives.'),
  search: z.string().optional().describe('Free-text search across entity names, descriptions, and classifications. Use for exploratory queries when you don\'t know exact codes. Example: "biblioteca" to find library-related spending, "digitalizare" for digitalization projects. Less precise than structured filters but useful for discovery. Search is case-insensitive and supports partial matches.'),

  // Population
  min_population: z.number().optional().describe('Minimum population threshold for filtering entities. Use to focus on larger cities/counties. Example: 100000 to include only cities with 100k+ residents. Useful when analyzing per-capita data to exclude very small localities where per-capita figures can be volatile. Combine with max_population for population range filters.'),
  max_population: z.number().optional().describe('Maximum population threshold for filtering entities. Use to focus on smaller cities/communes or exclude large metropolitan areas. Example: 50000 to include only smaller towns. Useful for studying rural vs urban spending patterns. Combine with min_population to create population brackets like "medium-sized cities (50k-200k residents)".'),

  // Aggregates & transforms
  normalization: z.enum(['total', 'per_capita', 'percent_gdp', 'total_euro', 'per_capita_euro']).optional().describe('How to normalize/transform monetary values. "total": raw absolute amounts. "per_capita": divide by population for fair comparison between different-sized entities. "percent_gdp": express as % of GDP. "total_euro" and "per_capita_euro" are legacy; prefer normalization="total"|"per_capita" + currency="EUR".'),
  currency: currencySchema.schema().optional().describe('Output currency for monetary values. Ignored when normalization="percent_gdp".'),
  inflation_adjusted: z.boolean().optional().describe('Adjust monetary values for inflation to constant prices. Ignored when normalization="percent_gdp".'),
  show_period_growth: z.boolean().optional().describe('For time series, return period-over-period growth (%) instead of levels.'),
  aggregate_min_amount: z.number().or(z.string()).optional().describe('Minimum threshold for aggregated total amounts (after summing all matching line items). Use to filter out small budget items when looking at totals. Example: 1000000 to show only aggregates over 1M RON. Applied after aggregation, so filters based on sum of all items. Different from item_min_amount which filters individual line items. Accepts number or string.'),
  aggregate_max_amount: z.number().or(z.string()).optional().describe('Maximum threshold for aggregated total amounts (after summing all matching line items). Use to focus on smaller budget categories or cap visualizations. Example: 10000000 to show only aggregates under 10M RON. Applied after aggregation. Useful for excluding very large categories that would skew treemap/pie charts. Accepts number or string.'),

  // Per-item thresholds
  item_min_amount: z.number().or(z.string()).optional().describe('Minimum threshold for individual budget line items BEFORE aggregation. Filters out small transactions. Example: 10000 to exclude items under 10k RON. Applied to each line item before summing. Different from aggregate_min_amount. Use to remove noise from detailed data or focus on significant individual expenses. Accepts number or string.'),
  item_max_amount: z.number().or(z.string()).optional().describe('Maximum threshold for individual budget line items BEFORE aggregation. Filters out very large transactions. Example: 1000000 to exclude items over 1M RON. Applied to each line item before summing. Use to focus on routine expenses or exclude extraordinary one-time purchases. Opposite of item_min_amount. Accepts number or string.'),

  // Exclude filters (advanced)
  exclude: z
    .object({
      report_ids: z.array(z.string()).optional().describe('Exclude specific report IDs from results. Negative filter - removes matching reports. Use when you want most data except specific known reports. Example: exclude test reports or known erroneous entries.'),
      entity_cuis: z.array(z.string()).optional().describe('Exclude specific entities by CUI. Use to remove outliers or special cases. Example: exclude the capital city when analyzing regional patterns, or remove entities with known data quality issues. Opposite of the include entity_cuis filter.'),
      main_creditor_cui: z.string().optional().describe('Exclude a specific main creditor/budget holder by CUI. Use to remove a large institution that would dominate the analysis. Example: exclude Ministry of Defense from general spending analysis.'),
      functional_codes: z.array(z.string()).optional().describe('Exclude exact functional classification codes. Use to remove specific subcategories. Example: include all education (70.) but exclude higher education (70.13) by using functional_prefixes=["70."] and exclude.functional_codes=["70.13"].'),
      functional_prefixes: z.array(z.string()).optional().describe('Exclude entire functional categories by prefix. Use to remove broad categories. Example: analyze all spending except education by setting exclude.functional_prefixes=["70."]. More powerful than excluding individual codes.'),
      economic_codes: z.array(z.string()).optional().describe('Exclude exact economic classification codes. Use to remove specific expense types. Example: analyze personnel expenses except one specific subcategory.'),
      economic_prefixes: z.array(z.string()).optional().describe('Exclude entire economic categories by prefix. Use to remove broad expense types. Example: analyze all expenses except personnel by setting exclude.economic_prefixes=["20."]. Useful for "everything except X" queries.'),
      funding_source_ids: z.array(z.string()).optional().describe('Exclude specific funding sources. Use to remove EU-funded projects, external loans, or other special financing. Example: analyze only domestically-funded projects by excluding foreign funding sources.'),
      budget_sector_ids: z.array(z.string()).optional().describe('Exclude specific budget sectors. Use to remove sectors that would skew analysis or focus on a subset of sectors.'),
      expense_types: z.array(z.enum(['dezvoltare', 'functionare'])).optional().describe('Exclude development or operational expenses. Example: exclude.expense_types=["functionare"] to show only capital/development spending. Opposite of the include expense_types filter.'),
      program_codes: z.array(z.string()).optional().describe('Exclude specific program codes. Use to remove special programs or initiatives from general budget analysis.'),
      county_codes: z.array(z.string()).optional().describe('Exclude specific counties. Use to remove outliers like the capital or focus on a region by excluding others. Example: exclude București when analyzing rural counties.'),
      regions: z.array(z.string()).optional().describe('Exclude development regions. Use to focus analysis on other regions or remove special cases.'),
      uat_ids: z.array(z.string()).optional().describe('Exclude specific local government units. Use to remove outliers or special cases from local budget analysis.'),
      entity_types: z.array(z.string()).optional().describe('Exclude specific entity types. Example: exclude.entity_types=["hospital"] to analyze education and other sectors without healthcare facilities.'),
      tags: z.array(z.string()).optional().describe('Exclude entities carrying ANY of these faceted tags (namespace::value). Flat any-match, no facet grouping. Example: exclude.tags=["kind::hospital"] removes every hospital regardless of other filters.'),
    })
    .optional()
    .describe('Advanced exclusion filters - negative filtering to remove specific data from results. All fields work opposite to their include counterparts. Use for "everything except X" queries. Example: all spending except education in București. Combine include and exclude for precise control: include functional_prefixes=["70."] + exclude.functional_codes=["70.13"] gives "all education except higher education".'),
}));
