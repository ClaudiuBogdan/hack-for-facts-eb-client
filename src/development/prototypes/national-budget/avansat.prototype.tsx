import type { PrototypeDefinition } from '@/development/harness/entry'
import { BudgetAdvancedVariant } from './avansat.page'

/**
 * The national budget's advanced analysis page, read live from the national
 * budget API (4 October 2026), at the owner's request: the main page stays
 * the citizens' (graphical, `national-budget/hub`); this one analyses across
 * years, quarters and months and across the budget's dimensions — lines,
 * budgets, the law's funds, chapters, titles and laws, the ministries — in
 * the procurement analytics page's language. `analize` (mock-era) is kept.
 */
export const prototype = {
  title: 'Buget național — analize avansate (API live)',
  spec: 'docs/design/national-budget/design.md',
  variants: {
    avansat: {
      title: 'Analize avansate — API live, ani · trimestre · luni · dimensiuni',
      component: BudgetAdvancedVariant,
      note: 'Five populations (spending, revenue, deficit, the law, ministries); tabs per population; an analytics table with share, change and years; a time tab with a chart over a lines × periods matrix; the law by fund, chapter, title and law; evidence per value.',
    },
  },
} satisfies PrototypeDefinition
