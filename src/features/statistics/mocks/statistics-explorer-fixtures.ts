import type {
  StatisticsDatasetSummary,
  StatisticsTerritorySearchRow,
} from '@/schemas/statistics'

/**
 * Mock fixtures for the territory search and dataset explorer surfaces.
 *
 * These are EXAMPLES shaped like the live INS serving contract, not claimed
 * real facts. They exist so every new page is fully operable under
 * `VITE_MOCK_DATASETS=ins-indicators` before the server ships `dataStatus` and
 * `insTerritories`. They deliberately cover:
 * - diacritics (Târgu Mureș, Brăila, Bacău) so unaccented search is exercised;
 * - both territory levels (LAU rows with a parent county, NUTS3 county rows);
 * - more than one explorer page at 25 rows/page;
 * - catalog-only datasets alongside fact-loaded ones;
 * - a county-only dataset (`has_uat_data: false`).
 */

export const MOCK_TERRITORIES: readonly StatisticsTerritorySearchRow[] = [
  { code: '54975', siruta: '54975', name: 'Municipiul Cluj-Napoca', level: 'LAU', countyCode: 'CJ', countyName: 'Cluj' },
  { code: '179132', siruta: '179132', name: 'Municipiul București', level: 'LAU', countyCode: 'B', countyName: 'București' },
  { code: '114523', siruta: '114523', name: 'Municipiul Târgu Mureș', level: 'LAU', countyCode: 'MS', countyName: 'Mureș' },
  { code: '44269', siruta: '44269', name: 'Municipiul Brăila', level: 'LAU', countyCode: 'BR', countyName: 'Brăila' },
  { code: '22597', siruta: '22597', name: 'Municipiul Bacău', level: 'LAU', countyCode: 'BC', countyName: 'Bacău' },
  { code: '54984', siruta: '54984', name: 'Municipiul Turda', level: 'LAU', countyCode: 'CJ', countyName: 'Cluj' },
  { code: '54993', siruta: '54993', name: 'Municipiul Dej', level: 'LAU', countyCode: 'CJ', countyName: 'Cluj' },
  { code: '38357', siruta: '38357', name: 'Municipiul Timișoara', level: 'LAU', countyCode: 'TM', countyName: 'Timiș' },
  { code: '26564', siruta: '26564', name: 'Municipiul Iași', level: 'LAU', countyCode: 'IS', countyName: 'Iași' },
  { code: '31883', siruta: '31883', name: 'Municipiul Constanța', level: 'LAU', countyCode: 'CT', countyName: 'Constanța' },
  { code: 'CJ', siruta: null, name: 'Cluj', level: 'NUTS3', countyCode: null, countyName: null },
  { code: 'MS', siruta: null, name: 'Mureș', level: 'NUTS3', countyCode: null, countyName: null },
  { code: 'TM', siruta: null, name: 'Timiș', level: 'NUTS3', countyCode: null, countyName: null },
  { code: 'B', siruta: null, name: 'București', level: 'NUTS3', countyCode: null, countyName: null },
]

type DatasetSeed = {
  readonly code: string
  readonly nameRo: string
  readonly contextNameRo: string
  readonly contextPath: string
  readonly periodicity: readonly ('ANNUAL' | 'QUARTERLY' | 'MONTHLY')[]
  readonly yearRange: readonly [number, number]
  readonly dataStatus: 'available' | 'catalog-only'
  readonly hasUatData?: boolean
  readonly hasCountyData?: boolean
}

