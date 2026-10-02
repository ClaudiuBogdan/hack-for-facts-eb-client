import type { PrototypeDefinition } from '@/development/harness/entry'
import { ProcedureFisa } from './procedure.variants'

/**
 * One procedure's page (`/procurement/procedures/$id`), the last record page
 * on the old shared layout, on ten real notices read from the dev API and
 * e-licitatie on 2 October 2026 (`&c=<record>`). The owner's pick the same
 * day: `fisa`, reading the award notice as e-licitatie publishes it — what the
 * API must serve; `concurenta` (the competition first) and `azi` (the sheet on
 * today's API) are deleted. Promoted the same day: `fisa` is now the page's own
 * components (`components/procedure/`) on the fixtures. See
 * `docs/design/procurement/design.md` §22.
 */
export const prototype = {
  title: 'Procurement procedure page',
  spec: 'docs/design/procurement/design.md',
  variants: {
    fisa: { title: 'Fișa — the record sheet', component: ProcedureFisa, note: 'The contract page’s sheet on the whole procedure: the value against the estimate, the facts, the buyer and the winners; then the lots, the scoring, the calendar from the call to the award notice, the contracts, the source.' },
  },
} satisfies PrototypeDefinition
