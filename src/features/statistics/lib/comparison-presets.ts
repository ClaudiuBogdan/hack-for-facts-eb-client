import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import { HUB_EXAMPLE_PLACES } from './landing-constants'

/**
 * Editorial comparison presets — URL search-param bundles rendered as links.
 *
 * Every SIRUTA / county code below was verified against the live
 * `insTerritories` API (2026-08-26): București 179132/B, Cluj-Napoca
 * 54975/CJ, Timișoara 155243/TM, Iași 95060/IS, Constanța 60419/CT,
 * Craiova 69900/DJ, Brașov 40198/BV, plus county codes TR and IF from the
 * decade-story probes. Titles are generic (translatable); a territory's
 * NAME renders from the API response as soon as it is read —
 * `COMPARISON_PRESET_PLACES` only names the page's first paint.
 */
export interface ComparisonPreset {
  readonly id: string
  readonly title: MessageDescriptor
  readonly search: StatisticsComparisonsSearch
}

/**
 * The municipalities the presets and the worked example name, each verified
 * against the live `insTerritories` API (2026-08-26), so a preset's first
 * paint reads „Craiova", not „69900", while the API names it. The hub's own
 * examples (`HUB_EXAMPLE_PLACES`) are the rest of this list.
 */
export const COMPARISON_PRESET_PLACES: readonly { readonly siruta: string; readonly name: string }[] = [
  { siruta: '69900', name: 'Craiova' },
  { siruta: '40198', name: 'Brașov' },
]

/**
 * The name this feature already documents for a SIRUTA code, or null. Every
 * place listed is a municipality. It is the fallback before the code itself,
 * never before a name the API has given.
 */
export function knownComparisonPlaceName(siruta: string): string | null {
  return (
    [...HUB_EXAMPLE_PLACES, ...COMPARISON_PRESET_PLACES].find((place) => place.siruta === siruta)?.name ?? null
  )
}

export const COMPARISON_PRESETS: readonly ComparisonPreset[] = [
  {
    id: 'localitate-judet-tara',
    title: msg`Localitatea vs județul vs România`,
    search: {
      cod: 'FOM104D',
      teritorii: ['siruta:54975', 'cod:CJ', 'cod:RO'],
    },
  },
  {
    id: 'cele-mai-mari-orase',
    title: msg`Cele mai mari 6 orașe`,
    search: {
      cod: 'POP107D',
      teritorii: [
        'siruta:179132',
        'siruta:54975',
        'siruta:155243',
        'siruta:95060',
        'siruta:60419',
        'siruta:69900',
      ],
    },
  },
  {
    id: 'bucuresti-ilfov',
    title: msg`București vs Ilfov vs România`,
    search: {
      cod: 'SOM101F',
      teritorii: ['cod:B', 'cod:IF', 'cod:RO'],
    },
  },
  {
    id: 'orase-universitare',
    title: msg`Orașe universitare`,
    search: {
      cod: 'POP107D',
      teritorii: ['siruta:179132', 'siruta:54975', 'siruta:95060', 'siruta:155243'],
    },
  },
  {
    id: 'locuinte-marile-orase',
    title: msg`Locuințe în marile orașe`,
    search: {
      cod: 'LOC101B',
      teritorii: ['siruta:179132', 'siruta:54975', 'siruta:155243', 'siruta:60419'],
    },
  },
  {
    id: 'ilfov-teleorman',
    title: msg`Județe în schimbare: Ilfov vs Teleorman`,
    search: {
      cod: 'POP107D',
      teritorii: ['cod:IF', 'cod:TR', 'cod:RO'],
    },
  },
]

/**
 * The live worked example shown when fewer than two territories are picked.
 * SAME-LEVEL trio by ruling (mixed levels stay a chip + the landing B3
 * target): three municipalities on the salaried-employees headcount.
 */
export const COMPARISON_EXAMPLE_PRESET: ComparisonPreset = {
  id: 'exemplu-trei-municipii',
  title: msg`Cluj-Napoca vs Iași vs Timișoara`,
  search: {
    cod: 'FOM104D',
    teritorii: ['siruta:54975', 'siruta:95060', 'siruta:155243'],
  },
}

/**
 * The indicators the picker offers before anything is typed: the figures
 * readers compare places on, each checked live (2026-09-23) for loaded
 * county figures; `localities` where INS publishes them per locality too.
 * The catalog search reaches the other 400-odd.
 */
export const COMPARISON_QUICK_INDICATORS: readonly {
  readonly code: string
  readonly label: MessageDescriptor
  readonly localities: boolean
}[] = [
  { code: 'POP107D', label: msg`Populația după domiciliu`, localities: true },
  { code: 'FOM104D', label: msg`Salariați (număr mediu)`, localities: true },
  { code: 'SOM101F', label: msg`Ponderea șomerilor înregistrați`, localities: true },
  { code: 'LOC101B', label: msg`Locuințe existente`, localities: true },
  { code: 'POP201D', label: msg`Născuți vii`, localities: true },
  { code: 'POP206D', label: msg`Decedați`, localities: true },
  { code: 'TUR104E', label: msg`Sosiri turiști`, localities: true },
  { code: 'POP217A', label: msg`Speranța de viață`, localities: false },
  { code: 'SOM103A', label: msg`Rata șomajului`, localities: false },
]

/** The quick indicator's short label for a matrix code, before its dataset is read; null for any other code. */
export function quickIndicatorLabel(code: string): MessageDescriptor | null {
  return COMPARISON_QUICK_INDICATORS.find((entry) => entry.code === code)?.label ?? null
}
