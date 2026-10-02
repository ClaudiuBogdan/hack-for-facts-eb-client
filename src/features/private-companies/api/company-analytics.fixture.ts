import {
  COMPANY_ANALYSIS_METRICS,
  companyMetricKind,
  companyMetricUnit,
  type CompanyAnalysisBreakdown,
  type CompanyAnalysisBucket,
  type CompanyAnalysisCoverage,
  type CompanyAnalysisMetric,
  type CompanyAnalysisMetricAggregate,
  type CompanyAnalysisRecords,
  type CompanyAnalysisRelease,
  type CompanyAnalysisSeries,
  type CompanyAnalysisStats,
} from '@/schemas/company-analytics'

/**
 * Answers shaped as the companies analytics API returns them (server
 * `analytics-types.ts`), for the client's tests: release 7 with fiscal years
 * 2008–2025, FY2025 partial (fewer statements than FY2024), net result
 * offered from 2019, a turnover sum past 2^53, an explicit zero and a null.
 */

export const FIRST_YEAR = 2008
export const LAST_YEAR = 2025
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index)

export function coverage(overrides: Partial<CompanyAnalysisCoverage> = {}): CompanyAnalysisCoverage {
  return { reported: '0', missing: '0', notAdmitted: '0', heldProfile: '0', heldObservation: '0', heldQuality: '0', heldComponent: '0', ...overrides }
}

export function aggregate(metric: CompanyAnalysisMetric, sum: string | null, contributors: string, cover: Partial<CompanyAnalysisCoverage> = {}): CompanyAnalysisMetricAggregate {
  return { metric, unit: companyMetricUnit(metric), kind: companyMetricKind(metric), sum, contributors, mean: sum, coverage: coverage({ reported: contributors, ...cover }) }
}

/** The years a metric is offered in: net result and the ANAF-only figures from 2019, the rest from 2008. */
function offeredYears(metric: CompanyAnalysisMetric): number[] {
  return metric === 'NET_RESULT' || metric === 'PATRIMONY_REGIE' ? YEARS.filter((year) => year >= 2019) : YEARS
}

export function releaseFixture(overrides: Partial<CompanyAnalysisRelease> = {}): CompanyAnalysisRelease {
  const statements = (year: number) => (year === LAST_YEAR ? '902043' : year === 2024 ? '965213' : '900000')
  return {
    release: { releaseId: '7', publishedAt: '2026-10-02T12:00:00Z', active: true },
    publicationId: '3',
    schemaVersion: 'companies-analytics-ch-v1',
    populationPolicyVersion: 'eligible-legal-persons-v1',
    admissionPolicyVersion: 'admission-v1',
    admissionPolicySha256: null,
    inputSnapshotAt: '2026-10-02T10:00:00Z',
    companies: '2718250',
    companyYears: '13666834',
    fiscalYears: YEARS,
    years: YEARS.map((year) => ({
      fiscalYear: year,
      statements: statements(year),
      metrics: COMPANY_ANALYSIS_METRICS.map((metric) => {
        const offered = offeredYears(metric).includes(year)
        return { metric, offered, coverage: offered ? coverage({ reported: '800000', missing: String(Number(statements(year)) - 800000) }) : coverage({ notAdmitted: statements(year) }) }
      }),
      sizeBands: [{ band: 'FROM_1_TO_9', statements: '500000' }],
    })),
    metrics: COMPANY_ANALYSIS_METRICS.map((metric) => ({ metric, unit: companyMetricUnit(metric), kind: companyMetricKind(metric), offeredYears: offeredYears(metric) })),
    dimensions: [],
    defaults: { fiscalYear: 2024, metric: 'TURNOVER', cohortMode: 'REFERENCE_YEAR', rankBy: 'METRIC_SUM', topN: 10, recordSort: 'METRIC', direction: 'DESC', pageSize: 25 },
    asOf: [{ kind: 'onrc', id: '2026-07', published: '2026-07-01', retrieved: '2026-07-03', rows: '4202022' }],
    nameFilter: false,
    limits: {
      maxSelectedCuis: 500,
      maxCounties: 60,
      maxUats: 500,
      maxLegalForms: 30,
      maxObservedStatuses: 60,
      maxCaenCodes: 200,
      maxFinancialRanges: 6,
      maxMetrics: 21,
      maxRecordMetrics: 8,
      defaultTopN: 10,
      maxTopN: 100,
      defaultPageSize: 25,
      maxPageSize: 100,
    },
    caveats: [],
    ...overrides,
  }
}

