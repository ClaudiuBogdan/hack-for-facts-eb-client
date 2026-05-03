import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'
import { COUNTY_NAME_TO_MNEMONIC } from '../lib/county-mnemonics'
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
  readonly currency?: 'EUR'
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
  progress: PnrrProject['techProgress'],
): number | null {
  if (typeof progress === 'number') return progress
  if (progress === 'in-implementation') return 15
  return null
}

function computeCountySeries(
  projects: readonly PnrrProject[],
  seriesId: PnrrMapSeriesId,
): PnrrMapSeries {
  const countyProjects = projects.filter((p) => p.county !== 'Național')

  const agg = new Map<
    string,
    {
      countyName: string
      mnemonic: string
      totalValue: number
      projectCount: number
      grantValue: number
      totalValueForShare: number
      techProgressSum: number
      techProgressCount: number
    }
  >()

  for (const p of countyProjects) {
    const mnemonic = COUNTY_NAME_TO_MNEMONIC[p.county]
    if (!mnemonic) continue

    const techProgress = getTechnicalProgressValue(p.techProgress)
    const existing = agg.get(mnemonic)
    if (existing) {
      existing.totalValue += p.valueEur
      existing.projectCount += 1
      if (p.fundingSource === 'grant') existing.grantValue += p.valueEur
      existing.totalValueForShare += p.valueEur
      if (techProgress !== null) {
        existing.techProgressSum += techProgress
        existing.techProgressCount += 1
      }
    } else {
      agg.set(mnemonic, {
        countyName: p.county,
        mnemonic,
        totalValue: p.valueEur,
        projectCount: 1,
        grantValue: p.fundingSource === 'grant' ? p.valueEur : 0,
        totalValueForShare: p.valueEur,
        techProgressSum: techProgress ?? 0,
        techProgressCount: techProgress === null ? 0 : 1,
      })
    }
  }

  const data: HeatmapCountyDataPoint[] = []
  for (const entry of agg.values()) {
    const population = POPULATION_MAP[entry.countyName] ?? 1

    let amount = 0
    switch (seriesId) {
      case 'total-value':
        amount = entry.totalValue
        break
      case 'project-count':
        amount = entry.projectCount
        break
      case 'per-capita':
        amount = population > 0 ? entry.totalValue / population : 0
        break
      case 'grant-share':
        amount =
          entry.totalValueForShare > 0
            ? (entry.grantValue / entry.totalValueForShare) * 100
            : 0
        break
      case 'implementation-rate':
        amount =
          entry.techProgressCount > 0
            ? entry.techProgressSum / entry.techProgressCount
            : 0
        break
    }

    data.push({
      county_code: entry.mnemonic,
      county_name: entry.countyName,
      county_population: population,
      amount,
      total_amount: entry.totalValue,
      per_capita_amount: population > 0 ? entry.totalValue / population : 0,
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
  projects: readonly PnrrProject[],
  seriesId: PnrrMapSeriesId,
): PnrrMapSeries {
  // Only projects with a resolved SIRUTA code
  const uatProjects = projects.filter((p) => p.sirutaCode !== null)

  const agg = new Map<
    string,
    {
      sirutaCode: string
      totalValue: number
      projectCount: number
      grantValue: number
      totalValueForShare: number
      techProgressSum: number
      techProgressCount: number
    }
  >()

  for (const p of uatProjects) {
    const siruta = p.sirutaCode!
    const techProgress = getTechnicalProgressValue(p.techProgress)
    const existing = agg.get(siruta)
    if (existing) {
      existing.totalValue += p.valueEur
      existing.projectCount += 1
      if (p.fundingSource === 'grant') existing.grantValue += p.valueEur
      existing.totalValueForShare += p.valueEur
      if (techProgress !== null) {
        existing.techProgressSum += techProgress
        existing.techProgressCount += 1
      }
    } else {
      agg.set(siruta, {
        sirutaCode: siruta,
        totalValue: p.valueEur,
        projectCount: 1,
        grantValue: p.fundingSource === 'grant' ? p.valueEur : 0,
        totalValueForShare: p.valueEur,
        techProgressSum: techProgress ?? 0,
        techProgressCount: techProgress === null ? 0 : 1,
      })
    }
  }

  const data: HeatmapUATDataPoint[] = []
  for (const entry of agg.values()) {
    const population = UAT_POPULATIONS[entry.sirutaCode] ?? 1

    let amount = 0
    switch (seriesId) {
      case 'total-value':
        amount = entry.totalValue
        break
      case 'project-count':
        amount = entry.projectCount
        break
      case 'per-capita':
        amount = population > 0 ? entry.totalValue / population : 0
        break
      case 'grant-share':
        amount =
          entry.totalValueForShare > 0
            ? (entry.grantValue / entry.totalValueForShare) * 100
            : 0
        break
      case 'implementation-rate':
        amount =
          entry.techProgressCount > 0
            ? entry.techProgressSum / entry.techProgressCount
            : 0
        break
    }

    data.push({
      uat_id: entry.sirutaCode,
      uat_code: entry.sirutaCode,
      uat_name: '', // Not needed for map rendering; tooltip uses GeoJSON name
      siruta_code: entry.sirutaCode,
      county_code: '',
      county_name: '',
      population,
      amount,
      total_amount: entry.totalValue,
      per_capita_amount: population > 0 ? entry.totalValue / population : 0,
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
    'total-value': t`Total value`,
    'project-count': t`Project count`,
    'per-capita': t`Per capita`,
    'grant-share': t`Grant %`,
    'implementation-rate': t`Implemented %`,
  }

  const units: Record<PnrrMapSeriesId, string> = {
    'total-value': 'EUR',
    'project-count': 'projects',
    'per-capita': 'EUR / capita',
    'grant-share': '%',
    'implementation-rate': '%',
  }

  return {
    id: seriesId,
    label: labels[seriesId],
    unit: units[seriesId],
    currency:
      seriesId === 'total-value' || seriesId === 'per-capita'
        ? 'EUR'
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
    if (granularity === 'uat') {
      return computeUatSeries(projects, activeSeriesId)
    }
    return computeCountySeries(projects, activeSeriesId)
  }, [projects, activeSeriesId, granularity])
}
