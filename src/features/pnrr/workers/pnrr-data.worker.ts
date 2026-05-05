import {
  computeAggregates,
  filterProjectsBySearch,
  flattenPnrrProjectRecords,
  getProjectIdentity,
  groupPnrrProjects,
  processPnrrBeneficiaryPayments,
  processPnrrData,
  processPnrrOfficialIndicators,
} from '../lib/data-transform'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import {
  EMBLEMATIC_PROJECTS,
  projectMatchesEmblematicConfig,
} from '../data/emblematic-projects'
import { COUNTY_NAME_TO_MNEMONIC, MNEMONIC_TO_COUNTY_NAME } from '../lib/county-mnemonics'
import { getPnrrUatLabelsBySiruta } from '../lib/pnrr-uat-labels'
import countyPopulations from '../data/ins-county-population.json'
import { UAT_POPULATIONS } from '../lib/uat-populations'
import type {
  AnomalyType,
  DataQualitySignalType,
  PnrrBeneficiarySortBy,
  PnrrGranularity,
  PnrrProject,
  PnrrProjectRecord,
  PnrrProjectSortBy,
  PnrrSearchState,
} from '@/schemas/pnrr'
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'
import type { PnrrMapSeriesId } from '../hooks/usePnrrMapSeries'
import type {
  PnrrWorkerAnomalyModel,
  PnrrWorkerBeneficiaryDetail,
  PnrrWorkerBeneficiaryPage,
  PnrrWorkerBeneficiaryRow,
  PnrrWorkerCsvResult,
  PnrrWorkerFilterFacets,
  PnrrWorkerHistogramMetric,
  PnrrWorkerMapModel,
  PnrrWorkerMapSelectionSummary,
  PnrrWorkerMapSeries,
  PnrrWorkerModel,
  PnrrWorkerOverviewModel,
  PnrrWorkerProjectPage,
  PnrrWorkerProjectRow,
  PnrrWorkerQueryPayload,
  PnrrWorkerQueryResult,
  PnrrWorkerRankedItem,
  PnrrWorkerRequest,
  PnrrWorkerResponse,
} from './pnrr-worker-types'

const PROJECT_PAGE_SIZE_DEFAULT = 25
const BENEFICIARY_PAGE_SIZE = 25
const MAP_DETAIL_LIMIT = 100
const POPULATION_MAP: Record<string, number> = countyPopulations as Record<
  string,
  number
>

const GAP_BUCKETS = [
  { min: -Infinity, max: -50, label: '< -50%', color: '#991b1b' },
  { min: -50, max: -20, label: '-50% -> -20%', color: '#ef4444' },
  { min: -20, max: 0, label: '-20% -> 0%', color: '#f59e0b' },
  { min: 0, max: 20, label: '0% -> 20%', color: '#6f6f6f' },
  { min: 20, max: 50, label: '20% -> 50%', color: '#3b82f6' },
  { min: 50, max: 100, label: '50% -> 100%', color: '#1d4ed8' },
  { min: 100, max: Infinity, label: '> 100%', color: '#16a34a' },
] as const

const PROGRESS_BUCKETS = [
  { min: 0, max: 10, label: '0% -> 10%', color: '#6f6f6f' },
  { min: 10, max: 25, label: '10% -> 25%', color: '#d97706' },
  { min: 25, max: 50, label: '25% -> 50%', color: '#f59e0b' },
  { min: 50, max: 75, label: '50% -> 75%', color: '#3b82f6' },
  { min: 75, max: 90, label: '75% -> 90%', color: '#1d4ed8' },
  { min: 90, max: 100, label: '90% -> 100%', color: '#b6ff00' },
  { min: 100, max: Infinity, label: '> 100%', color: '#16a34a' },
] as const

type BeneficiarySummaryInternal = {
  readonly name: string
  readonly cui: string | null
  count: number
  readonly projectIds: Set<string>
  value: number
  techProgressSum: number
  techProgressCount: number
  finProgressSum: number
  finProgressCount: number
  readonly componentValues: Map<string, number>
  readonly projects: PnrrProject[]
}

