import type { Currency } from '@/schemas/charts'
import type { ExecutionGqlReportType } from '@/schemas/reporting'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults'
import {
  parseAdvancedMapAnalyticsUrlState,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics'

const MAP_PREVIEW_TIMESTAMP = '2026-03-06T00:00:00.000Z'
const PRIMARY_EXECUTION_REPORT_TYPE =
  'Executie bugetara agregata la nivel de ordonator principal'
const DEFAULT_YEAR_INTERVAL = {
  type: 'YEAR' as const,
  selection: {
    interval: {
      start: '2025',
      end: '2025',
    },
  },
}
const DEFAULT_NO_DATA_CONFIG = {
  color: '#cccccc',
  label: 'Fără date',
  showInTooltip: true,
}
const DEFAULT_BIN_BOUNDARIES = {
  minInclusive: true,
  maxExclusive: true,
}

export interface ChallengeEntityMapPreviewViewport {
  readonly mapCenter: [number, number]
  readonly mapZoom: number
}

export type ChallengeEntityMapPreviewKey =
  | 'expenses'
  | 'income'
  | 'balance'
  | 'local-taxes'

export type ChallengeEntityMapPreviewRuntimeContext = {
  readonly selectedPeriodLabel: string
  readonly normalization: 'total' | 'per_capita'
  readonly currency: Currency
  readonly inflationAdjusted: boolean
  readonly reportType: ExecutionGqlReportType
}

export interface ChallengeEntityMapPreviewDefinition {
  readonly key: ChallengeEntityMapPreviewKey
  readonly label: string
  readonly aliases: readonly string[]
  readonly fallbackViewport: ChallengeEntityMapPreviewViewport
  readonly mapState: AdvancedMapAnalyticsUrlState
  readonly buildPreviewCopy: (
    context: ChallengeEntityMapPreviewRuntimeContext,
  ) => {
    readonly mapName: string
    readonly mapDescription: string
  }
}

function createGradientBinsPreset({
  id,
  label,
  title,
  startColor,
  endColor,
  continuousPercentiles,
}: {
  readonly id: string
  readonly label: string
  readonly title: string
  readonly startColor: string
  readonly endColor: string
  readonly continuousPercentiles?: {
    readonly min: number
    readonly max: number
  }
}) {
  return {
    id,
    label,
    config: {
      bins: [],
      scale: 'sequential' as const,
      title,
      noData: DEFAULT_NO_DATA_CONFIG,
      gradient: {
        startColor,
        endColor,
      },
      colorMode: 'gradient' as const,
      boundaries: DEFAULT_BIN_BOUNDARIES,
      defaultBinCount: 5,
      showBinLabelOnLegend: true,
      ...(continuousPercentiles
        ? {
            intervalMode: 'continuous' as const,
            continuousPercentiles,
          }
        : {}),
    },
    createdAt: MAP_PREVIEW_TIMESTAMP,
    updatedAt: MAP_PREVIEW_TIMESTAMP,
  }
}

function createExecutionSeries({
  id,
  label,
  filter,
}: {
  readonly id: string
  readonly label: string
  readonly filter: Record<string, unknown>
}) {
  return {
    id,
    type: 'line-items-aggregated-yearly' as const,
    unit: '',
    label,
    config: {
      color: '#0000ff',
      showDataLabels: false,
    },
    filter,
    enabled: true,
    createdAt: MAP_PREVIEW_TIMESTAMP,
    updatedAt: MAP_PREVIEW_TIMESTAMP,
  }
}

function createCalculationSeries({
  id,
  label,
  calculation,
}: {
  readonly id: string
  readonly label: string
  readonly calculation: {
    readonly op: 'sum' | 'subtract'
    readonly args: readonly string[]
  }
}) {
  return {
    id,
    type: 'aggregated-series-calculation' as const,
    unit: '',
    label,
    config: {
      color: '#0000ff',
      showDataLabels: false,
    },
    enabled: true,
    createdAt: MAP_PREVIEW_TIMESTAMP,
    updatedAt: MAP_PREVIEW_TIMESTAMP,
    calculation: {
      op: calculation.op,
      args: [...calculation.args],
    },
  }
}

function createGeoJsonPopulationSeries(id: string) {
  return {
    id,
    type: 'geojson-dataset-series' as const,
    unit: 'loc.',
    label: 'Populație',
    config: {
      color: '#2563eb',
      showDataLabels: false,
    },
    enabled: true,
    createdAt: MAP_PREVIEW_TIMESTAMP,
    updatedAt: MAP_PREVIEW_TIMESTAMP,
    datasetKey: 'insPop2021' as const,
    countyFilterIds: [],
    regionFilterIds: [],
  }
}

function createMapPreviewState({
  mapName,
  fallbackViewport,
  activeSeriesId,
  activeBinPresetId,
  binsPresets,
  series,
  valueFilters,
}: {
  readonly mapName: string
  readonly fallbackViewport: ChallengeEntityMapPreviewViewport
  readonly activeSeriesId: string
  readonly activeBinPresetId: string
  readonly binsPresets: readonly [ReturnType<typeof createGradientBinsPreset>]
  readonly series: readonly unknown[]
  readonly valueFilters?: {
    readonly rules: readonly unknown[]
  }
}): AdvancedMapAnalyticsUrlState {
  return parseAdvancedMapAnalyticsUrlState({
    mapName,
    mapCenter: fallbackViewport.mapCenter,
    mapZoom: fallbackViewport.mapZoom,
    mapLayers: {
      countyBoundaries: true,
      roads: true,
      populationGrid: false,
    },
    activeView: 'map',
    activeSeriesId,
    activeBinPresetId,
    binsPresets,
    series,
    valueFilters: valueFilters ?? { rules: [] },
  })
}

function buildMapTitle(
  baseTitle: string,
  selectedPeriodLabel: string,
) {
  return `${baseTitle} (${selectedPeriodLabel})`
}

function getNormalizationLabel(normalization: 'total' | 'per_capita') {
  return normalization === 'per_capita' ? 'per capita' : 'total'
}

function getNormalizationSummary(normalization: 'total' | 'per_capita') {
  return normalization === 'per_capita'
    ? 'Valori raportate la numărul de locuitori.'
    : 'Valori totale, fără raportare la populație.'
}

function getInflationSummary(inflationAdjusted: boolean) {
  return inflationAdjusted
    ? 'Da, la prețuri constante 2024.'
    : 'Nu, valori nominale.'
}

function getReportTypeSummary(reportType: ExecutionGqlReportType) {
  if (reportType === 'DETAILED') {
    return 'Execuție bugetară detaliată.'
  }

  if (reportType === 'SECONDARY_AGGREGATED') {
    return 'Execuție bugetară agregată la nivel de ordonator secundar.'
  }

  return 'Execuție bugetară agregată la nivel de ordonator principal.'
}

function buildPreviewConfigSection({
  normalization,
  currency,
  inflationAdjusted,
  reportType,
}: Omit<
  ChallengeEntityMapPreviewRuntimeContext,
  'selectedPeriodLabel'
>) {
  return `### Config activă

- Normalizare: **${getNormalizationLabel(normalization)}**
- Monedă: **${currency}**
- Ajustare la inflație: **${getInflationSummary(inflationAdjusted)}**
- Tip raport: **${getReportTypeSummary(reportType)}**

${getNormalizationSummary(normalization)}`
}

const expensesViewport: ChallengeEntityMapPreviewViewport = {
  mapCenter: [45.92365, 25.0035],
  mapZoom: 7.3,
}

const incomeViewport: ChallengeEntityMapPreviewViewport = {
  mapCenter: [46.05086, 25.01306],
  mapZoom: 7.4,
}

const localTaxesViewport: ChallengeEntityMapPreviewViewport = {
  mapCenter: [46.05086, 25.01306],
  mapZoom: 7.4,
}

const balanceViewport: ChallengeEntityMapPreviewViewport = {
  mapCenter: [45.69134, 25.01306],
  mapZoom: 7.4,
}

export const CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS = [
  {
    key: 'expenses',
    label: 'Cheltuieli',
    aliases: [
      'expenses-total-per-capita',
      'expenses-personnel-per-capita',
      '8JwhV2lN5OIz',
      'Wy51tDP1HuQQ',
    ],
    fallbackViewport: expensesViewport,
    buildPreviewCopy: ({
      selectedPeriodLabel,
      normalization,
      currency,
      inflationAdjusted,
      reportType,
    }) => ({
      mapName: buildMapTitle('Cheltuieli UAT', selectedPeriodLabel),
      mapDescription: `Harta prezintă **cheltuielile UAT** din România pentru perioada **${selectedPeriodLabel}**.

${buildPreviewConfigSection({
  normalization,
  currency,
  inflationAdjusted,
  reportType,
})}

### Serii de date

- **Cheltuieli UAT** — cheltuieli totale pentru fiecare UAT
- **Populație** — serie auxiliară INS 2021 disponibilă pentru context geografic

### Ce include

- Totalul cheltuielilor pentru UAT, folosind aceeași configurație de raportare ca în sumar și tendințe
- Cheltuielile exclud transferurile interne (\`${DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES.join('`, `')}\`), la fel ca filtrul de cheltuieli din treemap`,
    }),
    mapState: createMapPreviewState({
      mapName: 'Cheltuieli UAT',
      fallbackViewport: expensesViewport,
      activeSeriesId: 'expenses',
      activeBinPresetId: 'expenses-bins',
      binsPresets: [
        createGradientBinsPreset({
          id: 'expenses-bins',
          label: 'Gradient cheltuieli',
          title: 'Cheltuieli UAT',
          startColor: '#fff49e',
          endColor: '#ff1900',
          continuousPercentiles: {
            min: 5,
            max: 95,
          },
        }),
      ],
      series: [
        createExecutionSeries({
          id: 'expenses',
          label: 'Cheltuieli',
          filter: {
            is_uat: true,
            exclude: {
              economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
            },
            currency: 'RON',
            report_type: PRIMARY_EXECUTION_REPORT_TYPE,
            normalization: 'total',
            report_period: DEFAULT_YEAR_INTERVAL,
            account_category: 'ch',
            inflation_adjusted: false,
          },
        }),
        createGeoJsonPopulationSeries('population-2021'),
      ],
    }),
  },
  {
    key: 'income',
    label: 'Venituri',
    aliases: ['income-total-per-capita', 'FWlNQTf8I_DC'],
    fallbackViewport: incomeViewport,
    buildPreviewCopy: ({
      selectedPeriodLabel,
      normalization,
      currency,
      inflationAdjusted,
      reportType,
    }) => ({
      mapName: buildMapTitle('Venituri UAT', selectedPeriodLabel),
      mapDescription: `Harta prezintă **veniturile UAT** din România pentru perioada **${selectedPeriodLabel}**.

${buildPreviewConfigSection({
  normalization,
  currency,
  inflationAdjusted,
  reportType,
})}

### Serii de date

- **Venituri UAT** — toate veniturile bugetare din sursele incluse
- **Populație** — serie auxiliară INS 2021 disponibilă pentru context geografic

### Ce include

- Totalul veniturilor pentru UAT, folosind aceeași configurație de raportare ca în sumar și tendințe`,
    }),
    mapState: createMapPreviewState({
      mapName: 'Venituri UAT',
      fallbackViewport: incomeViewport,
      activeSeriesId: 'income',
      activeBinPresetId: 'income-bins',
      binsPresets: [
        createGradientBinsPreset({
          id: 'income-bins',
          label: 'Gradient venituri',
          title: 'Venituri UAT',
          startColor: '#ffe83d',
          endColor: '#ff1900',
          continuousPercentiles: {
            min: 5,
            max: 95,
          },
        }),
      ],
      series: [
        createExecutionSeries({
          id: 'income',
          label: 'Venituri',
          filter: {
            is_uat: true,
            currency: 'RON',
            report_type: PRIMARY_EXECUTION_REPORT_TYPE,
            normalization: 'total',
            report_period: DEFAULT_YEAR_INTERVAL,
            account_category: 'vn',
            inflation_adjusted: false,
          },
        }),
        createGeoJsonPopulationSeries('population-2021'),
      ],
    }),
  },
  {
    key: 'balance',
    label: 'Balanță bugetară',
    aliases: ['budget-balance', 'M7PyWc0ic4hV'],
    fallbackViewport: balanceViewport,
    buildPreviewCopy: ({
      selectedPeriodLabel,
      normalization,
      currency,
      inflationAdjusted,
      reportType,
    }) => ({
      mapName: buildMapTitle('Balanță bugetară UAT', selectedPeriodLabel),
      mapDescription: `Harta prezintă **balanța bugetară a UAT-urilor** din România pentru perioada **${selectedPeriodLabel}**.

> **Balanță bugetară** = Venituri totale − Cheltuieli totale

${buildPreviewConfigSection({
  normalization,
  currency,
  inflationAdjusted,
  reportType,
})}

### Serii de date

- **Balanță bugetară** — venituri totale minus cheltuieli totale
- **Populație** — serie auxiliară INS 2021 disponibilă pentru context geografic

### Ce include

- Venituri totale minus cheltuieli totale, folosind aceeași configurație de raportare ca în sumar și tendințe
- Cheltuielile exclud transferurile interne (\`${DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES.join('`, `')}\`), la fel ca filtrul de cheltuieli din treemap`,
    }),
    mapState: createMapPreviewState({
      mapName: 'Balanță bugetară UAT',
      fallbackViewport: balanceViewport,
      activeSeriesId: 'balance',
      activeBinPresetId: 'balance-bins',
      binsPresets: [
        createGradientBinsPreset({
          id: 'balance-bins',
          label: 'Gradient deficit',
          title: 'Balanță bugetară UAT',
          startColor: '#ff1900',
          endColor: '#ffe83d',
          continuousPercentiles: {
            min: 10,
            max: 90,
          },
        }),
      ],
      series: [
        createExecutionSeries({
          id: 'balance-income',
          label: 'Venituri',
          filter: {
            is_uat: true,
            currency: 'RON',
            report_type: PRIMARY_EXECUTION_REPORT_TYPE,
            normalization: 'total',
            report_period: DEFAULT_YEAR_INTERVAL,
            account_category: 'vn',
            inflation_adjusted: false,
          },
        }),
        createExecutionSeries({
          id: 'balance-expenses',
          label: 'Cheltuieli',
          filter: {
            is_uat: true,
            exclude: {
              economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
            },
            currency: 'RON',
            report_type: PRIMARY_EXECUTION_REPORT_TYPE,
            normalization: 'total',
            report_period: DEFAULT_YEAR_INTERVAL,
            account_category: 'ch',
            inflation_adjusted: false,
          },
        }),
        createCalculationSeries({
          id: 'balance',
          label: 'Balanță bugetară',
          calculation: {
            op: 'subtract',
            args: ['balance-income', 'balance-expenses'],
          },
        }),
        createGeoJsonPopulationSeries('population-2021'),
      ],
    }),
  },
  {
    key: 'local-taxes',
    label: 'Taxe și impozite locale',
    aliases: [
      'taxes-local-per-capita',
      'taxes-local-total',
      '9yugt1MKU-WD',
      'gxnEfLoy3EqI',
    ],
    fallbackViewport: localTaxesViewport,
    buildPreviewCopy: ({
      selectedPeriodLabel,
      normalization,
      currency,
      inflationAdjusted,
      reportType,
    }) => ({
      mapName: buildMapTitle('Taxe și impozite locale UAT', selectedPeriodLabel),
      mapDescription: `Harta prezintă **taxele și impozitele locale** colectate de UAT-urile din România pentru perioada **${selectedPeriodLabel}**.

> **Taxe și impozite locale** = Impozite și taxe pe proprietate (fn:07) + Taxe pe utilizarea bunurilor (fn:16)

${buildPreviewConfigSection({
  normalization,
  currency,
  inflationAdjusted,
  reportType,
})}

### Serii de date

- **Impozite și taxe pe proprietate** (fn:07)
- **Taxe pe utilizarea bunurilor** (fn:16)
- **Populație** — serie auxiliară INS 2021 disponibilă pentru context geografic

### Ce include

- Execuție bugetară la nivel de **ordonator principal de credite**
- Scala de culori folosește **percentile continue** (5%–95%)`,
    }),
    mapState: createMapPreviewState({
      mapName: 'Taxe și impozite locale UAT',
      fallbackViewport: localTaxesViewport,
      activeSeriesId: 'local-taxes',
      activeBinPresetId: 'local-taxes-bins',
      binsPresets: [
        createGradientBinsPreset({
          id: 'local-taxes-bins',
          label: 'Gradient taxe locale',
          title: 'Taxe și impozite locale UAT',
          startColor: '#ffe83d',
          endColor: '#ff1900',
          continuousPercentiles: {
            min: 5,
            max: 95,
          },
        }),
      ],
      series: [
        createExecutionSeries({
          id: 'local-taxes-property',
          label: 'Impozite și taxe pe proprietate',
          filter: {
            is_uat: true,
            currency: 'RON',
            report_type: PRIMARY_EXECUTION_REPORT_TYPE,
            normalization: 'total',
            report_period: DEFAULT_YEAR_INTERVAL,
            account_category: 'vn',
            inflation_adjusted: false,
            functional_prefixes: ['07'],
          },
        }),
        createExecutionSeries({
          id: 'local-taxes-goods-use',
          label: 'Taxe pe utilizarea bunurilor',
          filter: {
            is_uat: true,
            exclude: {},
            currency: 'RON',
            report_type: PRIMARY_EXECUTION_REPORT_TYPE,
            normalization: 'total',
            report_period: DEFAULT_YEAR_INTERVAL,
            account_category: 'vn',
            inflation_adjusted: false,
            functional_prefixes: ['16'],
          },
        }),
        createCalculationSeries({
          id: 'local-taxes',
          label: 'Taxe și impozite locale',
          calculation: {
            op: 'sum',
            args: ['local-taxes-property', 'local-taxes-goods-use'],
          },
        }),
        createGeoJsonPopulationSeries('population-2021'),
      ],
    }),
  },
] as const satisfies readonly ChallengeEntityMapPreviewDefinition[]

export const DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY =
  CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[0].key

const challengeEntityMapPreviewDefinitionsByKey = new Map<
  ChallengeEntityMapPreviewKey,
  ChallengeEntityMapPreviewDefinition
>(
  CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS.map((entry) => [
    entry.key,
    entry,
  ]),
)

const challengeEntityMapPreviewKeysByAlias = new Map<
  string,
  ChallengeEntityMapPreviewKey
>(
  CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS.flatMap((entry) => [
    [entry.key, entry.key],
    ...entry.aliases.map((alias) => [alias, entry.key] as const),
  ]),
)

export function isChallengeEntityMapPreviewKey(
  value: string | undefined,
): value is ChallengeEntityMapPreviewKey {
  if (!value) {
    return false
  }

  return challengeEntityMapPreviewDefinitionsByKey.has(
    value as ChallengeEntityMapPreviewKey,
  )
}

export function normalizeChallengeEntityMapPreviewKey(
  value: string | undefined,
): ChallengeEntityMapPreviewKey {
  if (value && isChallengeEntityMapPreviewKey(value)) {
    return value
  }

  const aliasedPreviewKey = value
    ? challengeEntityMapPreviewKeysByAlias.get(value)
    : undefined
  if (aliasedPreviewKey) {
    return aliasedPreviewKey
  }

  return DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY
}

export function getChallengeEntityMapPreviewDefinition(
  value: string | undefined,
): ChallengeEntityMapPreviewDefinition {
  return challengeEntityMapPreviewDefinitionsByKey.get(
    normalizeChallengeEntityMapPreviewKey(value),
  )!
}
