import type { PrototypeDefinition } from '@/development/harness/entry'
import { HeadAzi, HeadCifre, HeadCinci, HeadFara, HeadPanou, HeadSimplu } from './hub-head.variants'

/**
 * The companies hub's head with less in it. The owner, 25 November 2026: the
 * card beside the search is too tall and shows too much. Each variant is the
 * real head with a different right-hand side, over the pinned bar and the
 * four figures; `azi` is the page as it is, for comparison.
 */
export const prototype = {
  title: 'Firme — capul paginii, mai puțin',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: HeadAzi, note: 'The page as it is: ten rows, each with its bar, county, activity and change.' },
    cinci: { title: 'Cinci rânduri', component: HeadCinci, note: 'The same card, five rows.' },
    simplu: { title: 'Simplu', component: HeadSimplu, note: 'Five rows, one line each: place, name, figure. The switch stays.' },
    panou: { title: 'Panou', component: HeadPanou, note: 'The landing’s institutions panel: caption strip, five two-line rows, „Toate firmele” as the last row, no switch.' },
    cifre: { title: 'Cifre', component: HeadCifre, note: 'No ranking: the four figures beside the search, the band under the head gone.' },
    fara: { title: 'Fără', component: HeadFara, note: 'Nothing beside the search; the four figures straight under the head.' },
  },
  compare: ['simplu', 'panou', 'cifre'],
} satisfies PrototypeDefinition
