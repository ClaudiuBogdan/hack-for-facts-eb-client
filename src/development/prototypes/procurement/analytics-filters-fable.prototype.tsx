import type { PrototypeDefinition } from '@/development/harness/entry'
import { FilterSheet } from '@/features/procurement/components/analytics/analytics-filters'
import { FiltersHarness } from './analytics-filters-fable/harness'
import { FableFilterSheet } from './analytics-filters-fable/sheet'

/**
 * The analytics page's filters sheet, improved rather than rewritten (the
 * owner, 30 September 2026): the same visual language, regrouped, with one
 * place picker for region, county and locality. See
 * `analytics-filters-fable/RATIONALE.md`.
 *
 * Promoted the same day (design.md §18.18): `actual` is the page's own
 * sheet, now `grupat`'s promoted version; `grupat` stays as the design's
 * record.
 */

function Actual() {
  return <FiltersHarness sheet={FilterSheet} />
}

function Grupat() {
  return <FiltersHarness sheet={FableFilterSheet} />
}

export const prototype = {
  title: 'Procurement analytics — the filters sheet',
  spec: 'docs/design/procurement/design.md',
  variants: {
    actual: { title: 'Actual — the page’s sheet', component: Actual, note: 'The sheet as it is on /procurement/analytics (grupat, promoted), imported unchanged.' },
    grupat: {
      title: 'Grupat — five questions, one place picker',
      component: Grupat,
      note: 'Înregistrări · Perioada · Cine cumpără · Cine vinde · Ce cumpără; a label per row; a value set is a chip. A place is one search over regions, counties and localities, shown as its path, each crumb a step up. Months in the page’s language.',
    },
  },
  compare: ['actual', 'grupat'],
} satisfies PrototypeDefinition
