import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyticsCurat, AnalyticsLateral, AnalyticsRaspuns, AnalyticsTabel } from './analytics.variants'

/**
 * The analytics page (`/procurement/analytics`, replacing the explorer at
 * `/procurement/search`), on live data: one query — what records, when,
 * which filters, grouped by what, measured how — in the URL, answered by the
 * API's analysis reads, moved by clicking rows. Four layouts over the same
 * engine, the same URL and the same numbers. See
 * `docs/design/procurement/design.md` §18.
 */
export const prototype = {
  title: 'Procurement analytics',
  spec: 'docs/design/procurement/design.md',
  variants: {
    raspuns: { title: 'Răspuns — the answer is the page', component: AnalyticsRaspuns, note: 'One column: controls in one row, the query as a sentence, four figures, the ranked list (a row click narrows and ranks the next axis), the selection, the years, records on request.' },
    curat: { title: 'Curat — the words cut', component: AnalyticsCurat, note: 'Răspuns with the text gone: headline, months and one caveat marker, bare figures, one-line bar rows, the years. Every filter in a sheet (right; bottom on a phone).' },
    lateral: { title: 'Lateral — filters beside the answer', component: AnalyticsLateral, note: "Curat's answer with the full filter panel open at the left, each field with its axis's top five in the selection. A sheet on a phone." },
    tabel: { title: 'Tabel — every number at once', component: AnalyticsTabel, note: 'Figures in one line; the answer as a table (records, lei, average, share), a header ranks by its column; time as rows. Filters in a sheet.' },
  },
  compare: ['raspuns', 'curat', 'lateral'],
} satisfies PrototypeDefinition
