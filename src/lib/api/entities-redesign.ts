import { z } from "zod";

import { graphqlQuery } from "@/lib/graphql/graphql-client";
import {
  resolveAppliedNormalization,
  type BudgetNormalizationCaveats,
  type NormalizationOptions,
} from "@/lib/normalization";
import type { AnalyticsSeries } from "@/schemas/charts";
import type { GqlReportType, ReportPeriodInput } from "@/schemas/reporting";
import { toReportTypeValue } from "@/schemas/reporting";

import type {
  EntityDetailsData,
  EntityRoutingSummary,
  ExecutionLineItem,
  FundingSourceOption,
  ReportConnection,
  ReportNode,
  ReportsFilterInput,
} from "./entities";

const BudgetReportTypeSchema = z.enum([
  "EXECUTION_DETAILED",
  "EXECUTION_AGG_PRINCIPAL",
  "EXECUTION_AGG_SECONDARY",
]);

type BudgetReportType = z.infer<typeof BudgetReportTypeSchema>;

export type BudgetNormalization =
  "TOTAL" | "TOTAL_EURO" | "PER_CAPITA" | "PER_CAPITA_EURO" | "PERCENT_GDP";

export const MoneySchema = z
  .union([z.string(), z.number()])
  .transform((value, context) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected a finite monetary value",
      });
      return z.NEVER;
    }
    return amount;
  });

const TerritorySchema = z.object({
  id: z.number().int(),
  level: z.string().nullable(),
  kind: z.string().nullable(),
  territoryKey: z.string().nullable(),
  parentId: z.number().int().nullable(),
  nutsCode: z.string().nullable(),
  name: z.string(),
  countyCode: z.string().nullable(),
  countyName: z.string().nullable(),
  sirutaCode: z.string().nullable(),
  population: z.number().int().nullable(),
});

const EntityMetadataResponseSchema = z.object({
  entity: z
    .object({
      cui: z.string(),
      organization: z.object({ name: z.string() }).nullable(),
      territory: TerritorySchema.nullable(),
      reference: z
        .object({
          name: z.string(),
          address: z.string().nullable(),
          entityType: z.string().nullable(),
          isUat: z.boolean(),
      isTerritorialExecutive: z.boolean(),
          defaultReportType: z.string().nullable(),
          territory: TerritorySchema.nullable(),
        })
        .nullable(),
      budget: z
        .object({
          presence: z.boolean(),
          reportType: BudgetReportTypeSchema.nullable(),
        })
        .nullable(),
    })
    .nullable(),
});

const BudgetSeriesPointSchema = z.object({
  periodLabel: z.string(),
  amount: MoneySchema,
});

const BudgetSummaryPointSchema = z.object({
  mainCreditorCui: z.string().nullable(),
  year: z.number().int(),
  month: z.number().int().nullable(),
  quarter: z.number().int().nullable(),
  totalIncome: MoneySchema,
  totalExpense: MoneySchema,
  budgetBalance: MoneySchema,
});

const EntityBudgetResponseSchema = z.object({
  summary: z.array(BudgetSummaryPointSchema),
  currentIncome: z.array(BudgetSeriesPointSchema),
  currentExpense: z.array(BudgetSeriesPointSchema),
  currentBalance: z.array(BudgetSeriesPointSchema),
  trendIncome: z.array(BudgetSeriesPointSchema),
  trendExpense: z.array(BudgetSeriesPointSchema),
  trendBalance: z.array(BudgetSeriesPointSchema),
});

const ENTITY_METADATA_QUERY = /* GraphQL */ `
  query GetEntityMetadata($cui: CUI!) {
    entity(cui: $cui) {
      cui
      organization {
        name
      }
      territory {
        id level kind territoryKey parentId nutsCode
        name
        countyCode
        countyName
        sirutaCode
        population
      }
      reference {
        name
        address
        entityType
        isUat
        isTerritorialExecutive
        defaultReportType
        territory {
          id level kind territoryKey parentId nutsCode
          name
          countyCode
          countyName
          sirutaCode
          population
        }
      }
      budget {
        presence
        reportType
      }
    }
  }
`;

const ENTITY_BUDGET_QUERY = /* GraphQL */ `
  query GetEntityBudget(
    $cui: CUI!
    $reportType: BudgetReportType!
    $frequency: BudgetFrequency!
    $currentYearFrom: Int
    $currentYearTo: Int
    $trendYearFrom: Int
    $trendYearTo: Int
    $summaryYearFrom: Int
    $summaryYearTo: Int
    $normalization: BudgetNormalization!
  ) {
    summary: budgetEntitySummary(
      cui: $cui
      reportType: $reportType
      frequency: $frequency
      yearFrom: $summaryYearFrom
      yearTo: $summaryYearTo
    ) {
      mainCreditorCui
      year
      month
      quarter
      totalIncome
      totalExpense
      budgetBalance
    }
    currentIncome: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: INCOME
      frequency: $frequency
      yearFrom: $currentYearFrom
      yearTo: $currentYearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
    currentExpense: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: EXPENSE
      frequency: $frequency
      yearFrom: $currentYearFrom
      yearTo: $currentYearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
    currentBalance: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: BALANCE
      frequency: $frequency
      yearFrom: $currentYearFrom
      yearTo: $currentYearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
    trendIncome: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: INCOME
      frequency: $frequency
      yearFrom: $trendYearFrom
      yearTo: $trendYearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
    trendExpense: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: EXPENSE
      frequency: $frequency
      yearFrom: $trendYearFrom
      yearTo: $trendYearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
    trendBalance: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: BALANCE
      frequency: $frequency
      yearFrom: $trendYearFrom
      yearTo: $trendYearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
  }
`;

