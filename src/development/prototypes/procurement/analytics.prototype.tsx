import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyticsPropozitie } from './analytics.variants'

/**
 * The analytics page's design record, on live data: one query — what
 * records, when, which filters, grouped by what, measured how — in the URL,
 * answered by the API's analysis reads, moved by clicking rows. The owner's
 * pick after five rounds (`raspuns`, `traseu`, `panou`, `curat`, `lateral`,
 * `tabel`, `bara` were tried and removed): `propozitie`, on the procurement
 * profiles' grid. Promoted on 29 September 2026 to `/procurement/analytics`
 * (`src/features/procurement/components/analytics/`), replacing the
 * explorer at `/procurement/search`; kept here as the record of the design.
 * See `docs/design/procurement/design.md` §18.
 */
export const prototype = {
  title: 'Procurement analytics',
  spec: 'docs/design/procurement/design.md',
  variants: {
    propozitie: {
      title: 'Propoziție — the analytics page',
      component: AnalyticsPropozitie,
      note: "The head on the procurement profiles' grid (the period at the top right, the question as the headline — a filter's phrase opens the panel, ✕ drops it), the populations in the pinned bar, the figures band, the answer as a table (a chart in time), the years, the records.",
    },
  },
} satisfies PrototypeDefinition
