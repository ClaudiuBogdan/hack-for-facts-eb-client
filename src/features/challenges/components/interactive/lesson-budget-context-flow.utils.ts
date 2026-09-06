import { compareMapDecimals, mapDecimalToRenderNumber } from '@/lib/map-series/decimal'
import type { GeoJsonObject, FeatureCollection, Geometry } from 'geojson'
import bbox from '@turf/bbox'
import center from '@turf/center'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults'
import type { QuizOption } from '@/features/learning/components/assessment/Quiz'
import type { UatFeature, UatProperties } from '@/components/maps/interfaces'
import type {
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableSeriesColumn,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-types'
import {
  createDefaultAdvancedMapAnalyticsSeries,
  parseAdvancedMapAnalyticsUrlState,
  type AdvancedMapAnalyticsUrlState,
  type MapSupportedSeries,
} from '@/schemas/advanced-map-analytics'
import { toReportTypeValue } from '@/schemas/reporting'
import { shuffleArray } from '@/lib/utils'

export type BudgetContextMapSeriesId =
  | 'lesson-expenses-total'
  | 'lesson-income-total'
  | 'lesson-income-per-capita'
  | 'lesson-expenses-per-capita'

export type BudgetContextMapOption = {
  readonly id: BudgetContextMapSeriesId
  readonly label: {
    readonly ro: string
    readonly en: string
  }
  readonly description: {
    readonly ro: string
    readonly en: string
  }
}

export type BudgetContextLeaderboardRow = AdvancedMapAnalyticsTableRow & {
  readonly value: number
  readonly rank: number
}

export const BUDGET_CONTEXT_MAP_OPTIONS = [
  {
    id: 'lesson-expenses-per-capita',
    label: {
      ro: 'Cheltuieli per capita 2025',
      en: 'Spending per capita 2025',
    },
    description: {
      ro: 'Cheltuielile raportate la populația rezidentă.',
      en: 'Spending normalized by resident population.',
    },
  },
  {
    id: 'lesson-income-per-capita',
    label: {
      ro: 'Venituri per capita 2025',
      en: 'Income per capita 2025',
    },
    description: {
      ro: 'Veniturile raportate la populația rezidentă.',
      en: 'Income normalized by resident population.',
    },
  },
  {
    id: 'lesson-expenses-total',
    label: {
      ro: 'Cheltuieli totale 2025',
      en: 'Total expenses 2025',
    },
    description: {
      ro: 'Cheltuielile totale raportate pentru UAT-urile din județul selectat.',
      en: 'Total reported spending for UATs in the selected county.',
    },
  },
  {
    id: 'lesson-income-total',
    label: {
      ro: 'Venituri totale 2025',
      en: 'Total income 2025',
    },
    description: {
      ro: 'Toate veniturile raportate pentru UAT-urile din județul selectat.',
      en: 'All reported income for UATs in the selected county.',
    },
  },
] as const satisfies readonly BudgetContextMapOption[]

const BUDGET_CONTEXT_BINS_PRESET_ID = 'lesson-budget-context-bins'
const DEFAULT_COUNTY_MAP_CENTER: [number, number] = [45.92365, 25.0035]
const DEFAULT_COUNTY_MAP_ZOOM = 8.2
const MIN_FEATURE_BBOX_DELTA = 1e-6
const MAX_COUNTY_PREVIEW_ZOOM = 10.8

function getEntityCuiFromUatProperties(properties: UatProperties | undefined): string | undefined {
  if (!properties) {
    return undefined
  }

  const rawCandidates = [
    properties.cui,
    properties.uat_code,
    properties.uatCode,
    properties.entity_cui,
    properties.entityCui,
  ]

  for (const candidate of rawCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate)
    }
  }

  return undefined
}

export function buildBudgetContextCountySeries(countyCode: string): MapSupportedSeries[] {
  const normalizedCountyCode = countyCode.trim().toUpperCase()

  const buildExecutionSeries = (params: {
    readonly id: BudgetContextMapSeriesId
    readonly label: string
    readonly accountCategory: 'ch' | 'vn'
    readonly normalization: 'total' | 'per_capita'
    readonly excludeEconomicPrefixes?: readonly string[]
  }) => {
    const series = createDefaultAdvancedMapAnalyticsSeries(
      'line-items-aggregated-yearly',
    ) as Extract<MapSupportedSeries, { type: 'line-items-aggregated-yearly' }>

    series.id = params.id
    series.label = params.label
    series.filter = {
      ...series.filter,
      account_category: params.accountCategory,
      report_type: toReportTypeValue('PRINCIPAL_AGGREGATED'),
      report_period: {
        type: 'YEAR',
        selection: {
          interval: {
            start: '2025',
            end: '2025',
          },
        },
      },
      normalization: params.normalization,
      currency: 'RON',
      inflation_adjusted: false,
      is_uat: true,
      county_codes: [normalizedCountyCode],
      exclude: params.excludeEconomicPrefixes
        ? {
            economic_prefixes: [...params.excludeEconomicPrefixes],
          }
        : undefined,
    }

    return series
  }

  return [
    buildExecutionSeries({
      id: 'lesson-income-total',
      label: 'Venituri totale',
      accountCategory: 'vn',
      normalization: 'total',
    }),
    buildExecutionSeries({
      id: 'lesson-expenses-total',
      label: 'Cheltuieli totale',
      accountCategory: 'ch',
      normalization: 'total',
      excludeEconomicPrefixes: DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
    }),
    buildExecutionSeries({
      id: 'lesson-income-per-capita',
      label: 'Venituri per capita',
      accountCategory: 'vn',
      normalization: 'per_capita',
    }),
    buildExecutionSeries({
      id: 'lesson-expenses-per-capita',
      label: 'Cheltuieli per capita',
      accountCategory: 'ch',
      normalization: 'per_capita',
      excludeEconomicPrefixes: DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
    }),
  ]
}

