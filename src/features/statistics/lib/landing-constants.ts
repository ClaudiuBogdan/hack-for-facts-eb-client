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
 * The eight INS level-0 context groups ("themes"). Codes are the
 * `rootContextCode` values the server filters on; labels are translatable
 * renderings of the INS group names (the API's own `name_ro` for these rows
 * carries raw HTML anchors and shouting caps).
 */
export const LANDING_THEMES: readonly {
  readonly code: string
  readonly label: MessageDescriptor
}[] = [
  { code: '1', label: msg`Statistică socială` },
  { code: '2', label: msg`Statistică economică` },
  { code: '3', label: msg`Finanțe` },
  { code: '4', label: msg`Justiție` },
  { code: '5', label: msg`Mediu înconjurător` },
  { code: '6', label: msg`Utilități publice și administrarea teritoriului` },
  { code: '7', label: msg`Dezvoltare durabilă — Orizont 2020` },
  { code: '8', label: msg`Dezvoltare durabilă — Ținte 2030` },
]

// ---------------------------------------------------------------------------
// Statistics hub (`/statistici`)
// ---------------------------------------------------------------------------

/**
 * The national indicators the hub reads in one `insLatestDatasetValues` call.
 * Labels are short, truthful renderings for a row; the API `name_ro` travels
 * alongside. Verified against the live data (2026-09-16): every code resolves
 * a `TOTAL_FALLBACK` cell at RO/NATIONAL.
 */
export const HUB_NATIONAL_DATASETS: readonly {
  readonly code: string
  readonly shortLabel: MessageDescriptor
}[] = [
  { code: 'POP107D', shortLabel: msg`Populația după domiciliu` },
  { code: 'FOM104D', shortLabel: msg`Salariați (număr mediu)` },
  { code: 'SOM101F', shortLabel: msg`Șomeri înregistrați (pondere)` },
  { code: 'LOC101B', shortLabel: msg`Locuințe existente` },
  { code: 'POP217A', shortLabel: msg`Speranța de viață` },
  { code: 'TUR104E', shortLabel: msg`Sosiri turiști` },
  { code: 'POP201D', shortLabel: msg`Născuți vii` },
  { code: 'POP206D', shortLabel: msg`Decedați` },
  { code: 'SOM103A', shortLabel: msg`Rata șomajului` },
]

export const HUB_NATIONAL_DATASET_CODES: readonly string[] = HUB_NATIONAL_DATASETS.map(
  (entry) => entry.code,
)

/** The rows the „România în cifre" band shows, in order. SOM103A is read for the county layer only. */
export const HUB_FIGURE_CODES: readonly string[] = [
  'POP107D',
  'FOM104D',
  'SOM101F',
  'LOC101B',
  'POP217A',
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
