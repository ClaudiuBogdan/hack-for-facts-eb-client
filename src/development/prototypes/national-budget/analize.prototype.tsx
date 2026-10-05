import type { PrototypeDefinition } from '@/development/harness/entry'
import { BudgetAnalysisVariant } from './analize.page'

/**
 * The national budget's analysis page, on the procurement analytics page's
 * grid and controls (2 October 2026, at the owner's request): the question
 * as the headline, four populations in the pinned bar (spending, revenue,
 * the law, the ministries), four figures, the answer as a table of every
 * number with each value's evidence one icon away, the years, one source
 * line, every filter in a sheet. The front door is `national-budget/hub`.
 */
export const prototype = {
  title: 'Buget național — analize',
  spec: 'docs/design/national-budget/design.md',
  variants: {
    analize: {
      title: 'Analize — în limbajul paginii de analize a achizițiilor',
      component: BudgetAnalysisVariant,
      note: 'Head with the period and the question; the populations bar; figures; tabs, measure and level over an analytics table (drill a group, evidence per row); years; source line; filter sheet.',
    },
  },
} satisfies PrototypeDefinition
