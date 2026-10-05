import type { PrototypeDefinition } from '@/development/harness/entry'
import { BudgetHubVariant } from './hub.page'

/**
 * The national budget's front door, redone on 2 October 2026 in the
 * procurement, INS and NGO hubs' language at the owner's request (the `page`
 * prototype's two variants were rejected and are kept as a record). Its
 * analysis page is `national-budget/analize`. `?demo=loading|empty|
 * unavailable|error` shows the states. See `budget.RATIONALE.md`.
 */
export const prototype = {
  title: 'Buget național — prima pagină',
  spec: 'docs/design/national-budget/design.md',
  variants: {
    hub: {
      title: 'Hub — în limbajul paginilor de achiziții, INS și ONG',
      component: BudgetHubVariant,
      note: 'Lattice head with the question as the headline, search and shortcuts, the ministries that spend the most beside it; the pinned bar; four figures; spending, revenue, the law, the years; the ways into the analysis page.',
    },
  },
} satisfies PrototypeDefinition
