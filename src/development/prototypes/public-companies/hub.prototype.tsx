import type { PrototypeDefinition } from '@/development/harness/entry'
import { ControlHub, PlacesHub, SizeHub } from './hub.page'

/**
 * The public enterprises' front door, on real data: the figures
 * `scripts/generate-public-enterprise-hub-fixture.mjs` computes from the dev
 * API (the API serves no aggregate yet; design note §12.3). Three variants in
 * the procurement, INS, NGO and national-budget hubs' language, one per
 * question the head leads with.
 */
export const prototype = {
  title: 'Întreprinderi publice — prima pagină',
  spec: 'docs/design/public-companies/design.md',
  variants: {
    control: {
      title: 'Cine le controlează',
      component: ControlHub,
      note: 'Head: the authorities with the most enterprises (state, county councils, cities and communes). Bands: kinds of authority, counties, activities, size, status, public money.',
    },
    marime: {
      title: 'Cât de mari sunt',
      component: SizeHub,
      note: 'Head: the largest by 2024 turnover, headcount or loss. Bands: who controls them, counties, activities, status, public money.',
    },
    judete: {
      title: 'Unde sunt',
      component: PlacesHub,
      note: 'Head: the counties with the most enterprises. Bands: the map, who controls them, activities, size, status, public money.',
    },
  },
  compare: ['control', 'marime', 'judete'],
} satisfies PrototypeDefinition
