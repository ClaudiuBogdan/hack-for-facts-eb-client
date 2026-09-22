import type {
  StatisticsContextNode,
  StatisticsDatasetSummary,
} from '@/schemas/statistics'

/**
 * The slice of the INS context tree the seeds hang from — real codes and real
 * INS names, so the catalog rail and the row provenance line read in mock mode
 * exactly as they do against the server.
 */
export const MOCK_CONTEXT_TREE: readonly StatisticsContextNode[] = [
  { code: '1', level: 0, parentCode: null, nameRo: 'A. STATISTICA SOCIALA', nameEn: null },
  { code: '2', level: 0, parentCode: null, nameRo: 'B. STATISTICA ECONOMICA', nameEn: null },
  { code: '4', level: 0, parentCode: null, nameRo: 'D. JUSTITIE', nameEn: null },
  { code: '6', level: 0, parentCode: null, nameRo: 'F. UTILITATI PUBLICE SI ADMINISTRAREA TERITORIULUI', nameEn: null },
  { code: '10', level: 1, parentCode: '1', nameRo: 'A.1 POPULATIE SI STRUCTURA DEMOGRAFICA Comunicate de presa', nameEn: null },
  { code: '15', level: 1, parentCode: '1', nameRo: 'A.4 FORTA DE MUNCA Forta de munca si castiguri salariale-Comunicate de presa ; Ocuparea si somajul-Comunicate de presa', nameEn: null },
  { code: '25', level: 1, parentCode: '1', nameRo: 'A.7 EDUCATIE Comunicate de presa', nameEn: null },
  { code: '30', level: 1, parentCode: '1', nameRo: 'A.9 SANATATE Comunicate de presa', nameEn: null },
  { code: '32', level: 1, parentCode: '1', nameRo: 'A.10 CULTURA Comunicate de presa', nameEn: null },
  { code: '40', level: 1, parentCode: '2', nameRo: 'B.4 PRETURI Comunicate de presa', nameEn: null },
  { code: '45', level: 1, parentCode: '2', nameRo: 'B.5 AGRICULTURA Comunicate de presa', nameEn: null },
  { code: '50', level: 1, parentCode: '2', nameRo: 'B.7 INDUSTRIE Comunicate de presa', nameEn: null },
  { code: '53', level: 1, parentCode: '2', nameRo: 'B.10 LOCUINTE Comunicate de presa', nameEn: null },
  { code: '63', level: 1, parentCode: '2', nameRo: 'B.18 TURISM Comunicate de presa', nameEn: null },
  { code: '66', level: 1, parentCode: '4', nameRo: 'D.1 JUSTITIE', nameEn: null },
  { code: '70', level: 1, parentCode: '6', nameRo: 'F.1 UTILITATI PUBLICE Comunicate de presa', nameEn: null },
  { code: '1010', level: 2, parentCode: '10', nameRo: '1. POPULATIA REZIDENTA', nameEn: null },
  { code: '1012', level: 2, parentCode: '10', nameRo: '2. POPULATIA DUPA DOMICILIU', nameEn: null },
  { code: '1508', level: 2, parentCode: '15', nameRo: '4. SOMERI INREGISTRATI', nameEn: null },
  { code: '1513', level: 2, parentCode: '15', nameRo: '9. SALARIATI', nameEn: null },
  { code: '2506', level: 2, parentCode: '25', nameRo: '2. POPULATIA SCOLARA', nameEn: null },
  { code: '3010', level: 2, parentCode: '30', nameRo: '2. PERSONAL MEDICO - SANITAR', nameEn: null },
  { code: '3205', level: 2, parentCode: '32', nameRo: '1. BIBLIOTECI', nameEn: null },
  { code: '4000', level: 2, parentCode: '40', nameRo: '1. INDICII PRETURILOR DE CONSUM', nameEn: null },
  { code: '4505', level: 2, parentCode: '45', nameRo: '1. FONDUL FUNCIAR', nameEn: null },
  { code: '5010', level: 2, parentCode: '50', nameRo: '1. INDUSTRIE', nameEn: null },
  { code: '5030', level: 2, parentCode: '53', nameRo: '1. LOCUINTE', nameEn: null },
  { code: '6025', level: 2, parentCode: '63', nameRo: '1. TURISM', nameEn: null },
  { code: '7525', level: 2, parentCode: '70', nameRo: '1. UTILITATI PUBLICE', nameEn: null },
  { code: '8005', level: 2, parentCode: '66', nameRo: '1. JUSTITIE', nameEn: null },
]

const CONTEXT_BY_CODE = new Map(MOCK_CONTEXT_TREE.map((node) => [node.code, node]))

type DatasetSeed = {
  readonly code: string
  readonly nameRo: string
  /**
   * The subdomain the dataset hangs from; its name and path come from the
   * tree. `null` for the filler rows, which belong to no INS domain and must
   * not put a real subdomain's name on a made-up dataset.
   */
  readonly contextCode: string | null
  readonly periodicity: readonly ('ANNUAL' | 'QUARTERLY' | 'MONTHLY')[]
  readonly yearRange: readonly [number, number]
  readonly dataStatus: 'available' | 'catalog-only'
  readonly hasUatData?: boolean
  readonly hasCountyData?: boolean
}

