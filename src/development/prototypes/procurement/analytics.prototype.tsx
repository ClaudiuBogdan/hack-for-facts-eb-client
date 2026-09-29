import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyticsPanou, AnalyticsRaspuns, AnalyticsTraseu } from './analytics.variants'

/**
 * The analytics page (`/procurement/analytics`, replacing the explorer at
 * `/procurement/search`), on live data: one query — what records, when,
 * which filters, grouped by what, measured how — in the URL, answered by the
 * API's analysis reads, moved by clicking rows. Three layouts over the same
 * engine, the same URL and the same numbers. See
 * `docs/design/procurement/design.md` §18.
 */
export const prototype = {
  title: 'Procurement analytics',
  spec: 'docs/design/procurement/design.md',
  variants: {
    raspuns: { title: 'Răspuns — the answer is the page', component: AnalyticsRaspuns, note: 'One column: controls in one row, the query as a sentence, four figures, the ranked list (a row click narrows and ranks the next axis), the selection, the years, records on request.' },
    traseu: { title: 'Traseu — who buys, what, from whom', component: AnalyticsTraseu, note: 'No group-by: three linked columns, each ranked under the other picks; a pick in one narrows the others. Where and when below.' },
    panou: { title: 'Panou — the workbench (control)', component: AnalyticsPanou, note: 'Every axis in a rail with its top options; the answer beside it.' },
  },
  compare: ['raspuns', 'traseu'],
} satisfies PrototypeDefinition