type BudgetSeriesPoint = z.infer<typeof BudgetSeriesPointSchema>;
type BudgetSummaryPoint = z.infer<typeof BudgetSummaryPointSchema>;

function summaryPeriodLabel(
  point: BudgetSummaryPoint,
  frequency: ReportPeriodInput["type"],
): string {
  if (frequency === "YEAR") return String(point.year);
  if (frequency === "QUARTER") {
    return `${String(point.year)}-Q${String(point.quarter ?? 0)}`;
  }
  return `${String(point.year)}-${String(point.month ?? 0).padStart(2, "0")}`;
}

function groupSeriesPoints(
  points: readonly BudgetSeriesPoint[],
): BudgetSeriesPoint[] {
  const amounts = new Map<string, number>();
  for (const point of points) {
    amounts.set(
      point.periodLabel,
      (amounts.get(point.periodLabel) ?? 0) + point.amount,
    );
  }
  return [...amounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([periodLabel, amount]) => ({ periodLabel, amount }));
}

function summaryMetricPoints(params: {
  readonly points: readonly BudgetSummaryPoint[];
  readonly frequency: ReportPeriodInput["type"];
  readonly metric: "totalIncome" | "totalExpense" | "budgetBalance";
  readonly mainCreditorCui?: string;
}): BudgetSeriesPoint[] {
  const filtered = params.mainCreditorCui
    ? params.points.filter(
        (point) => point.mainCreditorCui === params.mainCreditorCui,
      )
    : params.points;
  return groupSeriesPoints(
    filtered.map((point) => ({
      periodLabel: summaryPeriodLabel(point, params.frequency),
      amount: point[params.metric],
    })),
  );
}

function normalizationFactors(params: {
  readonly normalized: readonly BudgetSeriesPoint[];
  readonly total: readonly BudgetSeriesPoint[];
}): Map<string, number> {
  const normalized = new Map(
    groupSeriesPoints(params.normalized).map((point) => [
      point.periodLabel,
      point.amount,
    ]),
  );
  const total = groupSeriesPoints(params.total);
  return new Map(
    total.map((point) => [
      point.periodLabel,
      point.amount === 0
        ? 1
        : (normalized.get(point.periodLabel) ?? point.amount) / point.amount,
    ]),
  );
}

function applyNormalizationFactors(
  points: readonly BudgetSeriesPoint[],
  factors: ReadonlyMap<string, number>,
): BudgetSeriesPoint[] {
  return points.map((point) => ({
    periodLabel: point.periodLabel,
    amount: point.amount * (factors.get(point.periodLabel) ?? 1),
  }));
}

function toBudgetReportType(
  reportType?: GqlReportType | string | null,
): BudgetReportType {
  switch (reportType) {
    case "DETAILED":
    case "EXECUTION_DETAILED":
    case "Executie bugetara detaliata":
      return "EXECUTION_DETAILED";
    case "SECONDARY_AGGREGATED":
    case "EXECUTION_AGG_SECONDARY":
    case "Executie bugetara agregata la nivel de ordonator secundar":
      return "EXECUTION_AGG_SECONDARY";
    case "PRINCIPAL_AGGREGATED":
    case "EXECUTION_AGG_PRINCIPAL":
    case "Executie bugetara agregata la nivel de ordonator principal":
      return "EXECUTION_AGG_PRINCIPAL";
    case undefined:
    case null:
      return "EXECUTION_DETAILED";
    default:
      throw new Error(
        `The redesign entity page does not support report type ${reportType}`,
      );
  }
}

function inferBudgetReportType(reportType?: string | null): BudgetReportType {
  try {
    return toBudgetReportType(reportType);
  } catch {
    return "EXECUTION_DETAILED";
  }
}

function toLegacyReportType(reportType: BudgetReportType): GqlReportType {
  switch (reportType) {
    case "EXECUTION_DETAILED":
      return "DETAILED";
    case "EXECUTION_AGG_SECONDARY":
      return "SECONDARY_AGGREGATED";
    case "EXECUTION_AGG_PRINCIPAL":
      return "PRINCIPAL_AGGREGATED";
  }
}

