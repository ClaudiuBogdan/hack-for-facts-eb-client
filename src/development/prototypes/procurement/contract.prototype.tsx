import type { PrototypeDefinition } from '@/development/harness/entry'
import { ContractFisa } from './contract.variants'

/**
 * One contract's page (`/procurement/contracts/$id`), on eleven real SEAP
 * contracts read from the dev API and their award notices on e-licitatie
 * (`&c=<record>`). The record sheet of the direct-purchase page — the record
 * first, its context after, tinted. The owner's pick (28 September): `fisa`;
 * `anunt` and `cronologie` are deleted, the history now in the sheet. See
 * `docs/design/procurement/design.md` §17.
 */
export const prototype = {
  title: 'Procurement contract page',
  spec: 'docs/design/procurement/design.md',
  variants: {
    fisa: { title: 'Fișa — the sheet', component: ContractFisa, note: 'The value and its facts, the firms, the published values, the history, the notice’s other contracts, the source; the context after.' },
  },
} satisfies PrototypeDefinition