export function createBudgetContextMapState(params: {
  readonly locale: 'ro' | 'en'
  readonly countyName?: string | null
  readonly activeSeriesId: BudgetContextMapSeriesId
  readonly series: readonly MapSupportedSeries[]
  readonly mapCenter?: [number, number]
  readonly mapZoom?: number
}): AdvancedMapAnalyticsUrlState {
  const activeOption =
    BUDGET_CONTEXT_MAP_OPTIONS.find((option) => option.id === params.activeSeriesId) ??
    BUDGET_CONTEXT_MAP_OPTIONS[0]

  const countySuffix = params.countyName?.trim()
    ? params.locale === 'en'
      ? ` - ${params.countyName.trim()} County`
      : ` - Județul ${params.countyName.trim()}`
    : ''

  const baseTitle =
    params.locale === 'en'
      ? 'County budget context'
      : 'Context bugetar în județ'

  return parseAdvancedMapAnalyticsUrlState({
    mapName: `${baseTitle}${countySuffix} · ${activeOption.label[params.locale]}`,
    activeView: 'map',
    activeSeriesId: params.activeSeriesId,
    activeBinPresetId: BUDGET_CONTEXT_BINS_PRESET_ID,
    mapCenter: params.mapCenter ?? DEFAULT_COUNTY_MAP_CENTER,
    mapZoom: params.mapZoom ?? DEFAULT_COUNTY_MAP_ZOOM,
    binsPresets: [
      {
        id: BUDGET_CONTEXT_BINS_PRESET_ID,
        label:
          params.locale === 'en'
            ? 'County gradient'
            : 'Gradient județean',
        config: {
          bins: [],
          scale: 'sequential',
          title: activeOption.label[params.locale],
          noData: {
            color: '#cccccc',
            label: params.locale === 'en' ? 'No data' : 'Fără date',
            showInTooltip: true,
          },
          gradient: {
            startColor: '#fff49e',
            endColor: '#ff1900',
          },
          colorMode: 'gradient',
          boundaries: {
            minInclusive: true,
            maxExclusive: true,
          },
          defaultBinCount: 5,
          showBinLabelOnLegend: true,
          intervalMode: 'continuous',
          continuousPercentiles: {
            min: 5,
            max: 95,
          },
        },
        createdAt: '2026-03-12T00:00:00.000Z',
        updatedAt: '2026-03-12T00:00:00.000Z',
      },
    ],
    series: [...params.series],
  })
}

export function buildBudgetContextCountyViewport(params: {
  readonly geoJsonData: GeoJsonObject | undefined
  readonly countyCode: string | null | undefined
}): { readonly mapCenter: [number, number]; readonly mapZoom: number } | null {
  const normalizedCountyCode = params.countyCode?.trim().toUpperCase()
  if (!normalizedCountyCode || params.geoJsonData?.type !== 'FeatureCollection') {
    return null
  }

  const featureCollection = params.geoJsonData as FeatureCollection
  const countyFeature = featureCollection.features.find(
    (feature) =>
      String(feature.properties?.mnemonic ?? '').trim().toUpperCase() === normalizedCountyCode,
  )

  if (!countyFeature) {
    return null
  }

  const featureBounds = bbox(countyFeature)
  const featureCenter = center(countyFeature)
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = featureBounds
  const longitudeDelta = Math.max(maxLongitude - minLongitude, MIN_FEATURE_BBOX_DELTA)
  const latitudeDelta = Math.max(maxLatitude - minLatitude, MIN_FEATURE_BBOX_DELTA)
  const zoomLatitude = Math.log(360 / latitudeDelta) / Math.LN2
  const zoomLongitude = Math.log(360 / longitudeDelta) / Math.LN2
  const [centerLongitude, centerLatitude] = featureCenter.geometry.coordinates
  const fittedZoom = Math.min(zoomLatitude, zoomLongitude, MAX_COUNTY_PREVIEW_ZOOM)

  return {
    mapCenter: [centerLatitude, centerLongitude],
    mapZoom: Number.isFinite(fittedZoom) ? Math.max(7.8, fittedZoom + 0.45) : DEFAULT_COUNTY_MAP_ZOOM,
  }
}

