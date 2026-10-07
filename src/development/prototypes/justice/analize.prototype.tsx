import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyzeCross, AnalyzeRanking } from './analize.page'

/**
 * The court portal's analysis page (justice-portal, 7 October 2026), on the
 * procurement analysis's grid and controls and the live judicial API: the
 * question as the headline, the court levels in the pinned bar, four
 * figures, the answer grouped by courts, counties, matters, stages or
 * levels, the years, one source line, every filter in a sheet. The two
 * variants differ in the answer's table. Decisions and data rules:
 * `docs/design/justice/design.md` §15.
 */
export const prototype = {
  title: 'Justiție — analize',
  spec: 'docs/design/justice/design.md',
  variants: {
    clasament: {
      title: 'Clasament — grupurile anului, cu schimbarea față de anul trecut',
      component: AnalyzeRanking,
      note: 'The procurement analysis table: the year’s groups ranked, the year before and the change, the share bar; counties also per 1,000 residents.',
    },
    incrucisat: {
      title: 'Încrucișat — grupurile pe ani, etape sau niveluri',
      component: AnalyzeCross,
      note: 'The same groups as rows, crossed with the capture’s years, the stages or the court levels as columns, each cell tinted by its share of the row.',
    },
  },
  compare: ['clasament', 'incrucisat'],
} satisfies PrototypeDefinition
