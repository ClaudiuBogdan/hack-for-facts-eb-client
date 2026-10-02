import type { PrototypeDefinition } from '@/development/harness/entry'
import { ProcedureAzi, ProcedureConcurenta, ProcedureFisa } from './procedure.variants'

/**
 * One procedure's page (`/procurement/procedures/$id`), the last record page
 * on the old shared layout, on ten real notices read from the dev API and
 * e-licitatie on 2 October 2026 (`&c=<record>`). `fisa` and `concurenta` read
 * the award notice as e-licitatie publishes it — what the API must serve —
 * and differ in what comes first; `azi` is the sheet on what the API answers
 * today. See `docs/design/procurement/design.md` §22.
 */
export const prototype = {
  title: 'Procurement procedure page',
  spec: 'docs/design/procurement/design.md',
  variants: {
    fisa: { title: 'Fișa — the record sheet', component: ProcedureFisa, note: 'The contract page’s sheet on the whole procedure: the value against the estimate, the facts, the buyer and the winners; then the lots, the scoring, the calendar from the call to the award notice, the contracts, the source.' },
    concurenta: { title: 'Concurența — the competition first', component: ProcedureConcurenta, note: 'The offers and the lots before the value: four figures, then each lot with a mark per offer and its award against its estimate; the sheet after.' },
    azi: { title: 'Azi — the sheet on today’s API', component: ProcedureAzi, note: 'What procurementProcedure answers now: the notice’s row and up to 50 contract rows, one firm each — no lots, offers, criteria, call or dates.' },
  },
  compare: ['fisa', 'concurenta', 'azi'],
} satisfies PrototypeDefinition
