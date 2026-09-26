import { t } from '@lingui/core/macro'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { sentenceCaseShouting } from './dataset-names'
import { formatHubPeriod } from './period'
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

/** Where INS's name states the breakdown this page already is: one place among all. */
const PLACE_BREAKDOWN = /(?:judete|counties)\s+(?:si|and)\s+(?:localitati|localities)(?:\s+(?:de|of)\s+(?:plecare|destinatie|departure|destination))?/i
/** The last „pe"/„by" that opens a matrix's list of breakdowns. */
const BREAKDOWN_OPENER = /[\s,]+(?:pe|by)\s+/gi

/**
 * A matrix's name as a row on a place's page. INS names a matrix by what it
 * counts and every axis it breaks that down by — „POPULATIA DUPA DOMICILIU la
 * 1 ianuarie pe grupe de varsta si varste, sexe, judete si localitati" — and
 * this page shows one cell of it: the place's total. So the breakdown goes,
 * from its opening „pe"/„by" through „judete si localitati"; what INS adds
 * after it (a reference date, a parenthesis) stays; and a name that opens in
 * capitals is set in sentence case (`sentenceCaseShouting`, shared with the
 * catalog and series titles). A name that states no place breakdown is
 * left as it is. The full name stays on the row's title and on the series.
 */
export function shortIndicatorName(name: string): string {
  const compact = name.replace(/\s+/g, ' ').trim()
  const place = PLACE_BREAKDOWN.exec(compact)
  if (!place) return compact

  const before = compact.slice(0, place.index)
  const openers = [...before.matchAll(BREAKDOWN_OPENER)]
  const cut = openers.length > 0 ? openers[openers.length - 1]!.index : before.length
  const head = before.slice(0, cut).replace(/[\s,]+$/, '')
  if (head.length === 0) return compact

  const tail = compact
    .slice(place.index + place[0].length)
    .replace(/^[\s,.]+|[\s,.]+$/g, '')
  const joined =
    tail.length > 0 && !head.toLowerCase().includes(tail.toLowerCase()) ? `${head} ${tail}` : head
  return sentenceCaseShouting(joined)
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