/**
 * The supported normalization for a request plus the caveats for what could
 * not be applied (no CPI mode, no USD yet — program D2). One rule for fetching
 * and labelling: `resolveAppliedNormalization` in `@/lib/normalization`.
 */
export type { BudgetNormalizationCaveats } from "@/lib/normalization";

export function resolveBudgetNormalization(options: NormalizationOptions): {
  readonly normalization: BudgetNormalization;
  readonly caveats: BudgetNormalizationCaveats | null;
} {
  const applied = resolveAppliedNormalization(options);
  if (applied.normalization === "percent_gdp") {
    return { normalization: "PERCENT_GDP", caveats: applied.caveats };
  }
  if (applied.normalization === "per_capita") {
    return {
      normalization:
        applied.currency === "EUR" ? "PER_CAPITA_EURO" : "PER_CAPITA",
      caveats: applied.caveats,
    };
  }
  return {
    normalization: applied.currency === "EUR" ? "TOTAL_EURO" : "TOTAL",
    caveats: applied.caveats,
  };
}

/** The supported normalization for a request; never throws (see resolveBudgetNormalization). */
export function toBudgetNormalization(
  options: NormalizationOptions,
): BudgetNormalization {
  return resolveBudgetNormalization(options).normalization;
}

function periodValues(period: ReportPeriodInput): readonly string[] {
  if (period.selection.dates !== undefined) return period.selection.dates;
  return [period.selection.interval.start, period.selection.interval.end];
}

function periodYearBounds(period: ReportPeriodInput): {
  yearFrom: number;
  yearTo: number;
} {
  const years = periodValues(period).map((value) => Number(value.slice(0, 4)));
  if (years.some((year) => !Number.isInteger(year))) {
    throw new Error("Invalid report period year");
  }
  return { yearFrom: Math.min(...years), yearTo: Math.max(...years) };
}

function filterSeriesPeriod(
  points: readonly BudgetSeriesPoint[],
  period: ReportPeriodInput,
): BudgetSeriesPoint[] {
  if (period.selection.dates !== undefined) {
    const dates = new Set<string>(period.selection.dates);
    return points.filter((point) => dates.has(point.periodLabel));
  }

  const { start, end } = period.selection.interval;
  return points.filter(
    (point) => point.periodLabel >= start && point.periodLabel <= end,
  );
}

function latestAmount(
  points: readonly BudgetSeriesPoint[],
  period: ReportPeriodInput,
): number | null {
  const selected = filterSeriesPeriod(points, period);
  return selected[selected.length - 1]?.amount ?? null;
}

function toGrowthPoints(
  points: readonly BudgetSeriesPoint[],
): BudgetSeriesPoint[] {
  const growth: BudgetSeriesPoint[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (
      previous === undefined ||
      current === undefined ||
      previous.amount === 0
    )
      continue;
    growth.push({
      periodLabel: current.periodLabel,
      amount:
        ((current.amount - previous.amount) / Math.abs(previous.amount)) * 100,
    });
  }
  return growth;
}

function seriesUnit(normalization: BudgetNormalization): string {
  switch (normalization) {
    case "TOTAL":
      return "RON";
    case "TOTAL_EURO":
      return "EUR";
    case "PER_CAPITA":
      return "RON/capita";
    case "PER_CAPITA_EURO":
      return "EUR/capita";
    case "PERCENT_GDP":
      return "%";
  }
}

function toAnalyticsSeries(params: {
  readonly id: string;
  readonly points: readonly BudgetSeriesPoint[];
  readonly period: ReportPeriodInput;
  readonly normalization: BudgetNormalization;
  readonly showPeriodGrowth: boolean;
}): AnalyticsSeries {
  const selected = filterSeriesPeriod(params.points, params.period);
  const points = params.showPeriodGrowth ? toGrowthPoints(selected) : selected;
  return {
    seriesId: params.id,
    xAxis: { name: "Period", type: "STRING", unit: params.period.type },
    yAxis: {
      name: params.showPeriodGrowth ? "Growth" : "Amount",
      type: "FLOAT",
      unit: params.showPeriodGrowth ? "%" : seriesUnit(params.normalization),
    },
    data: points.map((point) => ({ x: point.periodLabel, y: point.amount })),
  };
}

