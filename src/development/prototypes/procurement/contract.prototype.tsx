import type { PrototypeDefinition } from '@/development/harness/entry'
import { ContractAzi, ContractFisa } from './contract.variants'

/**
 * One contract's page (`/procurement/contracts/$id`), on eleven real SEAP
 * contracts read from the dev API and their award notices on e-licitatie
 * (`&c=<record>`). The owner's pick (28 September): `fisa`; `anunt` and
 * `cronologie` are deleted, the history now in the sheet. Promoted the same
 * day: `fisa` is now the page's own components on the fixtures — the target,
 * with the award notice's data the API does not serve yet — and `azi` the
 * page on the dev API as it answers today. See
 * `docs/design/procurement/design.md` §17.
 */
export const prototype = {
  title: 'Procurement contract page',
  spec: 'docs/design/procurement/design.md',
  variants: {
    fisa: { title: 'Fișa — the sheet', component: ContractFisa, note: 'The page on the fixtures, the award notice’s data included: the value and its facts, the firms, the published values, the history, the notice’s other contracts, the source; the context after.' },
    azi: { title: 'Azi — the page on today’s API', component: ContractAzi, note: 'The promoted page, reading the dev API as it answers now: without the notice’s offers, criterion, duration and history dates.' },
  },
  compare: ['azi', 'fisa'],
} satisfies PrototypeDefinition
