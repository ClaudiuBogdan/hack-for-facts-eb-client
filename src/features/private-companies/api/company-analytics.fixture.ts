import {
  COMPANY_ANALYSIS_METRICS,
  COMPANY_ANALYSIS_POPULATION_POLICY_VERSION,
  COMPANY_ANALYSIS_SCHEMA_VERSION,
  companyMetricKind,
  companyMetricUnit,
  type CompanyAnalysisBreakdown,
  type CompanyAnalysisBucket,
  type CompanyAnalysisCoverage,
  type CompanyAnalysisMetric,
  type CompanyAnalysisMetricAggregate,
  type CompanyAnalysisRecord,
  type CompanyAnalysisRecords,
  type CompanyAnalysisRelease,
  type CompanyAnalysisReleaseRef,
  type CompanyAnalysisSeries,
  type CompanyAnalysisSource,
  type CompanyAnalysisStats,
} from '@/schemas/company-analytics'

/**
 * Answers shaped as the companies analytics API returns them (server
 * `analytics-types.ts`, schema v2), hand-declared for the client's tests —
 * never derived from source rows: release 7 exported from ONRC edition 41
 * (publication 3, published 2026-09-30), fiscal years 2008–2025, FY2025
 * partial (fewer statements than FY2024), net result offered from 2019, a
 * turnover sum past 2^53, an explicit zero and a null; a county breakdown
 * with a basis group beside the value groups and an empty unknown slot;
 * records with their bases, coverages and recorded dates (the 0001-01-01
 * boundary is a type case, not a claim about any company).
 */

/** The eight-key source pin of release 7: ONRC edition 41. */
export const SOURCE_EDITION_41: CompanyAnalysisSource = {
  editionId: '41',
  publicationEpoch: '3',
  sourceSnapshotId: 'onrc-2026-09-30',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-edition-v1',
  privacyPolicyVersion: 'onrc-privacy-v1',
  dimensionPolicyVersion: 'onrc-dimensions-v1',
  eligibilityPolicyVersion: 'public-legal-person-v1',
}

/** A release reference as every answer carries it. */
export function releaseRef(releaseId = '7', overrides: Partial<CompanyAnalysisReleaseRef> = {}): CompanyAnalysisReleaseRef {
  return { releaseId, publishedAt: '2026-10-02T12:00:00Z', active: true, source: SOURCE_EDITION_41, ...overrides }
}

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
    release: releaseRef(),
    publicationId: '3',
    schemaVersion: COMPANY_ANALYSIS_SCHEMA_VERSION,
    populationPolicyVersion: COMPANY_ANALYSIS_POPULATION_POLICY_VERSION,
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
    dimensions: [
      { dimension: 'COUNTY', yearScoped: false, labelSource: 'territory_hub' },
      { dimension: 'OBSERVED_STATUS', yearScoped: false, labelSource: 'api_nomenclature' },
      { dimension: 'MAIN_CAEN', yearScoped: false, labelSource: 'current_db_catalog' },
    ],
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

const answerBase = { release: releaseRef(), scope: { fiscalYear: 2024 }, scopeHash: 'h', fiscalYear: 2024, caveats: [] }

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

export function bucket(kind: CompanyAnalysisBucket['kind'], key: string | null, sum: string | null, extra: Partial<CompanyAnalysisBucket> = {}): CompanyAnalysisBucket {
  return { kind, key, label: null, labelSource: null, basis: null, caen: null, groups: 1, companies: '10', filers: '5', metric: aggregate('TURNOVER', sum, sum === null ? '0' : '5'), ...extra }
}

/**
 * A county breakdown: two value groups, the companies whose entries name
 * different counties as a basis group of its own (an explicit 0.00 sum, not
 * a null), one group folded into „other", and the unknown slot the API keeps
 * empty. 10 + 10 + 10 + 10 + 0 = 40 companies; 700 + 200 + 0 + 100 = 1000.
 */
