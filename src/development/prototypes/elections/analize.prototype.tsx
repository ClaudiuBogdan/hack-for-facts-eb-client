import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyzeCube, AnalyzeFinder, AnalyzeRanking } from './analize/page'

/**
 * The elections analysis page (proposed `/elections/analytics`), in the
 * procurement analysis's shape over the catalog snapshot: the question as the
 * headline, the scope types in the pinned bar, the figures, an answer, the
 * one source line, every filter in a sheet. Three spines over the same parts;
 * how each measure avoids counting an election twice is in
 * `analize/RATIONALE.md`. Design rules: `docs/design/elections/design.md` §12.
 */
export const prototype = {
  title: 'Alegeri — analize',
  spec: 'docs/design/elections/design.md',
  variants: {
    clasament: {
      title: 'Clasament — procurement’s ranked answer over the catalog',
      component: AnalyzeRanking,
      note: 'The levels in the pinned bar; three measures (rows on the reference edition, editions, elections) ranked by axis — elections, editions, offices, levels, rounds, counties, localities, time — the share only where the axis adds up; the years band with the calendar’s gaps.',
    },
    cub: {
      title: 'Cub — elections × offices, levels or rounds, and what the data covers',
      component: AnalyzeCube,
      note: 'A pivot: one row per election, one column per office (or level, or round), each cell the reference edition’s rows with a dot where other editions report too; under it the families by year against the calendar: in data, not in data, outside the calendar.',
    },
    randuri: {
      title: 'Rânduri — the finder: one edition’s rows from the live API first',
      component: AnalyzeFinder,
      note: 'Opens on the newest election’s reference edition; the pinned bar is its editions (the source choice made explicit); the first tab lists the rows themselves with the API’s own filters, each opening its contest or place; the other tabs count the edition.',
    },
  },
  compare: ['clasament', 'cub', 'randuri'],
} satisfies PrototypeDefinition
