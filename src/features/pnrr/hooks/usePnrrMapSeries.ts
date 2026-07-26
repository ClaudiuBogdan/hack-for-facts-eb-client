import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import type { PnrrProject, PnrrProjectRecord } from '@/schemas/pnrr'
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'
import { COUNTY_NAME_TO_MNEMONIC } from '../lib/county-mnemonics'
import { flattenPnrrProjectRecords, getProjectIdentity } from '../lib/data-transform'
import countyPopulations from '../data/ins-county-population.json'
import { UAT_POPULATIONS } from '../lib/uat-populations'

export type PnrrMapSeriesId =
  | 'total-value'
  | 'project-count'
  | 'per-capita'
  | 'grant-share'
  | 'implementation-rate'

export type PnrrMapGranularity = 'county' | 'uat'

export interface PnrrMapSeries {
  readonly id: PnrrMapSeriesId
  readonly label: string
  readonly unit: string
  readonly currency?: 'RON'
  readonly isPercent?: boolean
  readonly data:
    | readonly HeatmapCountyDataPoint[]
    | readonly HeatmapUATDataPoint[]
  readonly min: number
  readonly max: number
}

const POPULATION_MAP: Record<string, number> = countyPopulations as Record<
  string,
  number
>

function getTechnicalProgressValue(
  progress: PnrrProjectRecord['techProgress'],
): number | null {
  return typeof progress === 'number' ? progress : null
}

type ProjectProgressAccumulator = Map<string, { sum: number; count: number }>

function addProjectProgress(
  accumulator: ProjectProgressAccumulator,
  projectId: string,
  value: number | null,
): void {
  if (value === null) return
  const existing = accumulator.get(projectId)
  if (existing) {
    existing.sum += value
    existing.count++
    return
  }
  accumulator.set(projectId, { sum: value, count: 1 })
}

function getProjectWeightedProgress(
  accumulator: ProjectProgressAccumulator,
): number | null {
  if (accumulator.size === 0) return null
  const projectMeans = [...accumulator.values()].map(
    ({ sum, count }) => sum / count,
  )
  return (
    projectMeans.reduce((sum, progress) => sum + progress, 0) /
    projectMeans.length
  )
}

function computeCountySeries(
  projects: readonly PnrrProjectRecord[],
  seriesId: PnrrMapSeriesId,
): PnrrMapSeries {
  const countyProjects = projects.filter((p) => p.county !== 'Național')

  const agg = new Map<
    string,
    {
      countyName: string
      mnemonic: string
      totalValue: number
      projectIds: Set<string>
      grantValue: number
      totalValueForShare: number
      techProgressByProject: ProjectProgressAccumulator
    }
  >()

  for (const p of countyProjects) {
    const mnemonic = COUNTY_NAME_TO_MNEMONIC[p.county]
    if (!mnemonic) continue

    const projectId = getProjectIdentity(p)
    const techProgress = getTechnicalProgressValue(p.techProgress)
    const existing = agg.get(mnemonic)
    if (existing) {
      existing.totalValue += p.listedFundingRon
      existing.projectIds.add(projectId)
      if (p.fundingSource === 'grant') existing.grantValue += p.listedFundingRon
      existing.totalValueForShare += p.listedFundingRon
      addProjectProgress(existing.techProgressByProject, projectId, techProgress)
    } else {
      agg.set(mnemonic, {
        countyName: p.county,
        mnemonic,
        totalValue: p.listedFundingRon,
        projectIds: new Set([projectId]),
        grantValue: p.fundingSource === 'grant' ? p.listedFundingRon : 0,
        totalValueForShare: p.listedFundingRon,
        techProgressByProject: new Map(),
      })
      addProjectProgress(
        agg.get(mnemonic)!.techProgressByProject,
        projectId,
        techProgress,
      )
    }
  }

  const data: HeatmapCountyDataPoint[] = []
  for (const entry of agg.values()) {
    const population = POPULATION_MAP[entry.countyName] ?? null
    const implementationRate = getProjectWeightedProgress(
      entry.techProgressByProject,
    )
    if (
      (seriesId === 'per-capita' && (!population || population <= 0)) ||
      (seriesId === 'implementation-rate' && implementationRate === null)
    ) {
      continue
    }

    let amount = 0
    switch (seriesId) {
      case 'total-value':
        amount = entry.totalValue
        break
      case 'project-count':
        amount = entry.projectIds.size
        break
      case 'per-capita':
        amount = entry.totalValue / population!
        break
      case 'grant-share':
        amount =
          entry.totalValueForShare > 0
            ? (entry.grantValue / entry.totalValueForShare) * 100
            : 0
        break
      case 'implementation-rate':
        amount = implementationRate!
        break
    }

    data.push({
      county_code: entry.mnemonic,
      county_name: entry.countyName,
      county_population: population ?? 0,
      amount,
      total_amount: entry.totalValue,
      per_capita_amount:
        population && population > 0 ? entry.totalValue / population : 0,
      county_entity: { cui: '', name: entry.countyName },
    })
  }

  data.sort((a, b) => b.amount - a.amount)

  const amounts = data.map((d) => d.amount)
  const min = amounts.length > 0 ? amounts.reduce((a, b) => Math.min(a, b)) : 0
  const max = amounts.length > 0 ? amounts.reduce((a, b) => Math.max(a, b)) : 0

  return makeSeriesMeta(seriesId, data, min, max)
}

