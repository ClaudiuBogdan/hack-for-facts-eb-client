import type { PrototypeDefinition } from '@/development/harness/entry'
import { PanoramaVariant } from './page.panorama'
import { QuestionsVariant } from './page.questions'

/**
 * The national budget page (`/buget-national-2026` → one page; the explorer
 * stays separate), built on the reviewed data handoff of 2 October 2026 through
 * the feature's mock adapter (`features/national-budget/page`). Both variants
 * read the same contract and the same URL keys; `?demo=loading|empty|
 * unavailable|error` shows the states. See `page.RATIONALE.md`.
 */
export const prototype = {
  title: 'Buget național — pagina bugetului de stat',
  spec: 'docs/design/national-budget/design.md',
  variants: {
    panorama: {
      title: 'Panoramă — overview first',
      component: PanoramaVariant,
      note: 'One sentence; plan and execution side by side, labelled apart, with a comparability line; the four budgets; spending and revenue lines; the laws since 2019 as one chart; the authorities with drilldown; coverage; one source line.',
    },
    intrebari: {
      title: 'Întrebări și dovezi — investigation first',
      component: QuestionsVariant,
      note: 'Three questions as tabs (approved, executed, changed); each with its own controls, an answer table that shows the printed token and the source of every figure, and a rail stating the basis or the comparison checks.',
    },
  },
  compare: ['panorama', 'intrebari'],
} satisfies PrototypeDefinition
