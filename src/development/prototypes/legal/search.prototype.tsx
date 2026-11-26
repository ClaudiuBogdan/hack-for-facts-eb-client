import type { PrototypeDefinition } from '@/development/harness/entry'
import { SearchPagePrototype } from './search.page'
import { SearchRoundTwo, SearchRoundTwoHead } from './search.r2'

/**
 * `/legislation/search` in the landing's language, for the owner's review (asked for on 25 November 2026:
 * prototype first, then promote; promoted the same day, kept as the record of the design). Live search and resolver
 * reads from the dev API through the feature's own adapters.
 *
 * Round 2 (26 November 2026): `registru` was chosen and promoted to `/legislation/search` the same day; `antet`, the
 * shorter head, was not chosen (owner: keep the usual head). Both stay here as the record.
 */
export const prototype = {
  title: 'Legislație — pagina de căutare (prototip, 25 noiembrie)',
  variants: {
    randuri: {
      title: 'Căutare, runda 1: rânduri simple și filtre',
      component: SearchPagePrototype,
      note: "One title (the slim head's), the landing's search field without its focus lift, searching as you type (300 ms pause, 3 letters; Enter at once). Beside it the „Filtre\" button alone, opening the analysis page's side panel: type (18), status (the old „include repealed\" box folded in), years, domain, category and penalties (the last three from the AI summaries, said so), issuer once LEG-N36A lands; active filters as removable chips above the results. Results as plain rows (a bare „Doc nr.\" act by its Portal name), notes behind one ⓘ, a name that means several acts in a card. A zero result keeps its sentence in the open. Approved and promoted to /legislation/search the same day (the query and filters in the address there). Live API.",
    },
    registru: {
      title: 'Căutare, runda 2: răspunsul întâi, apoi registrul',
      component: SearchRoundTwo,
      note: "Owner, 26 November 2026: polish and redesign. The same reads, filters and sentences as round 1; what changes is what the eye meets first. A larger field („/\" focuses it) with the filters beside it. A citation that names exactly one act (the resolver's word, never a score, never under a filter) is answered with that act in the hub's card before any list. The list is a register: the year in a rail, the act, its citations at the right; the question's words in bold in names and descriptions. A matched provision links to that provision in the act's text, its fragments under one label. The empty page shows three ways to ask, once. What was searched is said beside the count. The question and the filters are in the address (?q=, then the live page's filter keys). Live API.",
    },
    antet: {
      title: 'Căutare, runda 2 cu antet scurt: câmpul în antet',
      component: SearchRoundTwoHead,
      note: "Owner, 26 November 2026: a shorter head for the search page. The same page as „registru\", in a head of its own: the way back, a smaller title, the search field where the other pages have their sentence, the sources in one small line; then the pinned row of sibling pages and the answer. The field sits about 190px higher. Not chosen (owner, 26 November 2026: „Keep the usual head\"); kept as the record. Live API.",
    },
  },
  compare: ['registru'],
} satisfies PrototypeDefinition
