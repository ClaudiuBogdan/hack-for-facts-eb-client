import type { PrototypeDefinition } from '@/development/harness/entry'
import { HubAtlas } from './hub.atlas'
import { HubCompact } from './hub.compact'
import { HubEditorial } from './hub.editorial'

/**
 * The `/companies` hub, three compositions over the same four modules —
 * scoped search, the four figures, CAEN divisions, counties on a map — in
 * the landing's visual language. The candidate list and the data inventory
 * (what is live, what is a stand-in) are in `docs/design/companies/design.md`.
 *
 * Live: `companyHubStats`, the all-county profile, the entity search scoped
 * to companies. Stand-ins, badged where drawn: CAEN division names and the
 * corpus-wide source dates.
 *
 * Judge each at `?v=<key>`; three full pages side by side are not judgeable,
 * so the default comparison is the two that differ most.
 */
export const prototype = {
  title: 'Firme — pagina principală',
  spec: 'docs/design/companies/design.md',
  variants: {
    editorial: {
      title: 'Editorial — o bandă pe idee',
      component: HubEditorial,
      note: 'The landing’s rhythm: hero with search, figures band, then sectors, counties, investigations, sources.',
    },
    atlas: {
      title: 'Atlas — harta în hero',
      component: HubAtlas,
      note: 'Map beside the search above the fold; top-5 counties under the search; sectors, status and investigations below.',
    },
    compact: {
      title: 'Compact — un ecran, dale',
      component: HubCompact,
      note: 'Short header, figures strip, tiled grid with a small map. Least scrolling.',
    },
  },
  compare: ['editorial', 'compact'],
} satisfies PrototypeDefinition