const answerBase = { release: { releaseId: '7', publishedAt: '2026-10-02T12:00:00Z', active: true }, scope: { fiscalYear: 2024 }, scopeHash: 'h', fiscalYear: 2024, caveats: [] }

export function statsFixture(overrides: Partial<CompanyAnalysisStats> = {}): CompanyAnalysisStats {
  return {
    ...answerBase,
    companies: '2718250',
    filers: '965213',
    nonFilers: '1753037',
    metrics: [
      aggregate('TURNOVER', '9007199254741973.32', '900000', { missing: '60000', heldProfile: '4000', heldObservation: '1000', heldQuality: '213' }),
      aggregate('EMPLOYEES', null, '0', { missing: '965213' }),
      aggregate('NET_RESULT', '0.00', '3', { missing: '965210' }),
    ],
    ...overrides,
  }
}

function bucket(kind: CompanyAnalysisBucket['kind'], key: string | null, sum: string | null, extra: Partial<CompanyAnalysisBucket> = {}): CompanyAnalysisBucket {
  return { kind, key, label: null, caen: null, groups: 1, companies: '10', filers: '5', metric: aggregate('TURNOVER', sum, sum === null ? '0' : '5'), ...extra }
}

export function breakdownFixture(overrides: Partial<CompanyAnalysisBreakdown> = {}): CompanyAnalysisBreakdown {
  return {
    ...answerBase,
    dimension: 'COUNTY',
    metric: 'TURNOVER',
    groupCount: 3,
    rankBy: 'METRIC_SUM',
    rankedBy: 'METRIC_SUM',
    topN: 2,
    groups: [bucket('GROUP', 'B', '700.00', { label: 'București' }), bucket('GROUP', 'CJ', '200.00', { label: 'Cluj' })],
    other: bucket('OTHER', null, '100.00', { groups: 1 }),
    unknown: bucket('UNKNOWN', null, null),
    totals: bucket('TOTAL', null, '1000.00', { groups: 4, companies: '40', filers: '20' }),
    ...overrides,
  }
}

export function seriesFixture(overrides: Partial<CompanyAnalysisSeries> = {}): CompanyAnalysisSeries {
  return {
    ...answerBase,
    metric: 'TURNOVER',
    unit: 'RON',
    kind: 'FLOW',
    cohortMode: 'EACH_YEAR',
    referenceYear: null,
    cohortCompanies: null,
    fromYear: 2008,
    toYear: 2011,
    points: [
      { fiscalYear: 2008, available: true, gapReason: null, companies: '100', filers: '80', metric: aggregate('TURNOVER', '9007199254741973.32', '70') },
      { fiscalYear: 2009, available: false, gapReason: 'NOT_ADMITTED', companies: '100', filers: '80', metric: aggregate('TURNOVER', null, '0', { notAdmitted: '80' }) },
      { fiscalYear: 2010, available: true, gapReason: null, companies: '100', filers: '80', metric: aggregate('TURNOVER', '0.00', '2') },
      { fiscalYear: 2011, available: true, gapReason: null, companies: '100', filers: '80', metric: aggregate('TURNOVER', null, '0', { missing: '80' }) },
    ],
    ...overrides,
  }
}

export function recordsFixture(overrides: Partial<CompanyAnalysisRecords> = {}): CompanyAnalysisRecords {
  const node = (cui: string, value: string | null, status: 'REPORTED' | 'HELD_QUALITY' | null, filed = true) => ({
    cui,
    currentName: cui === '3' ? null : `Firma ${cui}`,
    legalForm: 'SRL',
    county: { code: 'CJ', label: 'Cluj' },
    uat: { code: '54975', label: 'Cluj-Napoca' },
    observedStatus: { code: '1048', label: 'funcțiune' },
    vatPayer: 'YES' as const,
    fiscallyInactive: 'UNKNOWN' as const,
    mainCaen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN' as const, label: null },
    registrationYear: 2010,
    filed,
    employeeSizeBand: filed ? ('FROM_1_TO_9' as const) : null,
    values: [{ metric: 'TURNOVER' as const, value, status }],
  })
  return {
    ...answerBase,
    sort: 'METRIC',
    sortMetric: 'TURNOVER',
    direction: 'DESC',
    totalCount: '30',
    edges: [
      { cursor: 'c1', node: node('1', '-1250.50', 'REPORTED') },
      { cursor: 'c2', node: node('2', null, 'HELD_QUALITY') },
      { cursor: 'c3', node: node('3', null, null, false) },
    ],
    pageInfo: { hasNextPage: true, endCursor: 'c3' },
    ...overrides,
  }
}
