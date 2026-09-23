import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'

/**
 * Editorial comparison presets — URL search-param bundles rendered as links.
 *
 * Every SIRUTA / county code below was verified against the live
 * `insTerritories` API (2026-08-26): București 179132/B, Cluj-Napoca
 * 54975/CJ, Timișoara 155243/TM, Iași 95060/IS, Constanța 60419/CT,
 * Craiova 69900/DJ, Brașov 40198/BV, plus county codes TR and IF from the
 * decade-story probes. Titles are generic (translatable); territory NAMES
 * always render from the API response, never from these constants.
 */
export interface ComparisonPreset {
  readonly id: string
  readonly title: MessageDescriptor
  readonly search: StatisticsComparisonsSearch
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