export async function fetchRedesignEntityDetails(
  params: {
    readonly cui: string;
    readonly reportPeriod: ReportPeriodInput;
    readonly reportType?: GqlReportType;
    readonly trendPeriod?: ReportPeriodInput;
    readonly mainCreditorCui?: string;
  } & NormalizationOptions,
): Promise<EntityDetailsData | null> {
  const metadataRaw = await graphqlQuery<unknown>(
    ENTITY_METADATA_QUERY,
    { cui: params.cui },
    {
      operationName: "entity-metadata",
      auth: "none",
    },
  );
  const metadata = EntityMetadataResponseSchema.parse(metadataRaw).entity;
  if (metadata === null) return null;

  const reportType =
    params.reportType !== undefined
      ? toBudgetReportType(params.reportType)
      : inferBudgetReportType(
          metadata.budget?.reportType ?? metadata.reference?.defaultReportType,
        );
  const legacyReportType = toLegacyReportType(reportType);
  const territory = metadata.reference?.territory ?? metadata.territory;
  const base: EntityDetailsData = {
    cui: metadata.cui,
    name:
      metadata.reference?.name ?? metadata.organization?.name ?? metadata.cui,
    address: metadata.reference?.address ?? null,
    default_report_type: legacyReportType,
    entity_type: metadata.reference?.entityType ?? null,
    is_uat: metadata.reference?.isUat ?? false,
    is_territorial_executive: metadata.reference?.isTerritorialExecutive,
    uat:
      territory === null
        ? null
        : {
            id: territory.id,
            level: territory.level,
            kind: territory.kind,
            territory_key: territory.territoryKey,
            parent_id: territory.parentId,
            nuts_code: territory.nutsCode,
            county_name: territory.countyName,
            county_code: territory.countyCode,
            name: territory.name,
            siruta_code:
              territory.sirutaCode === null
                ? null
                : Number(territory.sirutaCode),
            population: territory.population,
            county_entity: null,
          },
    totalIncome: null,
    totalExpenses: null,
    budgetBalance: null,
    incomeTrend: null,
    expenseTrend: null,
    balanceTrend: null,
  };

  if (metadata.budget?.presence !== true) {
    return { ...base, normalizationCaveats: resolveBudgetNormalization(params).caveats };
  }

  const trendPeriod = params.trendPeriod ?? params.reportPeriod;
  const currentBounds = periodYearBounds(params.reportPeriod);
  const trendBounds = periodYearBounds(trendPeriod);
  const summaryYearFrom = Math.min(
    currentBounds.yearFrom,
    trendBounds.yearFrom,
  );
  const summaryYearTo = Math.max(currentBounds.yearTo, trendBounds.yearTo);
  const { normalization, caveats: normalizationCaveats } =
    resolveBudgetNormalization(params);
  base.normalizationCaveats = normalizationCaveats;
  const budgetRaw = await graphqlQuery<unknown>(
    ENTITY_BUDGET_QUERY,
    {
      cui: params.cui,
      reportType,
      frequency: params.reportPeriod.type,
      currentYearFrom: currentBounds.yearFrom,
      currentYearTo: currentBounds.yearTo,
      trendYearFrom: trendBounds.yearFrom,
      trendYearTo: trendBounds.yearTo,
      summaryYearFrom,
      summaryYearTo,
      normalization,
    },
    {
      operationName: "entity-budget",
      auth: "none",
    },
  );
  const budget = EntityBudgetResponseSchema.parse(budgetRaw);

  const choosePoints = (input: {
    readonly metric: "totalIncome" | "totalExpense" | "budgetBalance";
    readonly current: readonly BudgetSeriesPoint[];
    readonly trend: readonly BudgetSeriesPoint[];
  }): { current: BudgetSeriesPoint[]; trend: BudgetSeriesPoint[] } => {
    const total = summaryMetricPoints({
      points: budget.summary,
      frequency: params.reportPeriod.type,
      metric: input.metric,
    });
    const scoped = summaryMetricPoints({
      points: budget.summary,
      frequency: params.reportPeriod.type,
      metric: input.metric,
      ...(params.mainCreditorCui
        ? { mainCreditorCui: params.mainCreditorCui }
        : {}),
    });

    if (normalization === "TOTAL") {
      return { current: scoped, trend: scoped };
    }
    if (params.mainCreditorCui === undefined) {
      return {
        current: groupSeriesPoints(input.current),
        trend: groupSeriesPoints(input.trend),
      };
    }

    return {
      current: applyNormalizationFactors(
        scoped,
        normalizationFactors({ normalized: input.current, total }),
      ),
      trend: applyNormalizationFactors(
        scoped,
        normalizationFactors({ normalized: input.trend, total }),
      ),
    };
  };

  const income = choosePoints({
    metric: "totalIncome",
    current: budget.currentIncome,
    trend: budget.trendIncome,
  });
  const expense = choosePoints({
    metric: "totalExpense",
    current: budget.currentExpense,
    trend: budget.trendExpense,
  });
  const balance = choosePoints({
    metric: "budgetBalance",
    current: budget.currentBalance,
    trend: budget.trendBalance,
  });

  return {
    ...base,
    totalIncome: latestAmount(income.current, params.reportPeriod),
    totalExpenses: latestAmount(expense.current, params.reportPeriod),
    budgetBalance: latestAmount(balance.current, params.reportPeriod),
    incomeTrend: toAnalyticsSeries({
      id: "income",
      points: income.trend,
      period: trendPeriod,
      normalization,
      showPeriodGrowth: params.show_period_growth === true,
    }),
    expenseTrend: toAnalyticsSeries({
      id: "expense",
      points: expense.trend,
      period: trendPeriod,
      normalization,
      showPeriodGrowth: params.show_period_growth === true,
    }),
    balanceTrend: toAnalyticsSeries({
      id: "balance",
      points: balance.trend,
      period: trendPeriod,
      normalization,
      showPeriodGrowth: params.show_period_growth === true,
    }),
  };
}

