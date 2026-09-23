import type {
  InsDataset,
  InsDashboardData,
  InsObservation,
  InsTerritory,
  InsTimePeriod,
} from '@/schemas/ins'
import type {
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../lib/dataset-status'
import {
  buildTerritoryRelatedLinks,
  resolveTerritoryIdentity,
} from '../lib/territory'

/**
 * Territory hub fixtures for the page tests.
 *
 * Shaped like the live INS serving contract (`src/schemas/ins.ts`), with
 * illustrative numbers — never served to a reader. They exercise the states
 * the page has to draw:
 * - an LAU territory (SIRUTA 54975, Cluj-Napoca) and a county-like one;
 * - the four headline matrices (POP107D, FOM104D, SOM101F, LOC101B);
 * - a catalog-only dataset (TUR101C) and one with no rows (SCL101C);
 * - a county-only dataset (GOS107A, has_uat_data=false);
 * - an observation carrying `value_status`;
 * - a sparkline gap (2022 absent from POP107D, so the line breaks);
 * - a null-unit observation.
 */

// ---------------------------------------------------------------------------
// Territories
// ---------------------------------------------------------------------------

const clujNapocaTerritory: InsTerritory = {
  code: '54975',
  siruta_code: '54975',
  level: 'LAU',
  name_ro: 'Municipiul Cluj-Napoca',
  name_en: 'Cluj-Napoca Municipality',
}

const bucharestCountyTerritory: InsTerritory = {
  code: 'B',
  siruta_code: '179132',
  level: 'NUTS3',
  name_ro: 'Municipiul București',
  name_en: 'Bucharest Municipality',
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const pop107dDataset: InsDataset = {
  id: 'dataset:POP107D',
  code: 'POP107D',
  name_ro: 'Populația după domiciliu la 1 ianuarie',
  name_en: 'Population by domicile at 1 January',
  definition_ro:
    'Populația după domiciliu a localităților/UAT-urilor la 1 ianuarie.',
  definition_en:
    'Population by domicile of localities/UATs at 1 January.',
  periodicity: ['ANNUAL'],
  year_range: [2014, 2024],
  dimension_count: 4,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'POP',
  context_name_ro: 'Populație',
  context_name_en: 'Population',
  context_path: 'POP',
  metadata: null,
}

const fom104dDataset: InsDataset = {
  id: 'dataset:FOM104D',
  code: 'FOM104D',
  name_ro: 'Numărul mediu al salariaților',
  name_en: 'Average number of employees',
  definition_ro: 'Numărul mediu al salariaților la nivel de UAT.',
  definition_en: 'Average number of employees at UAT level.',
  periodicity: ['ANNUAL'],
  year_range: [2014, 2023],
  dimension_count: 5,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'FOM',
  context_name_ro: 'Forța de muncă',
  context_name_en: 'Labour force',
  context_path: 'FOM',
  metadata: null,
}

const som101fDataset: InsDataset = {
  id: 'dataset:SOM101F',
  code: 'SOM101F',
  name_ro: 'Ponderea șomerilor înregistrați în resursele de muncă',
  name_en: 'Share of registered unemployed in labour resources',
  definition_ro: 'Ponderea șomerilor înregistrați în totalul resurselor de muncă, la nivel de UAT.',
  definition_en: 'Share of registered unemployed in total labour resources, at UAT level.',
  periodicity: ['ANNUAL'],
  year_range: [2014, 2023],
  dimension_count: 5,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'SOM',
  context_name_ro: 'Șomaj',
  context_name_en: 'Unemployment',
  context_path: 'SOM',
  metadata: null,
}

const loc101bDataset: InsDataset = {
  id: 'dataset:LOC101B',
  code: 'LOC101B',
  name_ro: 'Locuințe existente la sfârșitul anului',
  name_en: 'Existing dwellings at the end of the year',
  definition_ro: 'Fondul de locuințe existent la sfârșitul anului.',
  definition_en: 'The stock of dwellings at the end of the year.',
  periodicity: ['ANNUAL'],
  year_range: [2018, 2023],
  dimension_count: 3,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'LOC',
  context_name_ro: 'Locuințe',
  context_name_en: 'Dwellings',
  context_path: 'LOC',
  metadata: null,
}

const som103aDataset: InsDataset = {
  id: 'dataset:SOM103A',
  code: 'SOM103A',
  name_ro: 'Rata șomajului pe județe',
  name_en: 'Unemployment rate by county',
  definition_ro: 'Rata șomajului înregistrat la nivel de județ.',
  definition_en: 'Registered unemployment rate at county level.',
  periodicity: ['ANNUAL'],
  year_range: [2014, 2023],
  dimension_count: 4,
  has_uat_data: false,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'SOM',
  context_name_ro: 'Șomaj',
  context_name_en: 'Unemployment',
  context_path: 'SOM',
  metadata: null,
}

const scl101cNoDataDataset: InsDataset = {
  id: 'dataset:SCL101C',
  code: 'SCL101C',
  name_ro: 'Unități școlare pe localități',
  name_en: 'Schools by locality',
  definition_ro: 'Unități școlare la nivel de UAT.',
  definition_en: 'School units at UAT level.',
  periodicity: ['ANNUAL'],
  year_range: [2014, 2023],
  dimension_count: 4,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'SCL',
  context_name_ro: 'Educație',
  context_name_en: 'Education',
  context_path: 'SCL',
  metadata: null,
}

/** Catalog-only dataset: metadata present, no loaded observations. */
const tur101cCatalogOnlyDataset: InsDataset = {
  id: 'dataset:TUR101C',
  code: 'TUR101C',
  name_ro: 'Înnoptări în structuri de cazare turistică',
  name_en: 'Tourist nights in accommodation structures',
  definition_ro: 'Înnoptări pe localități și tipuri de cazare.',
  definition_en: 'Tourist nights by locality and accommodation type.',
  periodicity: ['MONTHLY'],
  year_range: [2019, 2024],
  dimension_count: 5,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'PENDING',
  last_sync_at: null,
  context_code: 'TUR',
  context_name_ro: 'Turism',
  context_name_en: 'Tourism',
  context_path: 'TUR',
  metadata: null,
}

/** County-only dataset: no UAT (LAU) data, only NUTS3. */
const gos107aCountyOnlyDataset: InsDataset = {
  id: 'dataset:GOS107A',
  code: 'GOS107A',
  name_ro: 'Conturi ale administrației publice pe județe',
  name_en: 'General government accounts by county',
  definition_ro: 'Conturi ale administrației publice la nivel de județ.',
  definition_en: 'General government accounts at county level.',
  periodicity: ['ANNUAL'],
  year_range: [2014, 2023],
  dimension_count: 4,
  has_uat_data: false,
  has_county_data: true,
  has_siruta: false,
  sync_status: 'full',
  last_sync_at: null,
  context_code: 'GOS',
  context_name_ro: 'Administrație publică',
  context_name_en: 'Public administration',
  context_path: 'GOS',
  metadata: null,
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

function annualPeriod(year: number): InsTimePeriod {
  return {
    iso_period: `${year}`,
    year,
    quarter: null,
    month: null,
    periodicity: 'ANNUAL',
  }
}

const pop107dObservations: InsObservation[] = [
  // Illustrative values, not INS's.
  {
    dataset_code: 'POP107D',
    value: '326000',
    value_status: null,
    time_period: annualPeriod(2024),
    territory: clujNapocaTerritory,
    unit: {
      code: 'NR',
      symbol: 'nr.',
      name_ro: 'număr',
      name_en: 'number',
    },
    classifications: [],
    dimensions: null,
  },
  {
    dataset_code: 'POP107D',
    value: '324000',
    value_status: null,
    time_period: annualPeriod(2023),
    territory: clujNapocaTerritory,
    unit: {
      code: 'NR',
      symbol: 'nr.',
      name_ro: 'număr',
      name_en: 'number',
    },
    classifications: [],
    dimensions: null,
  },
  // Sparkline gap: 2022 is intentionally absent to exercise honest breaks.
  {
    dataset_code: 'POP107D',
    value: '322000',
    value_status: null,
    time_period: annualPeriod(2021),
    territory: clujNapocaTerritory,
    unit: {
      code: 'NR',
      symbol: 'nr.',
      name_ro: 'număr',
      name_en: 'number',
    },
    classifications: [],
    dimensions: null,
  },
]

const fom104dObservations: InsObservation[] = [
  // Carries value_status ("e" = estimated) to exercise status rendering.
  {
    dataset_code: 'FOM104D',
    value: '168000',
    value_status: 'e',
    time_period: annualPeriod(2023),
    territory: clujNapocaTerritory,
    unit: {
      code: 'NR',
      symbol: 'nr.',
      name_ro: 'număr',
      name_en: 'number',
    },
    classifications: [],
    dimensions: null,
  },
  {
    dataset_code: 'FOM104D',
    value: '164000',
    value_status: null,
    time_period: annualPeriod(2022),
    territory: clujNapocaTerritory,
    unit: {
      code: 'NR',
      symbol: 'nr.',
      name_ro: 'număr',
      name_en: 'number',
    },
    classifications: [],
    dimensions: null,
  },
]

const som101fObservations: InsObservation[] = [
  {
    dataset_code: 'SOM101F',
    value: '1.9',
    value_status: null,
    time_period: annualPeriod(2023),
    territory: clujNapocaTerritory,
    unit: {
      code: 'PCT',
      symbol: '%',
      name_ro: 'procent',
      name_en: 'percent',
    },
    classifications: [],
    dimensions: null,
  },
  // Null-unit observation: the source row carries no unit symbol/name.
  {
    dataset_code: 'SOM101F',
    value: '2.1',
    value_status: null,
    time_period: annualPeriod(2022),
    territory: clujNapocaTerritory,
    unit: null,
    classifications: [],
    dimensions: null,
  },
]

const loc101bObservations: InsObservation[] = [
  {
    dataset_code: 'LOC101B',
    value: '12.4',
    value_status: null,
    time_period: annualPeriod(2023),
    territory: clujNapocaTerritory,
    unit: {
      code: 'PCT',
      symbol: '%',
      name_ro: 'procent',
      name_en: 'percent',
    },
    classifications: [],
    dimensions: null,
  },
]

const uatDashboard: InsDashboardData = {
  groups: [
    {
      dataset: pop107dDataset,
      observations: pop107dObservations,
      latestPeriod: '2024',
    },
    {
      dataset: fom104dDataset,
      observations: fom104dObservations,
      latestPeriod: '2023',
    },
    {
      dataset: som101fDataset,
      observations: som101fObservations,
      latestPeriod: '2023',
    },
    {
      dataset: loc101bDataset,
      observations: loc101bObservations,
      latestPeriod: '2023',
    },
    {
      dataset: tur101cCatalogOnlyDataset,
      observations: [],
      latestPeriod: null,
    },
    {
      dataset: scl101cNoDataDataset,
      observations: [],
      latestPeriod: null,
    },
  ],
  partial: false,
}

/** County-level dashboard for the county-like fixture (county-only dataset). */
const countyDashboard: InsDashboardData = {
  groups: [
    {
      dataset: som103aDataset,
      observations: [
        {
          dataset_code: 'SOM103A',
          value: '1.2',
          value_status: null,
          time_period: annualPeriod(2023),
          territory: bucharestCountyTerritory,
          unit: {
            code: 'PCT',
            symbol: '%',
            name_ro: 'procent',
            name_en: 'percent',
          },
          classifications: [],
          dimensions: null,
        },
      ],
      latestPeriod: '2023',
    },
    {
      dataset: gos107aCountyOnlyDataset,
      observations: [
        {
          dataset_code: 'GOS107A',
          value: '4200',
          value_status: null,
          time_period: annualPeriod(2023),
          territory: bucharestCountyTerritory,
          unit: {
            code: 'MIO_RON',
            symbol: 'mil. lei',
            name_ro: 'milioane lei',
            name_en: 'million RON',
          },
          classifications: [],
          dimensions: null,
        },
      ],
      latestPeriod: '2023',
    },
  ],
  partial: false,
}

// ---------------------------------------------------------------------------
// Mock lookups
// ---------------------------------------------------------------------------

/**
 * Picks the chronologically latest non-empty period string. Avoids
 * `Array.prototype.at` to stay compatible with the project's TS lib target.
 */
function pickLatestPeriodString(periods: readonly string[]): string | null {
  let latest: string | null = null
  for (const period of periods) {
    if (period.length === 0) continue
    if (latest === null || period > latest) {
      latest = period
    }
  }
  return latest
}

function getObservationPeriodKey(observation: InsObservation): number {
  return (
    observation.time_period.year * 10000 +
    (observation.time_period.quarter ?? 0) * 100 +
    (observation.time_period.month ?? 0)
  )
}

function pickLatestObservation(
  observations: readonly InsObservation[],
): InsObservation | null {
  let latest: InsObservation | null = null
  let latestKey = Number.NEGATIVE_INFINITY

  for (const observation of observations) {
    const key = getObservationPeriodKey(observation)
    if (key > latestKey) {
      latest = observation
      latestKey = key
    }
  }

  return latest
}

function buildSparkline(
  observations: readonly InsObservation[],
): readonly (readonly [InsTimePeriod, string | null])[] {
  return [...observations]
    .sort((left, right) => getObservationPeriodKey(left) - getObservationPeriodKey(right))
    .map(
      (observation) =>
        [
          observation.time_period,
          observation.value,
        ] as readonly [InsTimePeriod, string | null],
    )
}

/**
 * SIRUTA → territory hub result. Unknown SIRUTA codes return `null`, as the
 * live adapter's not-found contract does. Built lazily: the builder reaches
 * translation helpers (`buildTerritoryRelatedLinks` → Lingui `t`).
 */
let territoryHubCache: ReadonlyMap<string, StatisticsTerritoryHubResult> | null =
  null

function territoryHubBySiruta(): ReadonlyMap<
  string,
  StatisticsTerritoryHubResult
> {
  territoryHubCache ??= new Map([
    [
      '54975',
      buildTerritoryHub({
        siruta: '54975',
        dashboard: uatDashboard,
        territory: clujNapocaTerritory,
      }),
    ],
    [
      '179132',
      buildTerritoryHub({
        siruta: '179132',
        dashboard: countyDashboard,
        territory: bucharestCountyTerritory,
      }),
    ],
  ])
  return territoryHubCache
}

function buildTerritoryHub(params: {
  readonly siruta: string
  readonly dashboard: InsDashboardData
  readonly territory: InsTerritory
}): StatisticsTerritoryHubResult {
  const { siruta, dashboard, territory } = params

  const identity = resolveTerritoryIdentity({
    siruta,
    liveName: territory.name_ro,
    liveLevel: territory.level,
    liveCountyName: territory.level === 'NUTS3' ? territory.name_ro : null,
    liveCountyCode: territory.level === 'NUTS3' ? territory.code : null,
  })

  const tiles = dashboard.groups.map((group) => {
    const latest = pickLatestObservation(group.observations)
    const dataStatus = getDatasetDataStatus(group.dataset)
    const tileState: 'available' | 'catalog-only' | 'no-data' =
      dataStatus === 'catalog-only'
        ? 'catalog-only'
        : group.observations.length === 0
          ? 'no-data'
          : 'available'
    const sparkline = buildSparkline(group.observations)

    return {
      datasetCode: group.dataset.code,
      datasetNameRo: group.dataset.name_ro ?? null,
      datasetNameEn: group.dataset.name_en ?? null,
      periodicity: group.dataset.periodicity,
      dataStatus,
      tileState,
      value: latest?.value ?? null,
      valueStatus: latest?.value_status ?? null,
      unitSymbol: latest?.unit?.symbol ?? null,
      unitNameRo: latest?.unit?.name_ro ?? null,
      latestPeriod:
        group.latestPeriod ??
        pickLatestObservation(group.observations)?.time_period.iso_period ??
        null,
      latestYear: latest?.time_period.year ?? null,
      sparkline,
    }
  })

  const availableDatasetCodes = dashboard.groups
    .filter((group) => getDatasetDataStatus(group.dataset) === 'available')
    .map((group) => group.dataset.code)

  // Live-like counts, with this hub's one catalog-only matrix counted.
  const coverage = {
    availableDatasetCount: 1915,
    totalDatasetCount: 1916,
    catalogOnlyDatasetCount: 1,
    partial: false,
  }

  const latestDataPeriod = pickLatestPeriodString(
    dashboard.groups.map((group) => group.latestPeriod ?? ''),
  )

  return {
    identity,
    tiles,
    availableDatasetCodes,
    coverage,
    relatedLinks: buildTerritoryRelatedLinks({ identity }),
    latestDataPeriod,
    partial: dashboard.partial,
    benchmarks: {},
  }
}

/**
 * The hub is always returned unfiltered. Period selection is a client-side
 * transform (`lib/hub-period.ts`), so there is nothing to filter here — the
 * property the live adapter has too.
 */
export function territoryHubFixture(
  siruta: string,
): StatisticsTerritoryHubResult | null {
  return territoryHubBySiruta().get(siruta.trim()) ?? null
}

