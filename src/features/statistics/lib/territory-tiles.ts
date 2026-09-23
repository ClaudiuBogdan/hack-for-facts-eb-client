import { t } from '@lingui/core/macro'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { formatHubPeriod } from './hub-format'
import { isInsPeriodicity, periodicityLabel } from './periodicity-labels'

/** The matrix's name in the reader's language, the Romanian one otherwise. */
export function tileDisplayName(tile: StatisticsIndicatorTile, locale: string): string {
  const romanian = locale.toLowerCase().startsWith('ro')
  return (
    (romanian ? tile.datasetNameRo : tile.datasetNameEn) ||
    tile.datasetNameRo ||
    tile.datasetNameEn ||
    tile.datasetCode
  )
}

/** The unit's name in the reader's language, the Romanian one otherwise, the symbol last. */
export function tileUnitName(tile: StatisticsIndicatorTile, locale: string): string | null {
  const romanian = locale.toLowerCase().startsWith('ro')
  return (
    (romanian ? tile.unitNameRo : tile.unitNameEn) ||
    tile.unitNameRo ||
    tile.unitNameEn ||
    tile.unitSymbol ||
    null
  )
}

/** Why a tile shows no figure, in the reader's words; null when it shows one. */
export function tileStateNote(tile: StatisticsIndicatorTile, activePeriod: string | null): string | null {
  switch (tile.tileState) {
    case 'available':
      return null
    case 'catalog-only':
      return t`Setul există în catalog, dar observațiile nu sunt încă încărcate.`
    case 'ambiguous':
      return t`Mai multe serii INS corespund selecției. Alege o serie din sursă.`
    case 'period-ambiguous':
      return t`Mai multe frecvențe corespund acestei perioade. Inspectează observațiile din sursă.`
    case 'unavailable':
      return t`Perioada nu este inclusă în istoricul încărcat. Verifică seria completă.`
    case 'period-missing': {
      // The cadences the rows actually have, not every one the catalog lists for the matrix.
      const published = [...new Set(tile.observations.map((row) => row.time_period.periodicity))]
      const cadences = (published.length > 0 ? published : tile.periodicity)
        .filter(isInsPeriodicity)
        .map(periodicityLabel)
        .join(', ')
      const period = activePeriod ? formatHubPeriod(activePeriod) : ''
      return cadences
        ? t`Nicio valoare pentru ${period}. Seria este ${cadences}.`
        : t`Nicio valoare pentru ${period}.`
    }
    case 'no-data':
      return t`Nu există observații pentru acest teritoriu în setul curent.`
  }
}

/** The comparison of this matrix across the place, its county and the country. */
export function tileCompareSearch(tile: StatisticsIndicatorTile, siruta: string, countyCode: string | null | undefined) {
  return {
    cod: tile.datasetCode,
    teritorii: [`siruta:${siruta}`, ...(countyCode ? [`cod:${countyCode}`] : []), 'cod:RO'] as [string, ...string[]],
  }
}
