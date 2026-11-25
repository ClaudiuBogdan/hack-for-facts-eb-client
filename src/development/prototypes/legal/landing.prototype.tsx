import type { PrototypeDefinition } from '@/development/harness/entry'
import { LandingHub } from './landing.hub'
import { DedicatedPageExample } from './landing.page'

/**
 * The legislation landing without tabs, for the owner's review (asked for on 25 November 2026): a hub in the
 * companies hub's composition, with a summary of each dedicated page and a link to it, and one example of the
 * slim head a dedicated page carries once the tab bar is gone. Live data from the dev API through the
 * feature's hooks: no fixture, and nothing from the analytics prototype's fixture or map.
 */
export const prototype = {
  title: 'Legislație — pagina de pornire fără file (prototip, 25 noiembrie)',
  variants: {
    hub: {
      title: 'Pornire (/legislation)',
      component: LandingHub,
      note: 'Search and the leading acts in the head, the pinned bar, four figures, six numbered bands (changes, Felul, issuers, years, links, Monitorul Oficial), six places to start, the reading note and the sources. Live API.',
    },
    pagina: {
      title: 'Antetul unei pagini dedicate (exemplu: Analiză)',
      component: DedicatedPageExample,
      note: 'Breadcrumb, title, one pinned row of the sibling pages; no hero, no tab bar. Placeholder body.',
    },
  },
  compare: ['hub'],
} satisfies PrototypeDefinition
