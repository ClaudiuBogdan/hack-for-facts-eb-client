import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyticsBara, AnalyticsCurat, AnalyticsPropozitie, AnalyticsRaspuns } from './analytics.variants'

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
    curat: { title: 'Curat — the words cut', component: AnalyticsCurat, note: "Răspuns with the text gone: headline, months and one caveat marker, bare figures, the answer as a table of every measure (a chart in time), the years. Every filter in a sheet (right; bottom on a phone)." },
    propozitie: { title: 'Propoziție — the headline is the control', component: AnalyticsPropozitie, note: "Curat with its head redesigned: no toolbar; the headline's phrases are the controls (population ▾, a filter opens the panel, ✕ drops it), the months pick the period; figures in one ruled row." },
    bara: { title: 'Bară — one bar, figures with their years', component: AnalyticsBara, note: 'Curat with its head redesigned: population tabs and the period, one search field holding the filters as chips; each figure with its years since 2019.' },
  },
  compare: ['curat', 'propozitie', 'bara'],
} satisfies PrototypeDefinition
