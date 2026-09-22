import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

/**
 * Landing data constants. Every dataset semantic here is verified against the
 * live data (M0 probes, 2026-08-26):
 *
 * - SOM101F is the REGISTERED-unemployment share („ponderea șomerilor
 *   înregistrați … în totalul resurselor de muncă"), never ILO unemployment.
 * - FOM104D is a salaried-employee HEADCOUNT („numărul mediu al salariaților"),
 *   never a wage.
 * - Hub labels below are short, truthful renderings of the API dataset names;
 *   the full `name_ro` from the API is carried alongside and shown on the
 *   detail surface.
 */
export const LANDING_NATIONAL_DATASET_CODES: readonly string[] = ['POP107D', 'FOM104D', 'SOM101F', 'LOC101B']

/** Worked comparison example: salaried employees, Cluj-Napoca / Cluj / RO. */
export const EXAMPLE_DATASET_CODE = 'FOM104D'
/** A LAU's territory code IS its SIRUTA code (M0-verified). */
export const EXAMPLE_LAU_SIRUTA = '54975'

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
 * The national indicators the hub reads in one `insLatestDatasetValues` call.
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

/** The county map's indicators, keyed by the `indicator` search param. */
export const HUB_COUNTY_LAYERS: readonly {
  readonly key: 'viata' | 'somaj' | 'salariati'
  readonly code: string
  readonly label: MessageDescriptor
  readonly legend: MessageDescriptor
}[] = [
  { key: 'viata', code: 'POP217A', label: msg`Speranța de viață`, legend: msg`Durata medie a vieții` },
  { key: 'somaj', code: 'SOM103A', label: msg`Rata șomajului`, legend: msg`Rata șomajului înregistrat` },
  { key: 'salariati', code: 'FOM104D', label: msg`Salariați`, legend: msg`Numărul mediu al salariaților` },
]

/** Quick tries under the territory search. LAU rows only — a county has no SIRUTA. */
export const HUB_EXAMPLE_PLACES: readonly { readonly siruta: string; readonly name: string }[] = [
  { siruta: '54975', name: 'Cluj-Napoca' },
  { siruta: '179132', name: 'București' },
  { siruta: '155243', name: 'Timișoara' },
  { siruta: '95060', name: 'Iași' },
  { siruta: '60419', name: 'Constanța' },
]
