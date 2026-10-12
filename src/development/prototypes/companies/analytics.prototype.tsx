import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyticsPropozitie } from './analytics.variants'

/**
 * `/companies/analytics` in the procurement analytics page's language, live
 * on the companies analytics API (`companyAnalysis*`, release-pinned) through
 * the page's own data layer and URL model, so every address of the real page
 * opens here too. The current page is at `/companies/analytics` for comparison.
 *
 * `stare` (the statuses in the pinned bar) was folded into `propozitie` on
 * the owner's word (12 October 2026): the state is one of the filters, the
 * year and the measure are the controls row's dropdowns, the axes stay the
 * table's tabs.
 */
export const prototype = {
  title: 'Firme — analize',
  spec: 'docs/design/companies/design.md',
  variants: {
    propozitie: {
      title: 'Propoziție — the procurement analytics anatomy',
      component: AnalyticsPropozitie,
      note: 'The NGO registry head: the data date, the selection as the headline in a room of its own height (each filter a phrase with its ✕), the fiscal year and every measure as dropdowns, a search box to add a filter, filters / questions / link / one notes marker, the crux; the pinned bar with the sentence and Tabel · Hartă · Grafice; four bare figures; one tab per open axis over the table or the charts; the years band; the source.',
    },
  },
} satisfies PrototypeDefinition