const EntityRelationshipsResponseSchema = z.object({
  referencePublicEntity: z
    .object({
      parents: z.object({
        cui1: z.string().nullable(),
        cui2: z.string().nullable(),
      }),
    })
    .nullable(),
  referencePublicEntityChildren: z.array(
    z.object({ cui: z.string(), name: z.string() }),
  ),
});

const OrganizationLabelsResponseSchema = z.object({
  organizationLabels: z.array(
    z.object({
      cui: z.string().nullable(),
      canonicalName: z.string().nullable(),
      status: z.enum(["named", "placeholder", "unavailable"]),
    }),
  ),
});

const ENTITY_RELATIONSHIPS_QUERY = /* GraphQL */ `
  query GetEntityRelationships($cui: CUI!) {
    referencePublicEntity(cui: $cui) {
      parents {
        cui1
        cui2
      }
    }
    referencePublicEntityChildren(cui: $cui) {
      cui
      name
    }
  }
`;

const ORGANIZATION_LABELS_QUERY = /* GraphQL */ `
  query GetOrganizationLabels($cuis: [String!]!) {
    organizationLabels(cuis: $cuis) {
      cui
      canonicalName
      status
    }
  }
`;

export async function fetchRedesignEntityRelationships(
  cui: string,
): Promise<Pick<EntityDetailsData, "children" | "parents">> {
  const raw = await graphqlQuery<unknown>(
    ENTITY_RELATIONSHIPS_QUERY,
    { cui },
    {
      operationName: "entity-relationships",
      auth: "none",
    },
  );
  const response = EntityRelationshipsResponseSchema.parse(raw);
  const parentCuis = [
    response.referencePublicEntity?.parents.cui1,
    response.referencePublicEntity?.parents.cui2,
  ].filter((value): value is string => value !== null && value !== undefined);

  let parents: Array<{ cui: string; name: string }> = [];
  if (parentCuis.length > 0) {
    const labelsRaw = await graphqlQuery<unknown>(
      ORGANIZATION_LABELS_QUERY,
      { cuis: parentCuis },
      {
        operationName: "entity-parent-labels",
        auth: "none",
      },
    );
    const labels =
      OrganizationLabelsResponseSchema.parse(labelsRaw).organizationLabels;
    parents = parentCuis.map((parentCui, index) => ({
      cui: parentCui,
      name: labels[index]?.canonicalName ?? parentCui,
    }));
  }

  return { children: response.referencePublicEntityChildren, parents };
}

const EntityRoutingResponseSchema = z.object({
  referencePublicEntity: z
    .object({
      cui: z.string(),
      entityType: z.string().nullable(),
      isUat: z.boolean(),
      isTerritorialExecutive: z.boolean(),
    })
    .nullable(),
});

const ENTITY_ROUTING_QUERY = /* GraphQL */ `
  query GetEntityRoutingSummary($cui: CUI!) {
    referencePublicEntity(cui: $cui) {
      cui
      entityType
      isUat
      isTerritorialExecutive
    }
  }
`;

export async function fetchRedesignEntityRoutingSummary(
  cui: string,
): Promise<EntityRoutingSummary | null> {
  const raw = await graphqlQuery<unknown>(
    ENTITY_ROUTING_QUERY,
    { cui },
    {
      operationName: "entity-routing-summary",
      auth: "none",
    },
  );
  const entity = EntityRoutingResponseSchema.parse(raw).referencePublicEntity;
  if (entity === null) return null;
  return {
    cui: entity.cui,
    entity_type: entity.entityType,
    is_uat: entity.isUat,
    is_territorial_executive: entity.isTerritorialExecutive,
  };
}

const BudgetReportSchema = z.object({
  reportId: z.string(),
  entityCui: z.string(),
  entityName: z.string().nullable(),
  reportType: z.string(),
  mainCreditorCui: z.string().nullable(),
  reportDate: z.string().nullable(),
  reportingYear: z.number().int(),
  budgetSectorId: z.number().int().nullable(),
  downloadLinks: z.array(z.string()),
});

const BudgetReportsResponseSchema = z.object({
  budgetReports: z.object({
    items: z.array(BudgetReportSchema),
    total: z.number().int().nullable(),
    estimated: z.boolean(),
    caveats: z.array(z.string()),
  }),
});