const DATASET_SEEDS: readonly DatasetSeed[] = [
  { code: 'POP107D', nameRo: 'Populația după domiciliu pe sexe și grupe de vârstă', contextNameRo: 'Populație și structură demografică', contextPath: '2', periodicity: ['ANNUAL'], yearRange: [1992, 2024], dataStatus: 'available' },
  { code: 'POP108D', nameRo: 'Populația rezidentă pe medii de rezidență', contextNameRo: 'Populație și structură demografică', contextPath: '2', periodicity: ['ANNUAL'], yearRange: [2012, 2024], dataStatus: 'available' },
  { code: 'FOM104D', nameRo: 'Numărul mediu al salariaților pe activități economice', contextNameRo: 'Piața forței de muncă', contextPath: '3', periodicity: ['ANNUAL'], yearRange: [2000, 2023], dataStatus: 'available' },
  { code: 'FOM105F', nameRo: 'Efectivul salariaților la sfârșitul lunii', contextNameRo: 'Piața forței de muncă', contextPath: '3', periodicity: ['MONTHLY'], yearRange: [2010, 2024], dataStatus: 'available' },
  { code: 'SOM101F', nameRo: 'Șomerii înregistrați pe sexe', contextNameRo: 'Piața forței de muncă', contextPath: '3', periodicity: ['QUARTERLY', 'MONTHLY'], yearRange: [2005, 2024], dataStatus: 'available' },
  { code: 'LOC101B', nameRo: 'Locuințe terminate pe surse de finanțare', contextNameRo: 'Construcții și locuințe', contextPath: '4', periodicity: ['ANNUAL'], yearRange: [1990, 2023], dataStatus: 'available' },
  { code: 'SAN104B', nameRo: 'Personalul medico-sanitar pe categorii', contextNameRo: 'Sănătate', contextPath: '5', periodicity: ['ANNUAL'], yearRange: [1995, 2023], dataStatus: 'available' },
  { code: 'SCL103D', nameRo: 'Populația școlară pe niveluri de educație', contextNameRo: 'Educație', contextPath: '6', periodicity: ['ANNUAL'], yearRange: [1998, 2023], dataStatus: 'available' },
  { code: 'GOS107A', nameRo: 'Cantitatea de apă potabilă distribuită consumatorilor', contextNameRo: 'Utilități publice', contextPath: '7', periodicity: ['ANNUAL'], yearRange: [2000, 2023], dataStatus: 'available', hasUatData: false, hasCountyData: true },
  { code: 'AGR101A', nameRo: 'Suprafața agricolă după modul de folosință', contextNameRo: 'Agricultură', contextPath: '8', periodicity: ['ANNUAL'], yearRange: [2000, 2022], dataStatus: 'available' },
  { code: 'TUR101C', nameRo: 'Structuri de primire turistică cu funcțiuni de cazare', contextNameRo: 'Turism', contextPath: '9', periodicity: ['ANNUAL'], yearRange: [1990, 2023], dataStatus: 'catalog-only' },
  { code: 'TUR104B', nameRo: 'Sosiri ale turiștilor în structuri de primire turistică', contextNameRo: 'Turism', contextPath: '9', periodicity: ['MONTHLY'], yearRange: [2000, 2024], dataStatus: 'catalog-only' },
  { code: 'IND101A', nameRo: 'Producția industrială pe activități CAEN', contextNameRo: 'Industrie', contextPath: '10', periodicity: ['ANNUAL'], yearRange: [2005, 2022], dataStatus: 'catalog-only' },
  { code: 'JUS102B', nameRo: 'Persoane condamnate definitiv pe tipuri de infracțiuni', contextNameRo: 'Justiție', contextPath: '11', periodicity: ['ANNUAL'], yearRange: [1998, 2022], dataStatus: 'catalog-only' },
  { code: 'CUL105A', nameRo: 'Volume existente în biblioteci', contextNameRo: 'Cultură', contextPath: '12', periodicity: ['ANNUAL'], yearRange: [1995, 2023], dataStatus: 'catalog-only' },
]

/**
 * Pads the seeds out past one page of 25 so pagination is reachable in mock
 * mode. Padded rows are catalog-only, matching the real 27-vs-1,898 shape
 * where the overwhelming majority of the catalog has no facts loaded.
 */
function buildMockDatasets(): readonly StatisticsDatasetSummary[] {
  const seeded = DATASET_SEEDS.map(toSummary)

  const padded: StatisticsDatasetSummary[] = []
  for (let index = 0; index < 25; index += 1) {
    const ordinal = String(index + 1).padStart(3, '0')
    padded.push(
      toSummary({
        code: `CAT${ordinal}X`,
        nameRo: `Set de date în catalog ${ordinal}`,
        contextNameRo: 'Alte domenii',
        contextPath: '13',
        periodicity: ['ANNUAL'],
        yearRange: [2010, 2023],
        dataStatus: 'catalog-only',
      }),
    )
  }

  return [...seeded, ...padded]
}

function toSummary(seed: DatasetSeed): StatisticsDatasetSummary {
  return {
    code: seed.code,
    nameRo: seed.nameRo,
    nameEn: null,
    periodicity: seed.periodicity,
    yearRange: seed.yearRange,
    hasUatData: seed.hasUatData ?? true,
    hasCountyData: seed.hasCountyData ?? true,
    hasSiruta: seed.hasUatData ?? true,
    dataStatus: seed.dataStatus,
    latestPeriod: null,
    contextNameRo: seed.contextNameRo,
    contextPath: seed.contextPath,
  }
}

export const MOCK_EXPLORER_DATASETS: readonly StatisticsDatasetSummary[] =
  buildMockDatasets()
