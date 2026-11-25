import type { PrototypeDefinition } from '@/development/harness/entry'
import { SearchPagePrototype } from './search.page'

/**
 * `/legislation/search` in the landing's language, for the owner's review (asked for on 25 November 2026:
 * prototype first, then promote; promoted the same day, kept as the record of the design). Live search and resolver
 * reads from the dev API through the feature's own adapters.
 */
export const prototype = {
  title: 'Legislație — pagina de căutare (prototip, 25 noiembrie)',
  variants: {
    randuri: {
      title: 'Căutare, runda 1: rânduri simple și filtre',
      component: SearchPagePrototype,
      note: "One title (the slim head's), the landing's search field without its focus lift, searching as you type (300 ms pause, 3 letters; Enter at once). Beside it the „Filtre\" button alone, opening the analysis page's side panel: type (18), status (the old „include repealed\" box folded in), years, domain, category and penalties (the last three from the AI summaries, said so), issuer once LEG-N36A lands; active filters as removable chips above the results. Results as plain rows (a bare „Doc nr.\" act by its Portal name), notes behind one ⓘ, a name that means several acts in a card. A zero result keeps its sentence in the open. Approved and promoted to /legislation/search the same day (the query and filters in the address there). Live API.",
    },
  },
} satisfies PrototypeDefinition