let modelPromise: Promise<PnrrWorkerModel> | null = null
const filteredProjectsCache = new Map<string, readonly PnrrProject[]>()

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`)
  }
  return response.json()
}

async function loadModel(): Promise<PnrrWorkerModel> {
  if (!modelPromise) {
    modelPromise = Promise.all([
      fetchJson('/api/pnrr/raw/projects'),
      fetchJson('/api/pnrr/raw/payments'),
      fetchJson('/api/pnrr/raw/indicators'),
    ])
      .then(([rawProjects, rawPayments, rawIndicators]) => {
        const projectRows = Array.isArray(rawProjects) ? rawProjects : []
        const processed = processPnrrData(projectRows)
        const beneficiaryPayments = processPnrrBeneficiaryPayments(
          Array.isArray(rawPayments) ? rawPayments : [],
        )
        const indicators = processPnrrOfficialIndicators(rawIndicators)

        return {
          projects: processed.projects,
          records: processed.projectRecords,
          beneficiaryPayments,
          indicators,
          projectCount: processed.meta.projectCount,
          projectRecordCount: processed.meta.projectRecordCount,
        }
      })
      .catch((error) => {
        modelPromise = null
        throw error
      })
  }

  return modelPromise
}

function stableSearchKey(search: Partial<PnrrSearchState> = {}): string {
  return JSON.stringify(
    Object.entries(search)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

function getFilteredProjects(
  model: PnrrWorkerModel,
  search: Partial<PnrrSearchState> = {},
): readonly PnrrProject[] {
  const key = stableSearchKey({
    ...search,
    page: undefined,
    pageSize: undefined,
    sortBy: undefined,
    sortOrder: undefined,
    beneficiaryPage: undefined,
    beneficiarySortBy: undefined,
    beneficiarySortOrder: undefined,
    panel: undefined,
    panelProjectId: undefined,
    panelBeneficiaryCui: undefined,
    panelCountyCode: undefined,
    panelUatSiruta: undefined,
    mapLat: undefined,
    mapLng: undefined,
    mapZoom: undefined,
    currency: undefined,
    view: undefined,
  })
  const cached = filteredProjectsCache.get(key)
  if (cached) return cached

  const filtered = filterProjectsBySearch(model.projects, search)
  filteredProjectsCache.set(key, filtered)
  if (filteredProjectsCache.size > 40) {
    const firstKey = filteredProjectsCache.keys().next().value
    if (firstKey) filteredProjectsCache.delete(firstKey)
  }
  return filtered
}

function projectToRow(project: PnrrProject): PnrrWorkerProjectRow {
  const { records: _records, primaryRecord: _primaryRecord, ...row } = project
  return row
}

function getProgressValue(
  progress: PnrrProject['techProgress'] | PnrrProject['finProgress'],
): number | null {
  if (typeof progress === 'number') return progress
  if (progress === 'in-implementation') return 15
  return null
}

function getProjectValue(project: PnrrProject): number {
  return project.totalValueEur ?? project.valueEur
}

function sortProjects(
  projects: readonly PnrrProject[],
  sortBy: PnrrProjectSortBy,
  sortOrder: 'asc' | 'desc',
): readonly PnrrProject[] {
  return [...projects].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'value':
        cmp = getProjectValue(a) - getProjectValue(b)
        break
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
      case 'techProgress':
        cmp = (getProgressValue(a.techProgress) ?? -1) -
          (getProgressValue(b.techProgress) ?? -1)
        break
      case 'finProgress':
        cmp = (getProgressValue(a.finProgress) ?? -1) -
          (getProgressValue(b.finProgress) ?? -1)
        break
      case 'county':
        cmp = a.county.localeCompare(b.county)
        break
      case 'beneficiary':
        cmp = a.beneficiary.localeCompare(b.beneficiary)
        break
      case 'component':
        cmp = a.componentCode.localeCompare(b.componentCode, 'ro', {
          numeric: true,
        })
        break
    }
    return sortOrder === 'asc' ? cmp : -cmp
  })
}

function buildProjectPage(
  projects: readonly PnrrProject[],
  search: Partial<PnrrSearchState>,
): PnrrWorkerProjectPage {
  const sortBy = search.sortBy ?? 'value'
  const sortOrder = search.sortOrder ?? 'desc'
  const pageSize = search.pageSize ?? PROJECT_PAGE_SIZE_DEFAULT
  const sorted = sortProjects(projects, sortBy, sortOrder)
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const start = (page - 1) * pageSize

  return {
    rows: sorted.slice(start, start + pageSize).map(projectToRow),
    totalCount: sorted.length,
    page,
    pageSize,
    totalPages,
    sortBy,
    sortOrder,
  }
}

function normalizeBeneficiaryCui(value: string | null): string | null {
  const normalized = value?.replace(/\D/g, '') ?? ''
  return normalized || null
}

function normalizeBeneficiaryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function getBeneficiaryKey(project: PnrrProject): string {
  return `${project.beneficiary}\u0000${project.cui ?? ''}`
}

function getPrimaryComponentCode(beneficiary: BeneficiarySummaryInternal): string {
  let primaryCode = ''
  let primaryValue = -1

  for (const [code, value] of beneficiary.componentValues) {
    if (
      value > primaryValue ||
      (value === primaryValue &&
        code.localeCompare(primaryCode, 'ro', { numeric: true }) < 0)
    ) {
      primaryCode = code
      primaryValue = value
    }
  }

  return primaryCode
}

function buildBeneficiarySummaries(
  projects: readonly PnrrProject[],
): readonly BeneficiarySummaryInternal[] {
  const map = new Map<string, BeneficiarySummaryInternal>()
  const records = flattenPnrrProjectRecords(projects)

  for (const p of records) {
    const beneficiaryKey = getBeneficiaryKey(p)
    const projectId = getProjectIdentity(p)
    const techProgress = getProgressValue(p.techProgress)
    const finProgress = getProgressValue(p.finProgress)
    const existing = map.get(beneficiaryKey)

    if (existing) {
      existing.projectIds.add(projectId)
      existing.count = existing.projectIds.size
      existing.value += p.valueEur
      if (techProgress !== null) {
        existing.techProgressSum += techProgress
        existing.techProgressCount++
      }
      if (finProgress !== null) {
        existing.finProgressSum += finProgress
        existing.finProgressCount++
      }
      existing.componentValues.set(
        p.componentCode,
        (existing.componentValues.get(p.componentCode) ?? 0) + p.valueEur,
      )
      existing.projects.push(p)
      continue
    }

    map.set(beneficiaryKey, {
      name: p.beneficiary,
      cui: p.cui,
      count: 1,
      projectIds: new Set([projectId]),
      value: p.valueEur,
      techProgressSum: techProgress ?? 0,
      techProgressCount: techProgress === null ? 0 : 1,
      finProgressSum: finProgress ?? 0,
      finProgressCount: finProgress === null ? 0 : 1,
      componentValues: new Map([[p.componentCode, p.valueEur]]),
      projects: [p],
    })
  }

  return Array.from(map.values())
}

function beneficiaryToRow(
  beneficiary: BeneficiarySummaryInternal,
): PnrrWorkerBeneficiaryRow {
  return {
    name: beneficiary.name,
    cui: beneficiary.cui,
    count: beneficiary.count,
    value: beneficiary.value,
    techProgressAvg: beneficiary.techProgressCount > 0
      ? beneficiary.techProgressSum / beneficiary.techProgressCount
      : null,
    finProgressAvg: beneficiary.finProgressCount > 0
      ? beneficiary.finProgressSum / beneficiary.finProgressCount
      : null,
    primaryComponentCode: getPrimaryComponentCode(beneficiary),
    extraComponentCount: Math.max(0, beneficiary.componentValues.size - 1),
  }
}

function sortBeneficiaries(
  beneficiaries: readonly BeneficiarySummaryInternal[],
  sortBy: PnrrBeneficiarySortBy,
  sortOrder: 'asc' | 'desc',
): readonly BeneficiarySummaryInternal[] {
  return [...beneficiaries].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'beneficiary':
        cmp = a.name.localeCompare(b.name)
        break
      case 'count':
        cmp = a.count - b.count
        break
      case 'value':
        cmp = a.value - b.value
        break
      case 'component':
        cmp = getPrimaryComponentCode(a).localeCompare(
          getPrimaryComponentCode(b),
          'ro',
          { numeric: true },
        )
        break
      case 'techProgress':
        cmp = (a.techProgressCount > 0 ? a.techProgressSum / a.techProgressCount : -1) -
          (b.techProgressCount > 0 ? b.techProgressSum / b.techProgressCount : -1)
        break
      case 'finProgress':
        cmp = (a.finProgressCount > 0 ? a.finProgressSum / a.finProgressCount : -1) -
          (b.finProgressCount > 0 ? b.finProgressSum / b.finProgressCount : -1)
        break
    }
    return sortOrder === 'asc' ? cmp : -cmp
  })
}

function buildBeneficiaryPage(
  projects: readonly PnrrProject[],
  search: Partial<PnrrSearchState>,
): PnrrWorkerBeneficiaryPage {
  const sortBy = search.beneficiarySortBy ?? 'value'
  const sortOrder = search.beneficiarySortOrder ?? 'desc'
  const pageSize = BENEFICIARY_PAGE_SIZE
  const sorted = sortBeneficiaries(
    buildBeneficiarySummaries(projects),
    sortBy,
    sortOrder,
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(1, search.beneficiaryPage ?? 1), totalPages)
  const start = (page - 1) * pageSize

  return {
    rows: sorted.slice(start, start + pageSize).map(beneficiaryToRow),
    totalCount: sorted.length,
    page,
    pageSize,
    totalPages,
    sortBy,
    sortOrder,
  }
}

function findBeneficiaryDetail(
  projects: readonly PnrrProject[],
  selector: {
    readonly key?: string | null
    readonly cui?: string | null
  },
): PnrrWorkerBeneficiaryDetail | null {
  const normalizedCui = normalizeBeneficiaryCui(selector.cui ?? null)
  const beneficiary = buildBeneficiarySummaries(projects).find((item) => {
    if (selector.key && `${item.name}\u0000${item.cui ?? ''}` === selector.key) {
      return true
    }
    return Boolean(
      normalizedCui &&
        normalizeBeneficiaryCui(item.cui) === normalizedCui,
    )
  })
  if (!beneficiary) return null

  const groupedProjects = groupPnrrProjects(beneficiary.projects)
  return {
    ...beneficiaryToRow(beneficiary),
    projects: sortProjects(groupedProjects, 'value', 'desc')
      .slice(0, 100)
      .map(projectToRow),
    componentValues: Array.from(beneficiary.componentValues.entries())
      .map(([code, value]) => ({ code, value }))
      .sort((a, b) => b.value - a.value),
  }
}

function buildTopComponents(
  aggregates: ReturnType<typeof computeAggregates>,
): readonly PnrrWorkerRankedItem[] {
  return Object.entries(aggregates.componentStats)
    .map(([code, stats]) => ({
      id: code,
      label: PNRR_COMPONENTS[code]?.nameRo ?? code,
      prefix: PNRR_COMPONENTS[code]?.code ?? code,
      valueEur: stats.value,
      count: stats.count,
      pct: aggregates.rawTotalValue > 0
        ? (stats.value / aggregates.rawTotalValue) * 100
        : 0,
      color: PNRR_COMPONENTS[code]?.color ?? '#94a3b8',
    }))
    .sort((a, b) => b.valueEur - a.valueEur)
}

function buildTopCounties(
  aggregates: ReturnType<typeof computeAggregates>,
): readonly PnrrWorkerRankedItem[] {
  return Object.entries(aggregates.countyStats)
    .map(([county, stats]) => ({
      id: county,
      label: county,
      valueEur: stats.value,
      count: stats.count,
      pct: aggregates.rawTotalValue > 0
        ? (stats.value / aggregates.rawTotalValue) * 100
        : 0,
    }))
    .sort((a, b) => b.valueEur - a.valueEur)
}

export function buildTopBeneficiaries(
  model: PnrrWorkerModel,
  projects: readonly PnrrProject[],
  aggregates: ReturnType<typeof computeAggregates>,
): readonly PnrrWorkerRankedItem[] {
  const projectBeneficiaries = [...buildBeneficiarySummaries(projects)]
    .sort((a, b) => b.value - a.value)
  const projectBeneficiariesByCui = new Map<string, BeneficiarySummaryInternal>()
  const projectBeneficiariesByName = new Map<string, BeneficiarySummaryInternal>()

  for (const beneficiary of projectBeneficiaries) {
    const cui = normalizeBeneficiaryCui(beneficiary.cui)
    if (cui && !projectBeneficiariesByCui.has(cui)) {
      projectBeneficiariesByCui.set(cui, beneficiary)
    }
    const nameKey = normalizeBeneficiaryName(beneficiary.name)
    if (!projectBeneficiariesByName.has(nameKey)) {
      projectBeneficiariesByName.set(nameKey, beneficiary)
    }
  }

  if (model.beneficiaryPayments.length > 0) {
    const listedPaymentTotalEur = model.beneficiaryPayments.reduce(
      (sum, payment) => sum + payment.valueRon / 5,
      0,
    )
    const denominator = model.indicators?.paidTotalEur && model.indicators.paidTotalEur > 0
      ? model.indicators.paidTotalEur
      : listedPaymentTotalEur

    return model.beneficiaryPayments.slice(0, 100).map((payment) => {
      const cui = normalizeBeneficiaryCui(payment.cui)
      const projectBeneficiary =
        (cui ? projectBeneficiariesByCui.get(cui) : undefined) ??
        projectBeneficiariesByName.get(normalizeBeneficiaryName(payment.beneficiary))
      const valueEur = payment.valueRon / 5

      return {
        id: payment.beneficiary,
        itemKey: payment.id,
        label: payment.beneficiary,
        valueEur,
        count: projectBeneficiary?.count ?? 0,
        pct: denominator > 0 ? (valueEur / denominator) * 100 : 0,
        secondaryValueEur: projectBeneficiary?.value,
      }
    })
  }

  return projectBeneficiaries.slice(0, 100).map((beneficiary) => ({
    id: beneficiary.name,
    itemKey: `${beneficiary.name}\u0000${beneficiary.cui ?? ''}`,
    label: beneficiary.name,
    valueEur: beneficiary.value,
    count: beneficiary.count,
    pct: aggregates.rawTotalValue > 0
      ? (beneficiary.value / aggregates.rawTotalValue) * 100
      : 0,
  }))
}

function buildEmblematicRows(
  projects: readonly PnrrProject[],
): readonly PnrrWorkerProjectRow[] {
  const matched: PnrrProject[] = []

  for (const config of EMBLEMATIC_PROJECTS) {
    let bestMatch: PnrrProject | null = null

    for (const project of projects) {
      const projectComponentCodes = project.componentCodes ?? [project.componentCode]
      const isCandidate =
        projectComponentCodes.some((code) => config.componentCodes.includes(code)) &&
        projectMatchesEmblematicConfig(project.title, config)

      if (
        isCandidate &&
        (!bestMatch || getProjectValue(project) > getProjectValue(bestMatch))
      ) {
        bestMatch = project
      }
    }

    if (bestMatch) matched.push(bestMatch)
  }

  return matched.slice(0, 9).map(projectToRow)
}

function buildHistogramMetric(
  records: readonly PnrrProjectRecord[],
  metric: 'tech' | 'fin' | 'gap',
): PnrrWorkerHistogramMetric {
  const recordCount = records.length
  const totalValue = records.reduce((sum, p) => sum + p.valueEur, 0)

  if (metric === 'gap') {
    const valid = records.filter(
      (p) =>
        typeof p.techProgress === 'number' &&
        typeof p.finProgress === 'number',
    )
    const validValue = valid.reduce((sum, p) => sum + p.valueEur, 0)

    return {
      data: GAP_BUCKETS.map((bucket) => {
        const matches = valid.filter((p) => {
          const gap = (p.techProgress as number) - (p.finProgress as number)
          return gap >= bucket.min && gap < bucket.max
        })
        return {
          label: bucket.label,
          count: matches.length,
          value: matches.reduce((sum, p) => sum + p.valueEur, 0),
          color: bucket.color,
        }
      }),
      countCoveragePercent: recordCount > 0 ? (valid.length / recordCount) * 100 : 0,
      valueCoveragePercent: totalValue > 0 ? (validValue / totalValue) * 100 : 0,
      validCount: valid.length,
      validValue,
      totalRecordCount: recordCount,
      totalValue,
    }
  }

  const key = metric === 'tech' ? 'techProgress' : 'finProgress'
  const valid = records.filter((p) => typeof p[key] === 'number')
  const validValue = valid.reduce((sum, p) => sum + p.valueEur, 0)

  return {
    data: PROGRESS_BUCKETS.map((bucket) => {
      const matches = valid.filter((p) => {
        const value = p[key] as number
        return value >= bucket.min && value < bucket.max
      })
      return {
        label: bucket.label,
        count: matches.length,
        value: matches.reduce((sum, p) => sum + p.valueEur, 0),
        color: bucket.color,
      }
    }),
    countCoveragePercent: recordCount > 0 ? (valid.length / recordCount) * 100 : 0,
    valueCoveragePercent: totalValue > 0 ? (validValue / totalValue) * 100 : 0,
    validCount: valid.length,
    validValue,
    totalRecordCount: recordCount,
    totalValue,
  }
}

function buildHistogram(
  records: readonly PnrrProjectRecord[],
): PnrrWorkerOverviewModel['histogram'] {
  return {
    tech: buildHistogramMetric(records, 'tech'),
    fin: buildHistogramMetric(records, 'fin'),
    gap: buildHistogramMetric(records, 'gap'),
  }
}

function getTechnicalProgressValue(
  progress: PnrrProjectRecord['techProgress'],
): number | null {
  if (typeof progress === 'number') return progress
  if (progress === 'in-implementation') return 15
  return null
}

function countUniqueRecords(records: readonly PnrrProjectRecord[]): number {
  return new Set(records.map((record) => getProjectIdentity(record))).size
}

function buildMapSelectionSummary(
  projects: readonly PnrrProject[],
): PnrrWorkerMapSelectionSummary {
  const projectIds = new Set<string>()
  const anomalyProjectIds = new Set<string>()
  const dataQualityProjectIds = new Set<string>()
  let totalValue = 0

  for (const project of projects) {
    const projectId = getProjectIdentity(project)
    projectIds.add(projectId)
    totalValue += getProjectValue(project)

    if (project.anomalies.length > 0) {
      anomalyProjectIds.add(projectId)
    }
    if (project.dataQualitySignals.length > 0) {
      dataQualityProjectIds.add(projectId)
    }
  }

  return {
    projectCount: projectIds.size,
    totalValue,
    anomalyCount: anomalyProjectIds.size,
    dataQualityCount: dataQualityProjectIds.size,
  }
}

function buildMapSelection(
  records: readonly PnrrProjectRecord[],
): {
  readonly summary: PnrrWorkerMapSelectionSummary
  readonly projects: readonly PnrrWorkerProjectRow[]
} {
  const groupedProjects = sortProjects(groupPnrrProjects(records), 'value', 'desc')

  return {
    summary: buildMapSelectionSummary(groupedProjects),
    projects: groupedProjects.slice(0, MAP_DETAIL_LIMIT).map(projectToRow),
  }
}

function buildMapSeries(
  records: readonly PnrrProjectRecord[],
  seriesId: PnrrMapSeriesId,
  granularity: PnrrGranularity,
): PnrrWorkerMapSeries {
  if (granularity === 'uat') {
    return buildUatSeries(records, seriesId)
  }
  return buildCountySeries(records, seriesId)
}

function buildCountySeries(
  records: readonly PnrrProjectRecord[],
  seriesId: PnrrMapSeriesId,
): PnrrWorkerMapSeries {
  const agg = new Map<
    string,
    {
      countyName: string
      mnemonic: string
      totalValue: number
      projectIds: Set<string>
      grantValue: number
      totalValueForShare: number
      techProgressSum: number
      techProgressCount: number
    }
  >()

  for (const p of records) {
    if (p.county === 'Național') continue
    const mnemonic = COUNTY_NAME_TO_MNEMONIC[p.county]
    if (!mnemonic) continue
    const existing = agg.get(mnemonic)
    const techProgress = getTechnicalProgressValue(p.techProgress)

    if (existing) {
      existing.totalValue += p.valueEur
      existing.projectIds.add(getProjectIdentity(p))
      if (p.fundingSource === 'grant') existing.grantValue += p.valueEur
      existing.totalValueForShare += p.valueEur
      if (techProgress !== null) {
        existing.techProgressSum += techProgress
        existing.techProgressCount++
      }
      continue
    }

    agg.set(mnemonic, {
      countyName: p.county,
      mnemonic,
      totalValue: p.valueEur,
      projectIds: new Set([getProjectIdentity(p)]),
      grantValue: p.fundingSource === 'grant' ? p.valueEur : 0,
      totalValueForShare: p.valueEur,
      techProgressSum: techProgress ?? 0,
      techProgressCount: techProgress === null ? 0 : 1,
    })
  }

  const data: HeatmapCountyDataPoint[] = Array.from(agg.values()).map((entry) => {
    const population = POPULATION_MAP[entry.countyName] ?? 1
    let amount = entry.totalValue
    if (seriesId === 'project-count') amount = entry.projectIds.size
    if (seriesId === 'per-capita') amount = population > 0 ? entry.totalValue / population : 0
    if (seriesId === 'grant-share') {
      amount = entry.totalValueForShare > 0
        ? (entry.grantValue / entry.totalValueForShare) * 100
        : 0
    }
    if (seriesId === 'implementation-rate') {
      amount = entry.techProgressCount > 0
        ? entry.techProgressSum / entry.techProgressCount
        : 0
    }

    return {
      county_code: entry.mnemonic,
      county_name: entry.countyName,
      county_population: population,
      amount,
      total_amount: entry.totalValue,
      per_capita_amount: population > 0 ? entry.totalValue / population : 0,
      county_entity: { cui: '', name: entry.countyName },
    }
  }).sort((a, b) => b.amount - a.amount)

  return makeMapSeries(seriesId, data)
}

function buildUatSeries(
  records: readonly PnrrProjectRecord[],
  seriesId: PnrrMapSeriesId,
): PnrrWorkerMapSeries {
  const agg = new Map<
    string,
    {
      sirutaCode: string
      totalValue: number
      projectIds: Set<string>
      grantValue: number
      totalValueForShare: number
      techProgressSum: number
      techProgressCount: number
    }
  >()

  for (const p of records) {
    if (!p.sirutaCode) continue
    const existing = agg.get(p.sirutaCode)
    const techProgress = getTechnicalProgressValue(p.techProgress)

    if (existing) {
      existing.totalValue += p.valueEur
      existing.projectIds.add(getProjectIdentity(p))
      if (p.fundingSource === 'grant') existing.grantValue += p.valueEur
      existing.totalValueForShare += p.valueEur
      if (techProgress !== null) {
        existing.techProgressSum += techProgress
        existing.techProgressCount++
      }
      continue
    }

    agg.set(p.sirutaCode, {
      sirutaCode: p.sirutaCode,
      totalValue: p.valueEur,
      projectIds: new Set([getProjectIdentity(p)]),
      grantValue: p.fundingSource === 'grant' ? p.valueEur : 0,
      totalValueForShare: p.valueEur,
      techProgressSum: techProgress ?? 0,
      techProgressCount: techProgress === null ? 0 : 1,
    })
  }

  const data: HeatmapUATDataPoint[] = Array.from(agg.values()).map((entry) => {
    const population = UAT_POPULATIONS[entry.sirutaCode] ?? 1
    let amount = entry.totalValue
    if (seriesId === 'project-count') amount = entry.projectIds.size
    if (seriesId === 'per-capita') amount = population > 0 ? entry.totalValue / population : 0
    if (seriesId === 'grant-share') {
      amount = entry.totalValueForShare > 0
        ? (entry.grantValue / entry.totalValueForShare) * 100
        : 0
    }
    if (seriesId === 'implementation-rate') {
      amount = entry.techProgressCount > 0
        ? entry.techProgressSum / entry.techProgressCount
        : 0
    }

    return {
      uat_id: entry.sirutaCode,
      uat_code: entry.sirutaCode,
      uat_name: '',
      siruta_code: entry.sirutaCode,
      county_code: '',
      county_name: '',
      population,
      amount,
      total_amount: entry.totalValue,
      per_capita_amount: population > 0 ? entry.totalValue / population : 0,
    }
  }).sort((a, b) => b.amount - a.amount)

  return makeMapSeries(seriesId, data)
}

function makeMapSeries(
  seriesId: PnrrMapSeriesId,
  data: readonly HeatmapCountyDataPoint[] | readonly HeatmapUATDataPoint[],
): PnrrWorkerMapSeries {
  const amounts = data.map((point) => point.amount)
  return {
    id: seriesId,
    data,
    min: amounts.length > 0 ? amounts.reduce((a, b) => Math.min(a, b)) : 0,
    max: amounts.length > 0 ? amounts.reduce((a, b) => Math.max(a, b)) : 0,
  }
}

function buildMapModel(
  records: readonly PnrrProjectRecord[],
  search: Partial<PnrrSearchState>,
  seriesId: PnrrMapSeriesId,
  granularity: PnrrGranularity,
): PnrrWorkerMapModel {
  const selectedCounty = search.panel === 'map-county' && search.panelCountyCode
    ? (MNEMONIC_TO_COUNTY_NAME[search.panelCountyCode] ?? null)
    : null
  const selectedUatLabel = search.panel === 'map-uat' && search.panelUatSiruta
    ? getPnrrUatLabelsBySiruta().get(search.panelUatSiruta)
    : undefined
  const matchingUatRecord = search.panel === 'map-uat' && search.panelUatSiruta
    ? records.find((record) => record.sirutaCode === search.panelUatSiruta)
    : undefined
  const selectedUat =
    search.panel === 'map-uat' && search.panelUatSiruta
      ? {
          name: selectedUatLabel?.name ?? matchingUatRecord?.locality ?? search.panelUatSiruta,
          county: selectedUatLabel?.county ?? matchingUatRecord?.county ?? '',
          natcode: search.panelUatSiruta,
        }
      : null
  const selectedCountySelection = selectedCounty
    ? buildMapSelection(records.filter((record) => record.county === selectedCounty))
    : null
  const selectedUatSelection = selectedUat
    ? buildMapSelection(
        records.filter((record) => record.sirutaCode === selectedUat.natcode),
      )
    : null

  return {
    seriesId,
    granularity,
    series: buildMapSeries(records, seriesId, granularity),
    nationalCount: countUniqueRecords(
      records.filter((record) => record.county === 'Național'),
    ),
    unmappedCount: granularity === 'uat'
      ? countUniqueRecords(
          records.filter(
            (record) => record.sirutaCode === null && record.county !== 'Național',
          ),
        )
      : 0,
    uatProjectCount: new Set(
      records
        .filter((record) => record.sirutaCode !== null)
        .map((record) => getProjectIdentity(record)),
    ).size,
    selectedUat,
    selectedCountySummary: selectedCountySelection?.summary ?? null,
    selectedUatSummary: selectedUatSelection?.summary ?? null,
    selectedCountyProjects: selectedCountySelection?.projects ?? [],
    selectedUatProjects: selectedUatSelection?.projects ?? [],
  }
}

function buildFilterFacets(records: readonly PnrrProjectRecord[]): PnrrWorkerFilterFacets {
  const uats = new Map<string, { readonly name: string; readonly county: string }>()
  for (const record of records) {
    if (!record.sirutaCode || !record.locality || record.county === 'Național') continue
    const existing = uats.get(record.sirutaCode)
    if (!existing || record.locality.localeCompare(existing.name, 'ro') < 0) {
      uats.set(record.sirutaCode, { name: record.locality, county: record.county })
    }
  }

  return {
    components: Array.from(new Set(records.map((record) => record.componentCode))).sort(),
    counties: Array.from(new Set(records.map((record) => record.county))).sort(),
    uats: Array.from(uats.entries())
      .map(([siruta, uat]) => ({
        value: siruta,
        label: uat.name,
        description: uat.county,
        searchText: `${uat.name} ${siruta}`,
      }))
      .sort((a, b) => {
        const countyCompare = a.description.localeCompare(b.description, 'ro')
        return countyCompare || a.label.localeCompare(b.label, 'ro')
      }),
    measures: Array.from(
      new Set(
        records.map(
          (record) =>
            `${record.componentCode}.${record.measureCode}.${record.fundingSource === 'grant/loan' ? 'grant' : record.fundingSource}`,
        ),
      ),
    ).sort(),
    cris: Array.from(new Set(records.map((record) => record.cri))).sort(),
  }
}

function buildAnomalyModel(
  projects: readonly PnrrProject[],
  search: Partial<PnrrSearchState>,
): PnrrWorkerAnomalyModel {
  const riskProjects = projects.filter((project) => project.anomalies.length > 0)
  const dataQualityProjects = projects.filter(
    (project) => project.dataQualitySignals.length > 0,
  )
  const activeAnomalyTypes = search.anomalyTypes
  const activeDataQualitySignalTypes = search.dataQualitySignalTypes
  const hasRiskFilter = (activeAnomalyTypes?.length ?? 0) > 0
  const hasDataQualityFilter = (activeDataQualitySignalTypes?.length ?? 0) > 0
  const hasSignalFilter = hasRiskFilter || hasDataQualityFilter
  const displayed = projects.filter((project) => {
    if (!hasSignalFilter) {
      return project.anomalies.length > 0 || project.dataQualitySignals.length > 0
    }

    const matchesRisk =
      hasRiskFilter &&
      activeAnomalyTypes!.some((type) => project.anomalies.includes(type as AnomalyType))
    const matchesDataQuality =
      hasDataQualityFilter &&
      activeDataQualitySignalTypes!.some((type) =>
        project.dataQualitySignals.includes(type as DataQualitySignalType),
      )

    return matchesRisk || matchesDataQuality
  })

  return {
    riskCount: riskProjects.length,
    riskValue: riskProjects.reduce((sum, project) => sum + getProjectValue(project), 0),
    dataQualityCount: dataQualityProjects.length,
    dataQualityValue: dataQualityProjects.reduce(
      (sum, project) => sum + getProjectValue(project),
      0,
    ),
    rows: sortProjects(displayed, search.sortBy ?? 'value', search.sortOrder ?? 'desc')
      .slice(0, search.pageSize ?? PROJECT_PAGE_SIZE_DEFAULT)
      .map(projectToRow),
    totalCount: displayed.length,
  }
}

function buildOverview(
  model: PnrrWorkerModel,
  projects: readonly PnrrProject[],
  records: readonly PnrrProjectRecord[],
  aggregates: ReturnType<typeof computeAggregates>,
  search: Partial<PnrrSearchState>,
): PnrrWorkerOverviewModel {
  return {
    aggregates,
    topComponents: buildTopComponents(aggregates),
    topCounties: buildTopCounties(aggregates),
    topBeneficiaries: buildTopBeneficiaries(model, projects, aggregates),
    projectPreviewRows: sortProjects(projects, 'value', 'desc').slice(0, 8).map(projectToRow),
    emblematicProjectRows: buildEmblematicRows(projects),
    histogram: buildHistogram(records),
    mapPreview: buildMapModel(records, search, 'total-value', 'uat'),
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(projects: readonly PnrrProject[]): string {
  const headers = [
    'id_angajament',
    'record_count',
    'Title',
    'Beneficiary',
    'CUI',
    'County',
    'Locality',
    'Component',
    'Measure',
    'All components',
    'All measures',
    'All funding sources',
    'All counties',
    'CRI',
    'Funding source',
    'Value (EUR)',
    'Progres tehnic raportat',
    'Progres financiar raportat',
    'Semnale de risc',
    'Anomalii de date',
  ]
  const rows = sortProjects(projects, 'value', 'desc').map((project) => [
    project.engagementId ?? '',
    project.recordCount ?? project.records?.length ?? 1,
    project.title,
    project.beneficiary,
    project.cui ?? '',
    project.county,
    project.locality,
    project.componentCode,
    project.measureFullCode,
    (project.componentCodes ?? [project.componentCode]).join(' + '),
    (project.measureFullCodes ?? [project.measureFullCode]).join(' + '),
    (project.fundingSources ?? [project.fundingSource]).join(' + '),
    (project.counties ?? [project.county]).join(' + '),
    project.cri,
    project.fundingSource,
    project.totalValueEur ?? project.valueEur,
    project.techProgress === 'in-implementation' ? 'IN IMPLEMENTATION' : (project.techProgress ?? ''),
    project.finProgress === 'in-implementation' ? 'IN IMPLEMENTATION' : (project.finProgress ?? ''),
    project.anomalies.join(', '),
    project.dataQualitySignals.join(', '),
  ])

  return [
    headers.join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')),
  ].join('\n')
}

async function query(
  payload: PnrrWorkerQueryPayload,
): Promise<PnrrWorkerQueryResult> {
  const model = await loadModel()
  const search = payload.search ?? {}
  const projects = getFilteredProjects(model, search)
  const records = flattenPnrrProjectRecords(projects)
  const aggregates = computeAggregates(projects)
  const mapSeriesId = payload.mapSeriesId ?? 'total-value'
  const granularity = search.granularity === 'uat' ? 'uat' : 'county'

  return {
    overview: buildOverview(model, projects, records, aggregates, search),
    projectPage: buildProjectPage(projects, search),
    beneficiaryPage: buildBeneficiaryPage(projects, search),
    anomalyModel: buildAnomalyModel(projects, search),
    mapModel: buildMapModel(records, search, mapSeriesId, granularity),
    filterFacets: buildFilterFacets(model.records),
    meta: {
      projectCount: aggregates.projectCount,
      projectRecordCount: aggregates.projectRecordCount,
      source: 'worker',
      paymentSource: 'worker',
      indicatorSource: 'worker',
      beneficiaryPaymentCount: model.beneficiaryPayments.length,
      officialAllocatedTotalEur: model.indicators?.allocatedTotalEur ?? null,
      officialPaidTotalEur: model.indicators?.paidTotalEur ?? null,
      paidBeneficiaryCount: model.indicators?.paidBeneficiaryCount ?? null,
    },
  }
}

self.addEventListener('message', (event: MessageEvent<PnrrWorkerRequest>) => {
  const request = event.data

  void (async () => {
    try {
      if (request.type === 'query') {
        self.postMessage({
          id: request.id,
          type: 'query',
          payload: await query(request.payload),
        } satisfies PnrrWorkerResponse)
        return
      }

      if (request.type === 'getProject') {
        const model = await loadModel()
        self.postMessage({
          id: request.id,
          type: 'getProject',
          payload: {
            project:
              model.projects.find(
                (project) => project.id === request.payload.projectId,
              ) ?? null,
          },
        } satisfies PnrrWorkerResponse)
        return
      }

      if (request.type === 'getBeneficiary') {
        const model = await loadModel()
        const projects = getFilteredProjects(model, request.payload.search ?? {})
        self.postMessage({
          id: request.id,
          type: 'getBeneficiary',
          payload: {
            beneficiary: findBeneficiaryDetail(projects, request.payload),
          },
        } satisfies PnrrWorkerResponse)
        return
      }

      if (request.type === 'exportCsv') {
        const model = await loadModel()
        const projects = getFilteredProjects(model, request.payload.search ?? {})
        self.postMessage({
          id: request.id,
          type: 'exportCsv',
          payload: { csv: buildCsv(projects) } satisfies PnrrWorkerCsvResult,
        } satisfies PnrrWorkerResponse)
      }
    } catch (error) {
      self.postMessage({
        id: request.id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } satisfies PnrrWorkerResponse)
    }
  })()
})
