import type {
  PnrrAggregates,
  PnrrBeneficiaryPayment,
  PnrrBeneficiarySortBy,
  PnrrGranularity,
  PnrrOfficialIndicators,
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

export type PnrrWorkerMeta = {
  readonly projectCount: number
  readonly projectRecordCount: number
  readonly source: 'worker'
  readonly paymentSource: 'worker'
  readonly indicatorSource: 'worker'
  readonly beneficiaryPaymentCount: number
  readonly officialAllocatedTotalEur: number | null
  readonly officialPaidTotalEur: number | null
  readonly paidBeneficiaryCount: number | null
}

export type PnrrWorkerQueryPayload = {
  readonly search?: Partial<PnrrSearchState>
  readonly mapSeriesId?: PnrrMapSeriesId
}

export type PnrrWorkerProjectRow = Omit<PnrrProject, 'records' | 'primaryRecord'>

export type PnrrWorkerRankedItem = {
  readonly id: string
  readonly itemKey?: string
  readonly label: string
  readonly prefix?: string
  readonly valueEur: number
  readonly count: number
  readonly pct: number
  readonly color?: string
  readonly secondaryValueEur?: number
}

export type PnrrWorkerHistogramBucket = {
  readonly label: string
  readonly count: number
  readonly value: number
  readonly color: string
}

export type PnrrWorkerHistogramMetric = {
  readonly data: readonly PnrrWorkerHistogramBucket[]
  readonly countCoveragePercent: number
  readonly valueCoveragePercent: number
  readonly validCount: number
  readonly validValue: number
  readonly totalRecordCount: number
  readonly totalValue: number
}

export type PnrrWorkerMapSeries = {
  readonly id: PnrrMapSeriesId
  readonly data:
    | readonly HeatmapCountyDataPoint[]
    | readonly HeatmapUATDataPoint[]
  readonly min: number
  readonly max: number
}

export type PnrrWorkerMapSelectionSummary = {
  readonly projectCount: number
  readonly totalValue: number
  readonly anomalyCount: number
  readonly dataQualityCount: number
}

export type PnrrWorkerMapModel = {
  readonly seriesId: PnrrMapSeriesId
  readonly granularity: PnrrGranularity
  readonly series: PnrrWorkerMapSeries
  readonly nationalCount: number
  readonly unmappedCount: number
  readonly uatProjectCount: number
  readonly selectedUat:
    | {
        readonly name: string
        readonly county: string
        readonly natcode: string
      }
    | null
  readonly selectedCountySummary?: PnrrWorkerMapSelectionSummary | null
  readonly selectedUatSummary?: PnrrWorkerMapSelectionSummary | null
  readonly selectedCountyProjects: readonly PnrrWorkerProjectRow[]
  readonly selectedUatProjects: readonly PnrrWorkerProjectRow[]
}

export type PnrrWorkerProjectPage = {
  readonly rows: readonly PnrrWorkerProjectRow[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly totalPages: number
  readonly sortBy: PnrrProjectSortBy
  readonly sortOrder: 'asc' | 'desc'
}

export type PnrrWorkerBeneficiaryRow = {
  readonly name: string
  readonly cui: string | null
  readonly count: number
  readonly value: number
  readonly techProgressAvg: number | null
  readonly finProgressAvg: number | null
  readonly primaryComponentCode: string
  readonly extraComponentCount: number
}

export type PnrrWorkerBeneficiaryPage = {
  readonly rows: readonly PnrrWorkerBeneficiaryRow[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly totalPages: number
  readonly sortBy: PnrrBeneficiarySortBy
  readonly sortOrder: 'asc' | 'desc'
}

export type PnrrWorkerBeneficiaryDetail = PnrrWorkerBeneficiaryRow & {
  readonly projects: readonly PnrrWorkerProjectRow[]
  readonly componentValues: readonly { readonly code: string; readonly value: number }[]
}

export type PnrrWorkerAnomalyModel = {
  readonly riskCount: number
  readonly riskValue: number
  readonly dataQualityCount: number
  readonly dataQualityValue: number
  readonly rows: readonly PnrrWorkerProjectRow[]
  readonly totalCount: number
}

export type PnrrWorkerFilterFacets = {
  readonly components: readonly string[]
  readonly counties: readonly string[]
  readonly uats: readonly {
    readonly value: string
    readonly label: string
    readonly description: string
    readonly searchText: string
  }[]
  readonly measures: readonly string[]
  readonly cris: readonly string[]
}

export type PnrrWorkerOverviewModel = {
  readonly aggregates: PnrrAggregates
  readonly topComponents: readonly PnrrWorkerRankedItem[]
  readonly topCounties: readonly PnrrWorkerRankedItem[]
  readonly topBeneficiaries: readonly PnrrWorkerRankedItem[]
  readonly projectPreviewRows: readonly PnrrWorkerProjectRow[]
  readonly emblematicProjectRows: readonly PnrrWorkerProjectRow[]
  readonly histogram: {
    readonly tech: PnrrWorkerHistogramMetric
    readonly fin: PnrrWorkerHistogramMetric
    readonly gap: PnrrWorkerHistogramMetric
  }
  readonly mapPreview: PnrrWorkerMapModel
}

export type PnrrWorkerQueryResult = {
  readonly overview: PnrrWorkerOverviewModel
  readonly projectPage: PnrrWorkerProjectPage
  readonly beneficiaryPage: PnrrWorkerBeneficiaryPage
  readonly anomalyModel: PnrrWorkerAnomalyModel
  readonly mapModel: PnrrWorkerMapModel
  readonly filterFacets: PnrrWorkerFilterFacets
  readonly meta: PnrrWorkerMeta
}

export type PnrrWorkerProjectResult = {
  readonly project: PnrrProject | null
}

export type PnrrWorkerBeneficiaryResult = {
  readonly beneficiary: PnrrWorkerBeneficiaryDetail | null
}

export type PnrrWorkerCsvResult = {
  readonly csv: string
}

export type PnrrWorkerRequest =
  | {
      readonly id: number
      readonly type: 'query'
      readonly payload: PnrrWorkerQueryPayload
    }
  | {
      readonly id: number
      readonly type: 'getProject'
      readonly payload: { readonly projectId: string }
    }
  | {
      readonly id: number
      readonly type: 'getBeneficiary'
      readonly payload: {
        readonly key?: string | null
        readonly cui?: string | null
        readonly search?: Partial<PnrrSearchState>
      }
    }
  | {
      readonly id: number
      readonly type: 'exportCsv'
      readonly payload: {
        readonly search?: Partial<PnrrSearchState>
      }
    }

export type PnrrWorkerResponse =
  | {
      readonly id: number
      readonly type: 'query'
      readonly payload: PnrrWorkerQueryResult
    }
  | {
      readonly id: number
      readonly type: 'getProject'
      readonly payload: PnrrWorkerProjectResult
    }
  | {
      readonly id: number
      readonly type: 'getBeneficiary'
      readonly payload: PnrrWorkerBeneficiaryResult
    }
  | {
      readonly id: number
      readonly type: 'exportCsv'
      readonly payload: PnrrWorkerCsvResult
    }
  | {
      readonly id: number
      readonly type: 'error'
      readonly error: string
    }

export type PnrrWorkerModel = {
  readonly projects: readonly PnrrProject[]
  readonly records: readonly PnrrProjectRecord[]
  readonly beneficiaryPayments: readonly PnrrBeneficiaryPayment[]
  readonly indicators: PnrrOfficialIndicators | null
  readonly projectCount: number
  readonly projectRecordCount: number
}
