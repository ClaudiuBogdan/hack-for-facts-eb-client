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
 * - Labels below are short, truthful renderings of the API dataset names for
 *   tile display; the full `name_ro` from the API is carried alongside and
 *   shown on the detail surface.
 */
export const LANDING_NATIONAL_DATASETS: readonly {
  readonly code: string
  readonly shortLabel: MessageDescriptor
}[] = [
  { code: 'POP107D', shortLabel: msg`Populația după domiciliu` },
  { code: 'FOM104D', shortLabel: msg`Salariați (număr mediu)` },
  { code: 'SOM101F', shortLabel: msg`Șomeri înregistrați (pondere)` },
  { code: 'LOC101B', shortLabel: msg`Locuințe existente` },
]

export const LANDING_NATIONAL_DATASET_CODES: readonly string[] =
  LANDING_NATIONAL_DATASETS.map((entry) => entry.code)

/** The decade story dataset: county population after domicile, 1 January. */
export const DECADE_DATASET_CODE = 'POP107D'

/**
 * Endpoint years of the decade story. Measured 2026-08-26: the loaded corpus
 * has NO observations before 2016 at any level (the catalog `year_range`
 * claims 1992+ but describes INS Tempo, not what is loaded), and POP107D's
 * latest loaded year is 2025. Re-validate on a data reload.
 */
export const DECADE_START_YEAR = 2016
export const DECADE_END_YEAR = 2025

/** Worked comparison example: salaried employees, Cluj-Napoca / Cluj / RO. */
export const EXAMPLE_DATASET_CODE = 'FOM104D'
/**
 * Mixed-level territory codes: national, county, LAU. A LAU's territory code
 * IS its SIRUTA code (M0-verified), so one `territoryCodes` filter fetches all
 * three levels in one query — filter keys AND together, never mix
 * `territoryCodes` with `sirutaCodes`.
 */
export const EXAMPLE_TERRITORY_CODES: readonly string[] = ['RO', 'CJ', '54975']
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
