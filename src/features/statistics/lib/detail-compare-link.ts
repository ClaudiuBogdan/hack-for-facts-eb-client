import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import type { InsDatasetDetails, InsObservation, InsPeriodicity } from '@/schemas/ins'
import {
  classificationTypeCode,
  dimensionsOfType,
  encodeTerritoryPin,
  parseComparisonToken,
  type EffectiveScope,
} from './dataset-selection'

/**
 * The comparison page's address for the series on screen. A type alias, not
 * an interface: the router's `search` wants an indexable object, which an
 * interface is not.
 */
export type DetailCompareSearch = {
  cod: string
  teritorii: [string, ...string[]]
  clasificari?: string[]
  unitate?: string
  frecventa?: InsPeriodicity
}

/**
 * The comparison token for the territory a row resolved to — a county by
 * its code, a locality by its SIRUTA, the country as RO. A region or a
 * macroregion has no comparison token, so it falls back to the country.
 */
export function rowTerritoryPin(row: InsObservation | null): string | null {
  const territory = row?.territory
  if (!territory) return null
  if (territory.level === 'LAU' && territory.siruta_code)
    return `siruta:${territory.siruta_code}`
  if (territory.level === 'NUTS3' && territory.code) return `cod:${territory.code}`
  if (territory.level === 'NATIONAL') return 'cod:RO'
  return null
}

/**
 * Comparison starts from the place on screen: the territory the scope
 * applies, or else the one the row a pinned geography axis resolved to —
 * picking Arad on the axis compares Arad, whatever link the page came from.
 * A territory the comparison cannot hold (a region) is not forwarded: the
 * row's own place stands in, and the country after it.
 *
 * It carries the series on screen too — its non-geographic members, unit
 * and cadence — which the comparison page reads as one explicit selection.
 * With the dataset alone it compared the matrix's default cell: „Feminin"
 * here became „Total" there. Only a complete selection at a cadence the
 * comparison can chart travels: a partial one, or a semestrial cadence sent
 * explicitly, is an invalid selection there rather than a prompt.
 */
export function buildCompareSearch(params: {
  readonly dataset: InsDatasetDetails
  readonly scope: EffectiveScope
  readonly sampleRow: InsObservation | null
  readonly periodicity: InsPeriodicity
  /** Every axis, the unit and the cadence are resolved. */
  readonly complete: boolean
}): DetailCompareSearch {
  const { dataset, scope, sampleRow, periodicity, complete } = params
  const geographyTypes = new Set(
    dimensionsOfType(dataset.dimensions, 'TERRITORIAL').map(classificationTypeCode),
  )
  const sharedPins = [...scope.classifications]
    .filter(([typeCode]) => !geographyTypes.has(typeCode))
    .map(([typeCode, code]) => `${typeCode}:${code}`)
  const scopePin = scope.territory ? encodeTerritoryPin(scope.territory) : null
  const territory =
    (scopePin !== null && parseComparisonToken(scopePin) !== null ? scopePin : null) ??
    rowTerritoryPin(sampleRow) ??
    'cod:RO'
  return {
    cod: dataset.code,
    teritorii: [territory],
    ...(complete && scope.unitCode !== null && isInsChartPeriodicity(periodicity)
      ? {
          ...(sharedPins.length > 0 ? { clasificari: sharedPins } : {}),
          unitate: scope.unitCode,
          frecventa: periodicity,
        }
      : {}),
  }
}
