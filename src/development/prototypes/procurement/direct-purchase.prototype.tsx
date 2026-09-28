import type { PrototypeDefinition } from '@/development/harness/entry'
import { DaApi, DaTarget, DaToday } from './direct-purchase.variants'

/**
 * The direct-purchase page (`/procurement/direct-acquisitions/$id`, promoted
 * 28 September) against the API: `azi` is the page as the dev API serves it
 * today, `tinta` the same page on what the fixed API must serve (the detail
 * from prod, the CUI recovered, per-line prices and repeats), `api` every
 * record against every change the server owes it, checked live. For the
 * server session: `docs/design/procurement/design.md` §16.2 and §16.7.
 */
export const prototype = {
  title: 'Procurement direct purchase — today and target',
  spec: 'docs/design/procurement/design.md',
  variants: {
    azi: { title: 'Azi — the page on today’s API', component: DaToday, note: 'The promoted page, reading the dev API as it answers now.' },
    tinta: { title: 'Ținta — what the API must serve', component: DaTarget, note: 'The same components on the fixed API’s answer: the lines, the steps, the terms, the reasons, the CUI, other institutions’ prices, repeats.' },
    api: { title: 'API — what to change, checked live', component: DaApi, note: 'Ten records × six changes, read from the dev API: ✓ served, ✗ open, — not relevant.' },
  },
  compare: ['azi', 'tinta'],
} satisfies PrototypeDefinition