export function buildBudgetContextTableRows(params: {
  readonly geoJsonData: GeoJsonObject | undefined
  readonly seriesColumns: readonly AdvancedMapAnalyticsTableSeriesColumn[]
  readonly valuesBySeriesId: Map<string, Map<string, string | undefined>>
}): AdvancedMapAnalyticsTableRow[] {
  const featureCollection =
    params.geoJsonData?.type === 'FeatureCollection'
      ? (params.geoJsonData as FeatureCollection<Geometry, UatProperties>)
      : null

  const metadataBySirutaCode = new Map<
    string,
    Omit<AdvancedMapAnalyticsTableRow, 'sirutaCode' | 'valuesBySeriesId'>
  >()

  for (const feature of featureCollection?.features ?? []) {
    const typedFeature = feature as UatFeature
    const properties = typedFeature.properties
    const sirutaCode = String(properties?.natcode ?? '').trim()
    if (!sirutaCode) {
      continue
    }

    metadataBySirutaCode.set(sirutaCode, {
      uatName: String(properties?.name ?? ''),
      countyName: String(properties?.county ?? ''),
      entityCui: getEntityCuiFromUatProperties(properties),
    })
  }

  const uniqueSirutaCodes = new Set<string>()
  for (const seriesColumn of params.seriesColumns) {
    const vector = params.valuesBySeriesId.get(seriesColumn.id)
    if (!vector) {
      continue
    }

    for (const [sirutaCode, value] of vector.entries()) {
      if (value === undefined) {
        continue
      }

      uniqueSirutaCodes.add(String(sirutaCode))
    }
  }

  return [...uniqueSirutaCodes]
    .map((sirutaCode) => {
      const metadata = metadataBySirutaCode.get(sirutaCode)
      const valuesForRow: Record<string, string | undefined> = {}

      for (const seriesColumn of params.seriesColumns) {
        valuesForRow[seriesColumn.id] = params.valuesBySeriesId
          .get(seriesColumn.id)
          ?.get(sirutaCode)
      }

      return {
        sirutaCode,
        uatName: metadata?.uatName || `UAT ${sirutaCode}`,
        countyName: metadata?.countyName || '',
        entityCui: metadata?.entityCui,
        valuesBySeriesId: valuesForRow,
      }
    })
    .sort((left, right) => {
      const nameCompare = left.uatName.localeCompare(right.uatName, undefined, {
        sensitivity: 'base',
      })

      if (nameCompare !== 0) {
        return nameCompare
      }

      return (left.sirutaCode ?? '').localeCompare(right.sirutaCode ?? '')
    })
}

export function buildBudgetContextLeaderboardRows(params: {
  readonly rows: readonly AdvancedMapAnalyticsTableRow[]
  readonly seriesId: BudgetContextMapSeriesId
}): BudgetContextLeaderboardRow[] {
  return params.rows
    .map((row) => ({
      ...row,
      value: row.valuesBySeriesId[params.seriesId],
    }))
    .filter(
      (row): row is AdvancedMapAnalyticsTableRow & { value: string } =>
        row.value !== undefined && mapDecimalToRenderNumber(row.value) !== undefined,
    )
    .sort((left, right) => {
      const order = compareMapDecimals(right.value, left.value)
      if (order !== 0) {
        return order
      }

      const nameCompare = left.uatName.localeCompare(right.uatName, undefined, {
        sensitivity: 'base',
      })
      if (nameCompare !== 0) {
        return nameCompare
      }

      return (left.sirutaCode ?? '').localeCompare(right.sirutaCode ?? '')
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      value: mapDecimalToRenderNumber(row.value)!,
    }))
}

export function selectBudgetContextVisibleRows(params: {
  readonly rows: readonly BudgetContextLeaderboardRow[]
  readonly userEntityCui?: string
  readonly limit: number
}): BudgetContextLeaderboardRow[] {
  const topRows = params.rows.slice(0, params.limit)
  const userRow = params.userEntityCui
    ? params.rows.find((row) => row.entityCui === params.userEntityCui)
    : undefined

  if (!userRow) {
    return topRows
  }

  const alreadyVisible = topRows.some((row) => row.entityCui === userRow.entityCui)
  if (alreadyVisible) {
    return topRows
  }

  return [...topRows, userRow]
}

export function buildBudgetContextTopUatQuizOptions(params: {
  readonly rows: readonly BudgetContextLeaderboardRow[]
  readonly locale: 'ro' | 'en'
}): QuizOption[] {
  const candidateRows = params.rows.slice(0, 4)
  if (candidateRows.length === 0) {
    return []
  }

  const correctRow = candidateRows[0]
  const options = candidateRows.map((row) => ({
    id: row.sirutaCode,
    text: row.uatName,
    isCorrect: row.sirutaCode === correctRow.sirutaCode,
  }))

  const shuffledOptions = shuffleArray(
    options,
    correctRow.uatName.length + (params.locale === 'ro' ? 1 : 2),
  )

  if (shuffledOptions[0]?.isCorrect && shuffledOptions.length > 1) {
    return [...shuffledOptions.slice(1), shuffledOptions[0]] as QuizOption[]
  }

  return shuffledOptions as QuizOption[]
}
