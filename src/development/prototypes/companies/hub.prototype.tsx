import type { PrototypeDefinition } from '@/development/harness/entry'
import { HubEditorial } from './hub.editorial'

/**
 * The `/companies` hub in the landing's visual language: scoped search, the
 * four figures, CAEN divisions as bars, every county on a map, one band per
 * idea. Chosen on 16 September 2026 over an atlas (map in the hero) and a
 * compact tiled layout, for the layout; the record and the live-versus-mock
 * inventory are in `docs/design/companies/design.md`.
 *
 * Live: `companyHubStats`, the all-county profile, the entity search scoped
 * to companies. Stand-ins, badged where drawn: CAEN division names and the
 * corpus-wide source dates.
 */
export const prototype = {
  title: 'Firme — pagina principală',
  spec: 'docs/design/companies/design.md',
  variants: {
    editorial: {
      title: 'Editorial — o bandă pe idee',
      component: HubEditorial,
      note: 'Hero with search and the status panel, figures band, then sectors, counties, investigations, sources.',
    },
  },
} satisfies PrototypeDefinition
