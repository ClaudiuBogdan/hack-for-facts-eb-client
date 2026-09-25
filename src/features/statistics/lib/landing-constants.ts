import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { StatisticsHubIndicatorKey } from '@/schemas/statistics'

/**
 * The INS section's dataset registries: the eight domains the catalog and
 * the hub offer, and the matrices the `/ins` hub reads. The territory hub's
 * own four headline matrices live in `territory-groups.ts`.
 *
 * Every code here names a matrix verified against the live API; a label is a
 * short, truthful rendering of the API's own `name_ro`, which travels
 * alongside and is shown in full on the dataset page.
 */

/**
 * The eight INS level-0 context groups ("domains"). Codes are the
 * `rootContextCode` values the server filters on; labels are translatable
 * renderings of the INS group names (the API's own `name_ro` for these rows
 * carries raw HTML anchors and shouting caps). The summary names what a
 * reader finds inside, read off the domain's own subdomains and matrices —
 * the bare name does not say that „Finanțe" holds the budget executions or
 * that the two sustainable-development domains are the UN goals.
 */
export const LANDING_THEMES: readonly {
  readonly code: string
  readonly label: MessageDescriptor
  readonly summary: MessageDescriptor
}[] = [
  { code: '1', label: msg`Statistică socială`, summary: msg`Populație, muncă și salarii, educație, sănătate` },
  { code: '2', label: msg`Statistică economică`, summary: msg`PIB, prețuri, industrie, agricultură, locuințe, turism` },
  { code: '3', label: msg`Finanțe`, summary: msg`Bugetul de stat, bugetele locale, balanța de plăți` },
  { code: '4', label: msg`Justiție`, summary: msg`Instanțe, condamnări, criminalitate` },
  { code: '5', label: msg`Mediu înconjurător`, summary: msg`Ape, emisii, cheltuieli pentru mediu` },
  { code: '6', label: msg`Utilități publice și administrarea teritoriului`, summary: msg`Apă, canalizare, gaze, spații verzi, transport local` },
  { code: '7', label: msg`Dezvoltare durabilă — Orizont 2020`, summary: msg`Indicatorii strategiei naționale, până în 2020` },
  { code: '8', label: msg`Dezvoltare durabilă — Ținte 2030`, summary: msg`Cele 17 obiective ONU, până în 2030` },
]

// ---------------------------------------------------------------------------
// Statistics hub (`/ins`)
// ---------------------------------------------------------------------------

/**
 * The national indicators the hub reads in one `insLatestDatasetValues` call
 * (the county map's own anchors are a second: `HUB_COUNTY_ANCHOR_CODES`).
 * Labels are short, truthful renderings for a row; the API `name_ro` travels
 * alongside. Verified against the live data (2026-09-22): every code resolves
 * a `TOTAL_FALLBACK` cell at RO/NATIONAL. IPC102E and FOM106D have no
 * geography axis — national by construction — and their cells carry none.
 */
export const HUB_NATIONAL_DATASETS: readonly {
  readonly code: string
  readonly shortLabel: MessageDescriptor
}[] = [
  { code: 'IPC102E', shortLabel: msg`Inflația anuală` },
  { code: 'FOM106D', shortLabel: msg`Salariul mediu net` },
  { code: 'SOM103B', shortLabel: msg`Rata șomajului` },
  { code: 'POP105A', shortLabel: msg`Populația rezidentă` },
  { code: 'FOM104D', shortLabel: msg`Salariați (număr mediu)` },
  { code: 'POP217A', shortLabel: msg`Speranța de viață` },
  { code: 'LOC101B', shortLabel: msg`Locuințe existente` },
  { code: 'TUR104E', shortLabel: msg`Sosiri turiști` },
  { code: 'POP201D', shortLabel: msg`Născuți vii` },
  { code: 'POP206D', shortLabel: msg`Decedați` },
  { code: 'SOM103A', shortLabel: msg`Rata șomajului` },
]

export const HUB_NATIONAL_DATASET_CODES: readonly string[] = HUB_NATIONAL_DATASETS.map(
  (entry) => entry.code,
)

/**
 * The four figures under the hero: the numbers a reader comes to INS for,
 * each at its latest published period.
 *
 * - IPC102E is the consumer price index against the same month a year
 *   earlier (=100); the band shows the index less 100, which is how INS
 *   itself states the annual inflation rate.
 * - FOM106D is the monthly average net earnings; its CAEN Rev.2 series ends
 *   in December 2025, where INS moved to Rev.3.
 * - SOM103B is the REGISTERED unemployment rate at the end of the month —
 *   the same measure as the county map's SOM103A, monthly.
 * - POP105A is the resident population, the official count; the population
 *   by domicile (POP107D) keeps the emigrants who never changed address.
 */
