import type { PrototypeDefinition } from '@/development/harness/entry'
import { ScrutinContext } from './scrutin/context'
import { ScrutinLineage } from './scrutin/lineage'
import { ScrutinResults } from './scrutin/results'

/**
 * The contest page (proposed `/elections/contests/$contestKey`): one contest
 * row, read live, in the procurement profiles' shape. Reads `?scrutin=<key>`
 * (default: Cluj-Napoca's mayor row in the 2024 BEC edition). See
 * `scrutin/RATIONALE.md`.
 */
export const prototype = {
  title: 'Elections — contest row',
  spec: 'docs/design/elections/design.md',
  variants: {
    lineage: {
      title: 'Istoric',
      component: ScrutinLineage,
      note: 'the same office at the same SIRUTA code across every edition is the spine; then the place, the levels, the empty results',
    },
    context: {
      title: 'Context',
      component: ScrutinContext,
      note: 'where the row sits is the spine: a ladder in the head, the sibling editions side by side, the place, the levels, a short history',
    },
    results: {
      title: 'Rezultate (probă)',
      component: ScrutinResults,
      note: 'the results-ready layout, its result bands sample shapes marked as such, beside the live identity and history',
    },
  },
  compare: ['lineage', 'context', 'results'],
} satisfies PrototypeDefinition