export function breakdownFixture(overrides: Partial<CompanyAnalysisBreakdown> = {}): CompanyAnalysisBreakdown {
  return {
    ...answerBase,
    dimension: 'COUNTY',
    metric: 'TURNOVER',
    groupCount: 4,
    rankBy: 'METRIC_SUM',
    rankedBy: 'METRIC_SUM',
    topN: 3,
    groups: [
      bucket('GROUP', 'B', '700.00', { label: 'București', labelSource: 'territory_hub' }),
      bucket('GROUP', 'CJ', '200.00', { label: 'Cluj', labelSource: 'territory_hub' }),
      bucket('GROUP', '(multiple_values)', '0.00', { basis: 'MULTIPLE_VALUES' }),
    ],
    other: bucket('OTHER', null, '100.00', { groups: 1 }),
    unknown: bucket('UNKNOWN', null, null, { groups: 0, companies: '0', filers: '0' }),
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

/** A company with a consensus on every field: Cluj, Cluj-Napoca, a single 1048 observation, recorded 2010-03-15. */
export function recordNode(cui: string, value: string | null, status: 'REPORTED' | 'HELD_QUALITY' | null, filed = true, overrides: Partial<CompanyAnalysisRecord> = {}): CompanyAnalysisRecord {
  return {
    cui,
    currentName: `Firma ${cui}`,
    legalForm: 'SRL',
    legalFormBasis: 'SINGLE_OBSERVATION',
    county: { code: 'CJ', label: 'Cluj', labelSource: 'territory_hub' },
    countyBasis: 'CONSISTENT_OBSERVATIONS',
    uat: { code: '54975', label: 'Cluj-Napoca', labelSource: 'territory_hub' },
    uatBasis: 'CONSISTENT_OBSERVATIONS',
    observedStatus: { code: '1048', label: 'funcțiune', labelSource: 'api_nomenclature' },
    observedStatusBasis: 'SINGLE_OBSERVATION',
    observedStatusCoverage: 'COMPLETE',
    onrcCaenCoverage: 'COMPLETE',
    onrcRecordedDate: '2010-03-15',
    onrcRecordedYear: 2010,
    onrcRecordedDateBasis: 'SINGLE_OBSERVATION',
    vatPayer: 'YES',
    fiscallyInactive: 'UNKNOWN',
    mainCaen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN', label: null },
    filed,
    employeeSizeBand: filed ? 'FROM_1_TO_9' : null,
    values: [{ metric: 'TURNOVER', value, status }],
    ...overrides,
  }
}

export function recordsFixture(overrides: Partial<CompanyAnalysisRecords> = {}): CompanyAnalysisRecords {
  return {
    ...answerBase,
    sort: 'METRIC',
    sortMetric: 'TURNOVER',
    direction: 'DESC',
    totalCount: '30',
    edges: [
      { cursor: 'c1', node: recordNode('1', '-1250.50', 'REPORTED') },
      // Entries in two counties (no consensus), an incomplete status evidence, the 0001-01-01 boundary date.
      {
        cursor: 'c2',
        node: recordNode('2', null, 'HELD_QUALITY', true, {
          county: null,
          countyBasis: 'MULTIPLE_VALUES',
          uat: null,
          uatBasis: 'MULTIPLE_VALUES',
          observedStatus: null,
          observedStatusBasis: 'PARTIAL_OBSERVATIONS',
          observedStatusCoverage: 'PARTIAL',
          onrcCaenCoverage: 'PARTIAL',
          onrcRecordedDate: '0001-01-01',
          onrcRecordedYear: 1,
        }),
      },
      { cursor: 'c3', node: recordNode('3', null, null, false, { currentName: null, onrcRecordedDate: null, onrcRecordedYear: null, onrcRecordedDateBasis: 'MISSING' }) },
    ],
    pageInfo: { hasNextPage: true, endCursor: 'c3' },
    ...overrides,
  }
}
