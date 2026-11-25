import type { PrototypeDefinition } from '@/development/harness/entry'
import { AlaturiVariant, ColoanaVariant, PanouVariant } from './analytics.variants'

/**
 * `/entity-analytics` rethought (owner, 25 November 2026): the table is the
 * page, the breakdown sits with it instead of behind a view switch, and the
 * filters, which few readers use, leave the page's left third. Real reads from
 * the dev API; the page's state is in the address, as on the route.
 */
export const prototype = {
  title: 'Instituții publice — clasament și structură',
  variants: {
    coloana: { title: 'O coloană', component: ColoanaVariant, note: 'tabelul, apoi structura; filtrele într-un panou la cerere' },
    alaturi: { title: 'Alăturat', component: AlaturiVariant, note: 'tabelul și structura una lângă alta pe ecran lat' },
    panou: { title: 'Coloană de filtre', component: PanouVariant, note: 'filtrele rămân la stânga, închise până sunt cerute' },
  },
  compare: ['coloana'],
} satisfies PrototypeDefinition