const BUDGET_REPORTS_QUERY = /* GraphQL */ `
  query GetEntityReports(
    $filter: BudgetReportFilter!
    $page: Int!
    $pageSize: Int!
  ) {
    budgetReports(filter: $filter, page: $page, pageSize: $pageSize) {
      items {
        reportId
        entityCui
        entityName
        reportType
        mainCreditorCui
        reportDate
        reportingYear
        budgetSectorId
        downloadLinks
      }
      total
      estimated
      caveats
    }
  }
`;

function toBudgetReportFilter(
  filter: ReportsFilterInput,
): Record<string, unknown> {
  if (filter.search !== undefined) {
    throw new Error(
      "Report search is not available in the redesign reports adapter yet",
    );
  }

  const reportDateFrom = filter.report_date_start ?? filter.report_date_end;
  const reportDateTo = filter.report_date_end ?? filter.report_date_start;

  const reportTypeValue = (reportType: GqlReportType): string => {
    switch (reportType) {
      case "COMMITMENT_PRINCIPAL_AGGREGATED":
        return "Executie - Angajamente bugetare agregat principal";
      case "COMMITMENT_SECONDARY_AGGREGATED":
        return "Executie - Angajamente bugetare agregat secundar";
      case "COMMITMENT_DETAILED":
        return "Executie - Angajamente bugetare detaliat";
      default:
        return toReportTypeValue(reportType);
    }
  };

  return {
    ...(filter.entity_cui ? { entityCui: { eq: filter.entity_cui } } : {}),
    ...(filter.reporting_year
      ? { reportingYear: { eq: filter.reporting_year } }
      : {}),
    ...(filter.reporting_period
      ? { reportingPeriod: { eq: filter.reporting_period } }
      : {}),
    ...(filter.report_type
      ? { reportType: { eq: reportTypeValue(filter.report_type) } }
      : {}),
    ...(reportDateFrom && reportDateTo
      ? { reportDate: { between: { from: reportDateFrom, to: reportDateTo } } }
      : {}),
    ...(filter.main_creditor_cui
      ? { mainCreditorCui: { eq: filter.main_creditor_cui } }
      : {}),
  };
}

function toReportNode(report: z.infer<typeof BudgetReportSchema>): ReportNode {
  const sectorId =
    report.budgetSectorId === null ? "" : String(report.budgetSectorId);
  const mainCreditorCui = report.mainCreditorCui ?? report.entityCui;
  return {
    report_id: report.reportId,
    reporting_year: report.reportingYear,
    report_type: report.reportType,
    report_date: report.reportDate ?? "",
    download_links: report.downloadLinks,
    main_creditor: {
      cui: mainCreditorCui,
      name: mainCreditorCui,
    },
    budgetSector: { sector_id: sectorId, sector_description: sectorId },
  };
}

export async function fetchRedesignReportsConnection(
  filter: ReportsFilterInput,
  limit = 10,
  offset = 0,
): Promise<ReportConnection> {
  if (limit < 1) throw new Error("Report page size must be positive");
  const page = Math.floor(offset / limit) + 1;
  const raw = await graphqlQuery<unknown>(
    BUDGET_REPORTS_QUERY,
    {
      filter: toBudgetReportFilter(filter),
      page,
      pageSize: limit,
    },
    {
      operationName: "entity-reports",
      auth: "none",
    },
  );
  const response = BudgetReportsResponseSchema.parse(raw).budgetReports;
  const totalCount = response.total ?? response.items.length;
  return {
    nodes: response.items.map(toReportNode),
    pageInfo: {
      totalCount,
      hasNextPage: page * limit < totalCount,
      hasPreviousPage: page > 1,
    },
  };
}

const BudgetLineItemSchema = z.object({
  executionLineItemId: z.string(),
  accountCategory: z.enum(["INCOME", "EXPENSE"]),
  fundingSource: z.string().nullable(),
  fundingSourceId: z.number().int(),
  expenseType: z.string().nullable(),
  anomaly: z.string().nullable(),
  functionalCode: z.string(),
  functionalName: z.string().nullable(),
  economicCode: z.string().nullable(),
  economicName: z.string().nullable(),
  ytdAmount: MoneySchema,
  quarterlyAmount: MoneySchema.nullable(),
  monthlyAmount: MoneySchema,
});

