import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'

export type MapDataGrain = 'region' | 'county' | 'uat'

type BuildMapDataCsvParams = {
  readonly data: readonly (HeatmapCountyDataPoint | HeatmapUATDataPoint)[]
  readonly grain: MapDataGrain
  readonly indicator: string
  readonly unit: string
  readonly transformValue?: (value: number) => number
  readonly uatMetadataBySiruta?: ReadonlyMap<string, MapDataUatMetadata>
}

export type MapDataUatMetadata = {
  readonly cui: string
  readonly uatName: string
  readonly countyCode: string
  readonly countyName: string
}

const MAP_DATA_COLUMNS = [
  'territory_grain',
  'siruta_code',
  'cui',
  'uat_name',
  'county_code',
  'county_name',
  'value',
  'indicator',
  'unit',
] as const

function cleanMetadataValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : ''
}

/** Build the SIRUTA join from the same dated UAT polygons painted by the map. */
export function buildUatMapMetadataBySiruta(
  geoJsonData: unknown,
): ReadonlyMap<string, MapDataUatMetadata> {
  const metadataBySiruta = new Map<string, MapDataUatMetadata>()
  if (!geoJsonData || typeof geoJsonData !== 'object') {
    return metadataBySiruta
  }

  const collection = geoJsonData as {
    readonly type?: unknown
    readonly features?: unknown
  }
  if (
    collection.type !== 'FeatureCollection' ||
    !Array.isArray(collection.features)
  ) {
    return metadataBySiruta
  }

  for (const feature of collection.features) {
    if (!feature || typeof feature !== 'object') continue
    const properties = (feature as { readonly properties?: unknown }).properties
    if (!properties || typeof properties !== 'object') continue
    const metadata = properties as Record<string, unknown>
    const siruta = cleanMetadataValue(metadata.natcode)
    if (!siruta) continue

    metadataBySiruta.set(siruta, {
      cui: cleanMetadataValue(metadata.cui),
      uatName: cleanMetadataValue(metadata.name),
      countyCode: cleanMetadataValue(metadata.countyMn),
      countyName: cleanMetadataValue(metadata.county),
    })
  }

  return metadataBySiruta
}

function escapeCsvCell(value: string | number): string {
  const raw = String(value)
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Build an Excel-friendly CSV from the exact point array painted by a map. */
export function buildMapDataCsv({
  data,
  grain,
  indicator,
  unit,
  transformValue = (value) => value,
  uatMetadataBySiruta,
}: BuildMapDataCsvParams): string {
  const rows = data.map((point) => {
    const isUat = 'siruta_code' in point
    const uatMetadata = isUat
      ? uatMetadataBySiruta?.get(point.siruta_code)
      : undefined
    const uatName = isUat
      ? (uatMetadata?.uatName || point.uat_name)
      : ''
    const countyCode =
      grain === 'region'
        ? ''
        : point.county_code || uatMetadata?.countyCode || ''
    const countyName =
      grain === 'region'
        ? ''
        : point.county_name || uatMetadata?.countyName || ''

    return [
      grain,
      isUat ? point.siruta_code : '',
      isUat ? (uatMetadata?.cui ?? '') : '',
      uatName,
      countyCode,
      countyName,
      transformValue(point.amount),
      indicator,
      unit,
    ]
      .map(escapeCsvCell)
      .join(',')
  })

  return [MAP_DATA_COLUMNS.join(','), ...rows].join('\r\n')
}

/** Download UTF-8 CSV with a BOM so Romanian diacritics open correctly in Excel. */
export function downloadMapDataCsv(csv: string, filename: string): void {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