function computeUatSeries(
  projects: readonly PnrrProjectRecord[],
  seriesId: PnrrMapSeriesId,
): PnrrMapSeries {
  // Only projects with a resolved SIRUTA code
  const uatProjects = projects.filter((p) => p.sirutaCode !== null)

  const agg = new Map<
    string,
    {
      sirutaCode: string
      totalValue: number
      projectIds: Set<string>
      grantValue: number
      totalValueForShare: number
      techProgressByProject: ProjectProgressAccumulator
    }
  >()

  for (const p of uatProjects) {
    const siruta = p.sirutaCode!
    const projectId = getProjectIdentity(p)
    const techProgress = getTechnicalProgressValue(p.techProgress)
    const existing = agg.get(siruta)
    if (existing) {
      existing.totalValue += p.listedFundingRon
      existing.projectIds.add(projectId)
      if (p.fundingSource === 'grant') existing.grantValue += p.listedFundingRon
      existing.totalValueForShare += p.listedFundingRon
      addProjectProgress(existing.techProgressByProject, projectId, techProgress)
    } else {
      agg.set(siruta, {
        sirutaCode: siruta,
        totalValue: p.listedFundingRon,
        projectIds: new Set([projectId]),
        grantValue: p.fundingSource === 'grant' ? p.listedFundingRon : 0,
        totalValueForShare: p.listedFundingRon,
        techProgressByProject: new Map(),
      })
      addProjectProgress(
        agg.get(siruta)!.techProgressByProject,
        projectId,
        techProgress,
      )
    }
  }

  const data: HeatmapUATDataPoint[] = []
  for (const entry of agg.values()) {
    const population = UAT_POPULATIONS[entry.sirutaCode] ?? null
    const implementationRate = getProjectWeightedProgress(
      entry.techProgressByProject,
    )
    if (
      (seriesId === 'per-capita' && (!population || population <= 0)) ||
      (seriesId === 'implementation-rate' && implementationRate === null)
    ) {
      continue
    }

    let amount = 0
    switch (seriesId) {
      case 'total-value':
        amount = entry.totalValue
        break
      case 'project-count':
        amount = entry.projectIds.size
        break
      case 'per-capita':
        amount = entry.totalValue / population!
        break
      case 'grant-share':
        amount =
          entry.totalValueForShare > 0
            ? (entry.grantValue / entry.totalValueForShare) * 100
            : 0
        break
      case 'implementation-rate':
        amount = implementationRate!
        break
    }

    data.push({
      uat_id: entry.sirutaCode,
      uat_code: entry.sirutaCode,
      uat_name: '', // Not needed for map rendering; tooltip uses GeoJSON name
      siruta_code: entry.sirutaCode,
      county_code: '',
      county_name: '',
      population: population ?? 0,
      amount,
      total_amount: entry.totalValue,
      per_capita_amount:
        population && population > 0 ? entry.totalValue / population : 0,
    })
  }

  data.sort((a, b) => b.amount - a.amount)

  const amounts = data.map((d) => d.amount)
  const min = amounts.length > 0 ? amounts.reduce((a, b) => Math.min(a, b)) : 0
  const max = amounts.length > 0 ? amounts.reduce((a, b) => Math.max(a, b)) : 0

  return makeSeriesMeta(seriesId, data, min, max)
}

function makeSeriesMeta(
  seriesId: PnrrMapSeriesId,
  data: HeatmapCountyDataPoint[] | HeatmapUATDataPoint[],
  min: number,
  max: number,
): PnrrMapSeries {
  const labels: Record<PnrrMapSeriesId, string> = {
    'total-value': t`Listed project value`,
    'project-count': t`Project count`,
    'per-capita': t`Per capita`,
    'grant-share': t`Grant %`,
    'implementation-rate': t`Implemented %`,
  }

  const units: Record<PnrrMapSeriesId, string> = {
    'total-value': 'RON',
    'project-count': 'projects',
    'per-capita': 'RON / capita',
    'grant-share': '%',
    'implementation-rate': '%',
  }

  return {
    id: seriesId,
    label: labels[seriesId],
    unit: units[seriesId],
    currency:
      seriesId === 'total-value' || seriesId === 'per-capita'
        ? 'RON'
        : undefined,
    isPercent: seriesId === 'grant-share' || seriesId === 'implementation-rate',
    data,
    min,
    max,
  }
}

export function usePnrrMapSeries(
  projects: readonly PnrrProject[],
  activeSeriesId: PnrrMapSeriesId,
  granularity: PnrrMapGranularity,
): PnrrMapSeries {
  return useMemo(() => {
    const records = flattenPnrrProjectRecords(projects)
    if (granularity === 'uat') {
      return computeUatSeries(records, activeSeriesId)
    }
    return computeCountySeries(records, activeSeriesId)
  }, [projects, activeSeriesId, granularity])
}