const BudgetLineItemsResponseSchema = z.object({
  budgetExecutionLineItems: z.object({
    edges: z.array(z.object({ node: BudgetLineItemSchema })),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
});

const BUDGET_LINE_ITEMS_QUERY = /* GraphQL */ `
  query GetEntityLineItems(
    $filter: BudgetFactFilter!
    $first: Int!
    $after: String
  ) {
    budgetExecutionLineItems(
      filter: $filter
      sort: AMOUNT_DESC
      first: $first
      after: $after
    ) {
      edges {
        node {
          executionLineItemId
          accountCategory
          fundingSource
          fundingSourceId
          expenseType
          anomaly
          functionalCode
          functionalName
          economicCode
          economicName
          ytdAmount
          quarterlyAmount
          monthlyAmount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const LineItemNormalizationResponseSchema = z.object({
  totalExpense: z.array(BudgetSeriesPointSchema),
  normalizedExpense: z.array(BudgetSeriesPointSchema),
  totalIncome: z.array(BudgetSeriesPointSchema),
  normalizedIncome: z.array(BudgetSeriesPointSchema),
});

const LINE_ITEM_NORMALIZATION_QUERY = /* GraphQL */ `
  query GetEntityLineItemNormalization(
    $cui: CUI!
    $reportType: BudgetReportType!
    $frequency: BudgetFrequency!
    $yearFrom: Int
    $yearTo: Int
    $normalization: BudgetNormalization!
  ) {
    totalExpense: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: EXPENSE
      frequency: $frequency
      yearFrom: $yearFrom
      yearTo: $yearTo
      normalization: TOTAL
    ) {
      periodLabel
      amount
    }
    normalizedExpense: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: EXPENSE
      frequency: $frequency
      yearFrom: $yearFrom
      yearTo: $yearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
    totalIncome: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: INCOME
      frequency: $frequency
      yearFrom: $yearFrom
      yearTo: $yearTo
      normalization: TOTAL
    ) {
      periodLabel
      amount
    }
    normalizedIncome: budgetTimeseries(
      cui: $cui
      reportType: $reportType
      metric: INCOME
      frequency: $frequency
      yearFrom: $yearFrom
      yearTo: $yearTo
      normalization: $normalization
    ) {
      periodLabel
      amount
    }
  }
