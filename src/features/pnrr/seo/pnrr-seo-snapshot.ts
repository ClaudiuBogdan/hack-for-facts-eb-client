import type { PnrrOfficialIndicators, PnrrProject, PnrrSearchState } from '@/schemas/pnrr'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import {
  computeAggregates,
  filterProjectsBySearch,
  processPnrrData,
} from '../lib/data-transform'
import type { PnrrSeoListItem, PnrrSeoSnapshot } from './pnrr-seo'

/*
 * The SEO snapshot built from the dataset: server-side only (the snapshot
 * loader and the share image import it on demand). It needs the whole data
 * transform, so it lives apart from `pnrr-seo.ts`, which the /pnrr route
 * file imports for its head and search key: every page carried the
 * transform, its CSV tables and the component definitions (2026-10-27
 * audit, PERF-003).
 */

function toFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function sortSeoItems(
  items: readonly PnrrSeoListItem[],
): readonly PnrrSeoListItem[] {
  return [...items].sort((a, b) => b.listedFundingRon - a.listedFundingRon)
}

export function buildPnrrSeoSnapshotFromRawProjects(params: {
  readonly rawProjects: readonly unknown[]
  readonly search?: Partial<PnrrSearchState>
  readonly officialIndicators?: PnrrOfficialIndicators | null
}): PnrrSeoSnapshot {
  const { projects } = processPnrrData(params.rawProjects)
  return buildPnrrSeoSnapshotFromProjects({
    projects,
    search: params.search,
    officialIndicators: params.officialIndicators,
  })
}

export function buildPnrrSeoSnapshotFromProjects(params: {
  readonly projects: readonly PnrrProject[]
  readonly search?: Partial<PnrrSearchState>
  readonly officialIndicators?: PnrrOfficialIndicators | null
}): PnrrSeoSnapshot {
  const { projects } = params
  const filteredProjects = filterProjectsBySearch(projects, params.search ?? {})
  const aggregates = computeAggregates(filteredProjects)
  const anomalyCount = Object.values(aggregates.anomalyCounts).reduce(
    (sum, item) => sum + item.count,
    0,
  )
  const dataQualitySignalCount = Object.values(
    aggregates.dataQualitySignalCounts,
  ).reduce((sum, item) => sum + item.count, 0)

  return {
    lastUpdated: null,
    projectCount: aggregates.projectCount,
    projectRecordCount: aggregates.projectRecordCount,
    deduplicatedProjectCount: aggregates.deduplicatedProjectCount,
    listedFundingTotalRon: toFiniteNumber(aggregates.rawTotalValue),
    deduplicatedListedFundingRon: toFiniteNumber(
      aggregates.deduplicatedTotalValue,
    ),
    completedCount: aggregates.completedCount,
    completedListedFundingRon: toFiniteNumber(aggregates.completedValue),
    inProgressCount: aggregates.inProgressCount,
    notStartedCount: aggregates.notStartedCount,
    loanListedFundingRon: toFiniteNumber(aggregates.loanTotal),
    loanPercent: toFiniteNumber(aggregates.loanPercent),
    missingFinancialProgressCount: aggregates.missingFinProgressCount,
    missingFinancialProgressPercent: toFiniteNumber(
      aggregates.missingFinProgressPercent,
    ),
    anomalyCount,
    dataQualitySignalCount,
    topComponents: sortSeoItems(
      Object.entries(aggregates.componentStats).map(([code, stats]) => ({
        id: code,
        label: PNRR_COMPONENTS[code]?.nameRo ?? code,
        count: stats.count,
        listedFundingRon: toFiniteNumber(stats.value),
      })),
    ).slice(0, 5),
    topCounties: sortSeoItems(
      Object.entries(aggregates.countyStats).map(([county, stats]) => ({
        id: county,
        label: county,
        count: stats.count,
        listedFundingRon: toFiniteNumber(stats.value),
      })),
    ).slice(0, 5),
    topBeneficiaries: aggregates.topBeneficiaries.slice(0, 5).map((item) => ({
      id: item.cui ?? item.beneficiary,
      label: item.beneficiary,
      count: item.count,
      listedFundingRon: toFiniteNumber(item.value),
    })),
    officialAllocatedTotalEur:
      params.officialIndicators?.allocatedTotalEur ?? null,
    officialPaidTotalEur: params.officialIndicators?.paidTotalEur ?? null,
    paidBeneficiaryCount:
      params.officialIndicators?.paidBeneficiaryCount ?? null,
  }
}
