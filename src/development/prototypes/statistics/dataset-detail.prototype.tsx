import { useSearch } from '@tanstack/react-router'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { DatasetDetailBrief } from './dataset-detail.brief'
import { DatasetDetailCombined } from './dataset-detail.combined'
import { DatasetDetailEditorial } from './dataset-detail.editorial'
import { DatasetDetailReport } from './dataset-detail.report'
import { DatasetDetailWorkbench } from './dataset-detail.workbench'

/**
 * Four designs for `/ins/seturi/$cod`, over the same live national series.
 *
 * Every variant calls the feature's real hooks through
 * `useDatasetPrototypeModel`, so the panes differ in layout and in what they
 * choose to say — never in their numbers. `?cod=POP107D` points all of them at
 * another matrix, which is the only way to tell a layout that works from one
 * that only works on a 3-axis annual series.
 *
 * What each is arguing:
 *
 * - **combined** — the parts of the other four that survived: `workbench`'s
 *   rail and its hero-plus-facts row, `brief`'s marked extremes,
 *   `editorial`'s area tint, `report`'s reading text and numbered notes.
 *
 * - **editorial** — the figure means nothing without its scale, so the value,
 *   the sentence that reads it and its two comparisons come first, and the
 *   scope moves below the chart as its caption.
 * - **workbench** — the axes are a standing rail, the data column is nothing
 *   but data, and the table is open. Built for the second visit, not the first.
 * - **brief** — nothing is collapsed. A stat band, a full-width figure, and
 *   the former accordion rows as two readable columns.
 * - **report** — a published statistical release: title block, lede, numbered
 *   figure with its source note underneath, numbered table, numbered notes.
 *
 * Copy here is plain Romanian literals rather than `t`/`<Trans>`. Prototypes
 * are excluded from catalog extraction, so either form renders as its source
 * text and neither touches `messages.po` — and three of these four variants
 * get deleted. The cost is real and lands at promotion: whichever wins has to
 * have its strings wrapped and extracted before it moves into the feature.
 */

const DEFAULT_CODE = 'ACC101B'

/** `?cod=` — the router JSON-parses search values, so non-strings are dropped. */
function usePrototypeCode(): string {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const raw = search['cod']
  return typeof raw === 'string' && raw.trim().length > 0
    ? raw.trim().toUpperCase()
    : DEFAULT_CODE
}

function Combined() {
  return <DatasetDetailCombined code={usePrototypeCode()} />
}

function Editorial() {
  return <DatasetDetailEditorial code={usePrototypeCode()} />
}

function Workbench() {
  return <DatasetDetailWorkbench code={usePrototypeCode()} />
}

function Brief() {
  return <DatasetDetailBrief code={usePrototypeCode()} />
}

function Report() {
  return <DatasetDetailReport code={usePrototypeCode()} />
}

export const prototype = {
  title: 'INS dataset detail',
  spec: 'docs/design/statistics/design.md',
  variants: {
    combined: {
      title: 'Combined',
      component: Combined,
      note: 'rail + marked extremes + area + notes',
    },
    editorial: {
      title: 'Editorial',
      component: Editorial,
      note: 'figure first, scope as caption',
    },
    workbench: {
      title: 'Workbench',
      component: Workbench,
      note: 'sticky axis rail, table open',
    },
    brief: {
      title: 'Brief',
      component: Brief,
      note: 'stat band, nothing collapsed',
    },
    report: {
      title: 'Report',
      component: Report,
      note: 'statistical release, numbered figure',
    },
  },
  compare: ['combined', 'editorial', 'workbench', 'brief', 'report'],
} satisfies PrototypeDefinition