`;

const LINE_ITEM_PAGE_SIZE = 100;
const MAX_LINE_ITEMS_PER_CATEGORY = 15_000;

function latestPeriodValue(period: ReportPeriodInput): string {
  const values = [...periodValues(period)].sort();
  return values[values.length - 1] ?? "";
}

function toLineItemFilter(params: {
  readonly cui: string;
  readonly reportPeriod: ReportPeriodInput;
  readonly reportType: BudgetReportType;
  readonly accountCategory: "INCOME" | "EXPENSE";
  readonly mainCreditorCui?: string;
}): Record<string, unknown> {
  const periodValue = latestPeriodValue(params.reportPeriod);
  const year = Number(periodValue.slice(0, 4));
  if (!Number.isInteger(year))
    throw new Error("Invalid line-item reporting year");

  return {
    reportingYear: { eq: year },
    reportType: { eq: params.reportType },
    accountCategory: { eq: params.accountCategory },
    frequency: { eq: params.reportPeriod.type },
    entityCuis: { in: [params.cui] },
    ...(params.reportPeriod.type === "MONTH"
      ? { months: { in: [Number(periodValue.slice(5, 7))] } }
      : {}),
    ...(params.reportPeriod.type === "QUARTER"
      ? { quarters: { in: [Number(periodValue.slice(-1))] } }
      : {}),
    ...(params.mainCreditorCui
      ? { mainCreditorCui: { eq: params.mainCreditorCui } }
      : {}),
  };
}

async function fetchLineItemCategory(params: {
  readonly cui: string;
  readonly reportPeriod: ReportPeriodInput;
  readonly reportType: BudgetReportType;
  readonly accountCategory: "INCOME" | "EXPENSE";
  readonly mainCreditorCui?: string;
}): Promise<Array<z.infer<typeof BudgetLineItemSchema>>> {
  const filter = toLineItemFilter(params);
  const items: Array<z.infer<typeof BudgetLineItemSchema>> = [];
  let after: string | null = null;

  while (items.length < MAX_LINE_ITEMS_PER_CATEGORY) {
    const raw: unknown = await graphqlQuery<unknown>(
      BUDGET_LINE_ITEMS_QUERY,
      {
        filter,
        first: LINE_ITEM_PAGE_SIZE,
        after,
      },
      {
        operationName: `entity-line-items-${params.accountCategory.toLowerCase()}`,
        auth: "none",
      },
    );
    const parsed: z.infer<typeof BudgetLineItemsResponseSchema> =
      BudgetLineItemsResponseSchema.parse(raw);
    const page: z.infer<
      typeof BudgetLineItemsResponseSchema
    >["budgetExecutionLineItems"] = parsed.budgetExecutionLineItems;
    items.push(...page.edges.map((edge) => edge.node));
    if (!page.pageInfo.hasNextPage) return items;
    if (page.pageInfo.endCursor === null) {
      throw new Error(
        "The redesign line-item API returned hasNextPage without an end cursor",
      );
    }
    after = page.pageInfo.endCursor;
  }

  throw new Error(
    `The redesign line-item result exceeded ${MAX_LINE_ITEMS_PER_CATEGORY} items`,
  );
}

function toExecutionLineItem(
  item: z.infer<typeof BudgetLineItemSchema>,
  periodType: ReportPeriodInput["type"],
  multiplier: number,
): ExecutionLineItem {
  const anomaly =
    item.anomaly === "YTD_ANOMALY" || item.anomaly === "MISSING_LINE_ITEM"
      ? item.anomaly
      : undefined;
  const expenseType =
    item.expenseType === "dezvoltare" || item.expenseType === "functionare"
      ? item.expenseType
      : undefined;
  const ytdAmount = item.ytdAmount * multiplier;
  const quarterlyAmount = (item.quarterlyAmount ?? 0) * multiplier;
  const monthlyAmount = item.monthlyAmount * multiplier;
  const amount =
    periodType === "YEAR"
      ? ytdAmount
      : periodType === "QUARTER"
        ? quarterlyAmount
        : monthlyAmount;

  return {
    line_item_id: item.executionLineItemId,
    account_category: item.accountCategory === "EXPENSE" ? "ch" : "vn",
    funding_source_id: item.fundingSourceId,
    ...(expenseType ? { expense_type: expenseType } : {}),
    ...(anomaly ? { anomaly } : {}),
    functionalClassification: {
      functional_code: item.functionalCode,
      functional_name: item.functionalName ?? item.functionalCode,
    },
    economicClassification:
      item.economicCode === null
        ? null
        : {
            economic_code: item.economicCode,
            economic_name: item.economicName ?? item.economicCode,
          },
    ytd_amount: ytdAmount,
    quarterly_amount: quarterlyAmount,
    monthly_amount: monthlyAmount,
    amount,
  };
}

async function fetchLineItemNormalizationMultiplier(params: {
  readonly cui: string;
  readonly reportPeriod: ReportPeriodInput;
  readonly reportType: BudgetReportType;
  readonly normalization: BudgetNormalization;
}): Promise<number> {
  if (params.normalization === "TOTAL") return 1;

  const bounds = periodYearBounds(params.reportPeriod);
  const raw = await graphqlQuery<unknown>(
    LINE_ITEM_NORMALIZATION_QUERY,
    {
      cui: params.cui,
      reportType: params.reportType,
      frequency: params.reportPeriod.type,
      yearFrom: bounds.yearFrom,
      yearTo: bounds.yearTo,
      normalization: params.normalization,
    },
    { operationName: "entity-line-item-normalization", auth: "none" },
  );
  const response = LineItemNormalizationResponseSchema.parse(raw);
  const expenseTotal = latestAmount(
    groupSeriesPoints(response.totalExpense),
    params.reportPeriod,
  );
  const expenseNormalized = latestAmount(
    groupSeriesPoints(response.normalizedExpense),
    params.reportPeriod,
  );
  if (
    expenseTotal !== null &&
    expenseTotal !== 0 &&
    expenseNormalized !== null
  ) {
    return expenseNormalized / expenseTotal;
  }

  const incomeTotal = latestAmount(
    groupSeriesPoints(response.totalIncome),
    params.reportPeriod,
  );
  const incomeNormalized = latestAmount(
    groupSeriesPoints(response.normalizedIncome),
    params.reportPeriod,
  );
  if (incomeTotal !== null && incomeTotal !== 0 && incomeNormalized !== null) {
    return incomeNormalized / incomeTotal;
  }
  return 1;
}

export async function fetchRedesignEntityExecutionLineItems(
  params: {
    readonly cui: string;
    readonly reportPeriod: ReportPeriodInput;
    readonly reportType?: GqlReportType;
    readonly mainCreditorCui?: string;
  } & NormalizationOptions,
): Promise<{
  nodes: ExecutionLineItem[];
  fundingSources: FundingSourceOption[];
}> {
  const normalization = toBudgetNormalization(params);
  const reportType = toBudgetReportType(params.reportType);
  const [expenses, income, multiplier] = await Promise.all([
    fetchLineItemCategory({
      cui: params.cui,
      reportPeriod: params.reportPeriod,
      reportType,
      accountCategory: "EXPENSE",
      ...(params.mainCreditorCui
        ? { mainCreditorCui: params.mainCreditorCui }
        : {}),
    }),
    fetchLineItemCategory({
      cui: params.cui,
      reportPeriod: params.reportPeriod,
      reportType,
      accountCategory: "INCOME",
      ...(params.mainCreditorCui
        ? { mainCreditorCui: params.mainCreditorCui }
        : {}),
    }),
    fetchLineItemNormalizationMultiplier({
      cui: params.cui,
      reportPeriod: params.reportPeriod,
      reportType,
      normalization,
    }),
  ]);
  const rawItems = [...expenses, ...income];
  const fundingSourceMap = new Map<number, string>();
  for (const item of rawItems) {
    fundingSourceMap.set(
      item.fundingSourceId,
      item.fundingSource ?? String(item.fundingSourceId),
    );
  }
  const fundingSources = [...fundingSourceMap.entries()].map(
    ([sourceId, description]) => ({
      source_id: String(sourceId),
      source_description: description,
    }),
  );

  return {
    nodes: rawItems.map((item) =>
      toExecutionLineItem(item, params.reportPeriod.type, multiplier),
    ),
    fundingSources,
  };
}