const DATASET_SEEDS: readonly DatasetSeed[] = [
  { code: 'POP107D', nameRo: 'Populația după domiciliu pe sexe și grupe de vârstă', contextCode: '1012', periodicity: ['ANNUAL'], yearRange: [1992, 2024], dataStatus: 'available' },
  { code: 'POP108D', nameRo: 'Populația rezidentă pe medii de rezidență', contextCode: '1010', periodicity: ['ANNUAL'], yearRange: [2012, 2024], dataStatus: 'available' },
  { code: 'FOM104D', nameRo: 'Numărul mediu al salariaților pe activități economice', contextCode: '1513', periodicity: ['ANNUAL'], yearRange: [2000, 2023], dataStatus: 'available' },
  { code: 'FOM105F', nameRo: 'Efectivul salariaților la sfârșitul lunii', contextCode: '1513', periodicity: ['MONTHLY'], yearRange: [2010, 2024], dataStatus: 'available' },
  { code: 'SOM101F', nameRo: 'Șomerii înregistrați pe sexe', contextCode: '1508', periodicity: ['QUARTERLY', 'MONTHLY'], yearRange: [2005, 2024], dataStatus: 'available' },
  { code: 'LOC101B', nameRo: 'Locuințe terminate pe surse de finanțare', contextCode: '5030', periodicity: ['ANNUAL'], yearRange: [1990, 2023], dataStatus: 'available' },
  { code: 'SAN104B', nameRo: 'Personalul medico-sanitar pe categorii', contextCode: '3010', periodicity: ['ANNUAL'], yearRange: [1995, 2023], dataStatus: 'available' },
  { code: 'SCL103D', nameRo: 'Populația școlară pe niveluri de educație', contextCode: '2506', periodicity: ['ANNUAL'], yearRange: [1998, 2023], dataStatus: 'available' },
  { code: 'GOS107A', nameRo: 'Cantitatea de apă potabilă distribuită consumatorilor', contextCode: '7525', periodicity: ['ANNUAL'], yearRange: [2000, 2023], dataStatus: 'available', hasUatData: false, hasCountyData: true },
  { code: 'AGR101A', nameRo: 'Suprafața agricolă după modul de folosință', contextCode: '4505', periodicity: ['ANNUAL'], yearRange: [2000, 2022], dataStatus: 'available' },
  { code: 'TUR101C', nameRo: 'Structuri de primire turistică cu funcțiuni de cazare', contextCode: '6025', periodicity: ['ANNUAL'], yearRange: [1990, 2023], dataStatus: 'catalog-only' },
  { code: 'TUR104B', nameRo: 'Sosiri ale turiștilor în structuri de primire turistică', contextCode: '6025', periodicity: ['MONTHLY'], yearRange: [2000, 2024], dataStatus: 'catalog-only' },
  { code: 'IND101A', nameRo: 'Producția industrială pe activități CAEN', contextCode: '5010', periodicity: ['ANNUAL'], yearRange: [2005, 2022], dataStatus: 'catalog-only' },
  { code: 'JUS102B', nameRo: 'Persoane condamnate definitiv pe tipuri de infracțiuni', contextCode: '8005', periodicity: ['ANNUAL'], yearRange: [1998, 2022], dataStatus: 'catalog-only' },
  { code: 'CUL105A', nameRo: 'Volume existente în biblioteci', contextCode: '3205', periodicity: ['ANNUAL'], yearRange: [1995, 2023], dataStatus: 'catalog-only' },
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
        contextCode: null,
        periodicity: ['ANNUAL'],
        yearRange: [2010, 2023],
        dataStatus: 'catalog-only',
      }),
    )
  }

  return [...seeded, ...padded]
}

/**
 * Domain → group → subdomain, joined the way the deployed API serves
 * `context_path` today: the ancestors' names (verified 2026-09-17). Older
 * recordings in `tests/fixtures/` carry the ltree code path instead — the
 * field has changed shape at least once, which is why the rail walks
 * `parentCode` and treats this one as provenance. The entity INS view still
 * splits it on `.` for a root code (`ins-stats-view.formatters.ts`); that
 * predates this change and no longer works against either shape.
 */
function contextDisplayPath(contextCode: string | null): string | null {
  if (contextCode === null) return null
  const names: string[] = []
  const seen = new Set<string>()
  let current = CONTEXT_BY_CODE.get(contextCode)

  while (current && !seen.has(current.code)) {
    seen.add(current.code)
    if (current.nameRo) names.unshift(current.nameRo)
    current = current.parentCode ? CONTEXT_BY_CODE.get(current.parentCode) : undefined
  }

  return names.length > 0 ? names.join(' > ') : null
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
    contextCode: seed.contextCode,
    contextNameRo: seed.contextCode
      ? (CONTEXT_BY_CODE.get(seed.contextCode)?.nameRo ?? null)
      : null,
    contextPath: contextDisplayPath(seed.contextCode),
  }
}

export const MOCK_EXPLORER_DATASETS: readonly StatisticsDatasetSummary[] =
  buildMockDatasets()