export const HUB_HEADLINE_CODES = {
  inflation: 'IPC102E',
  earnings: 'FOM106D',
  unemployment: 'SOM103B',
  population: 'POP105A',
} as const

/** The rows the „România, an de an" band shows, in order: annual series with a captured history. */
export const HUB_FIGURE_CODES: readonly string[] = [
  'FOM104D',
  'POP217A',
  'LOC101B',
  'TUR104E',
  'POP201D',
  'POP206D',
]

/** One of the county map's indicators. */
export interface HubCountyLayerDefinition {
  /** In the address (`?indicator=`). */
  readonly key: StatisticsHubIndicatorKey
  readonly code: string
  /** On the switch. */
  readonly label: MessageDescriptor
  /** What the colours are, and when. */
  readonly legend: (year: string) => MessageDescriptor
  /** The word after a figure where the API's unit name would read badly: „‰" for a rate per 1,000. */
  readonly unit?: MessageDescriptor
  /** Decimals where the API's are noise: money in whole lei. */
  readonly digits?: number
  /** Orange above the national figure and blue below: where more is the concern — unemployment, age. */
  readonly reversed?: boolean
  /** One line against the likeliest misreading. */
  readonly caveat: MessageDescriptor
}

/**
 * The county map's indicators, keyed by the `indicator` search param: each a
 * rate or an average INS publishes for every county, so the map compares
 * counties rather than their sizes (the number of employees it drew until
 * 2026-09-25 was București's size, mostly). Each is read as its national
 * cell, then the counties' cells beside it. Verified against the live data
 * (2026-09-25): FOM116A's employment rate was left out — commuters are counted
 * where they work, so București reads 94% — and POP209A's infant mortality, a
 * year of which swings with a county's few births.
 */
export const HUB_COUNTY_LAYERS: readonly HubCountyLayerDefinition[] = [
  {
    key: 'viata',
    code: 'POP217A',
    label: msg`Speranța de viață`,
    legend: (year) => msg`Speranța de viață la naștere, ${year}`,
    caveat: msg`Câți ani ar trăi, în medie, un copil născut acum, la mortalitatea de azi.`,
  },
  {
    key: 'salariu',
    code: 'FOM106E',
    label: msg`Salariul net`,
    legend: (year) => msg`Câștigul salarial mediu net lunar, ${year}`,
    digits: 0,
    caveat: msg`Câștigul nominal al salariaților, nu venitul tuturor locuitorilor.`,
  },
  {
    key: 'pib',
    code: 'CON103H',
    label: msg`PIB pe locuitor`,
    legend: (year) => msg`Produsul intern brut pe locuitor, la prețurile anului ${year}`,
    digits: 0,
    caveat: msg`Valoarea produsă în județ, împărțită la locuitorii lui.`,
  },
  {
    key: 'somaj',
    code: 'SOM103A',
    label: msg`Șomaj`,
    legend: (year) => msg`Rata șomajului înregistrat, ${year}`,
    reversed: true,
    caveat: msg`Doar șomerii înregistrați: cine nu se înscrie nu apare.`,
  },
  {
    key: 'spor',
    code: 'POP215A',
    label: msg`Spor natural`,
    legend: (year) => msg`Sporul natural la 1.000 de locuitori, ${year}`,
    unit: msg`‰`,
    caveat: msg`Născuți-vii minus decedați: sub zero, mai multe decese decât nașteri.`,
  },
  {
    key: 'varsta',
    code: 'POP110A',
    label: msg`Vârsta medie`,
    legend: (year) => msg`Vârsta medie a populației după domiciliu, ${year}`,
    reversed: true,
    caveat: msg`După domiciliu: cine pleacă fără să-și schimbe domiciliul rămâne numărat.`,
  },
]

/**
 * The national cells only the county map needs — each layer's anchor that is
 * not one of the hub's own rows. Read apart from the rows: a cell of theirs
 * that fails validation must fail the map, never the page's figures.
 */
export const HUB_COUNTY_ANCHOR_CODES: readonly string[] = HUB_COUNTY_LAYERS.map((layer) => layer.code).filter(
  (code) => !HUB_NATIONAL_DATASET_CODES.includes(code),
)

/** Quick tries under the territory search. LAU rows only — a county has no SIRUTA. */
export const HUB_EXAMPLE_PLACES: readonly { readonly siruta: string; readonly name: string }[] = [
  { siruta: '54975', name: 'Cluj-Napoca' },
  { siruta: '179132', name: 'București' },
  { siruta: '155243', name: 'Timișoara' },
  { siruta: '95060', name: 'Iași' },
  { siruta: '60419', name: 'Constanța' },
]
