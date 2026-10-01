import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SUMMARY, useRegistryQuery, useRegistryRead, type Simulated } from './registry.data'
import { FilterSheet } from './registry.filters'
import { figuresOf } from './registry.counts'
import { countText, groupAxes, notesOf, questionOf, searchOf, type RegistryQuery, type UnreadParam } from './registry.model'
import {
  ANSWER_PANEL,
  AnswerTabs,
  answerTabId,
  GroupTable,
  Pending,
  RecordsTable,
  RegistryFigures,
  RegistryHead,
  SourceLine,
  StatusNav,
  StatusRow,
  YearsBars,
  type AnswerAxis,
} from './registry.parts'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      {children}
    </div>
  )
}

/** A selection's identity: the address's own keys and the simulated state. */
function keyOf(query: RegistryQuery, simulated: Simulated): string {
  return JSON.stringify([searchOf(query), simulated])
}

/**
 * The table's page, which belongs to one selection: a new one starts on
 * page 1. Not by remounting the page on a new address — that would close
 * and reopen the filter sheet, its focus lost, at every filter set in it.
 */
function useTablePage(key: string): readonly [number, (page: number) => void] {
  const [paging, setPaging] = useState({ key, page: 1 })
  // Reset as the selection changes, not only read as reset: back on an earlier selection, its old page must not return.
  if (paging.key !== key) setPaging({ key, page: 1 })
  return [paging.key === key ? paging.page : 1, (page: number) => setPaging({ key, page })] as const
}

// ─────────────────────────────────────────────────────────── întrebare ──

/**
 * `intrebare` — the registry as the analytics page: the question as the
 * headline, the statuses in the pinned bar, four figures that are true of
 * the selection (the registry counted whole, or a name's complete read,
 * „2.000+" past the cap), the answer as the records or broken down on the
 * axes its filters leave open, and the source at the foot.
 */
export function RegistryIntrebare() {
  const [query, move, unread, simulated] = useRegistryQuery()
  // A new question keeps them: the sheet stays open for the next filter, the answer on its axis.
  const [filters, setFilters] = useState(false)
  const [axis, setAxis] = useState<AnswerAxis>('inregistrari')
  return (
    <IntrebarePage query={query} unread={unread} simulated={simulated} onChange={move} filters={filters} onFilters={setFilters} axis={axis} onAxis={setAxis} />
  )
}

interface PageProps {
  readonly query: RegistryQuery
  readonly unread: readonly UnreadParam[]
  readonly simulated: Simulated
  readonly onChange: (query: RegistryQuery) => void
  /** The filter sheet is open. */
  readonly filters: boolean
  readonly onFilters: (open: boolean) => void
}

function IntrebarePage({
  query,
  unread,
  simulated,
  onChange,
  filters,
  onFilters,
  axis,
  onAxis,
}: PageProps & { readonly axis: AnswerAxis; readonly onAxis: (axis: AnswerAxis) => void }) {
  const [page, setPage] = useTablePage(keyOf(query, simulated))
  const state = useRegistryRead(query, simulated, page)
  const { read, summary, tally } = state
  const figures = figuresOf({ query, summary: summary ?? null, tally, read, stopped: state.error })
  const notes = notesOf({
    query,
    unread,
    snapshot: read.snapshot,
    summary: SUMMARY,
    summaryMatches: summary === undefined ? null : summary !== null,
    read,
    countsGap: state.countsGap,
    trap: questionOf(query)?.trap ?? null,
  })
  const count = tally?.total ?? null
  const counties = SUMMARY.counties
  // An axis the new question fixes (a county chosen while „Pe județe" is open) falls back to the records, and so does one that cannot be
  // counted (a name past the cap, a read that failed); one still being counted keeps its tab, its panel waiting.
  const uncountable = tally === null && (read.capped || state.error)
  const shownAxis: AnswerAxis = axis === 'inregistrari' || !groupAxes(query).includes(axis) || uncountable ? 'inregistrari' : axis
  return (
    <Shell>
      <RegistryHead query={query} counties={counties} snapshot={read.snapshot} notes={notes} onChange={onChange} onFilters={() => onFilters(true)} />
      <StatusNav query={query} counties={counties} onChange={onChange} />
      {/* A failed first read is said once, in the answer; the band waits for the retry. */}
      {state.error && read.pending ? null : <RegistryFigures figures={figures} />}
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <AnswerTabs query={query} read={read} tally={tally} error={state.error} axis={shownAxis} onAxis={onAxis} />
          <div role="tabpanel" id={ANSWER_PANEL} aria-labelledby={answerTabId(shownAxis)}>
            {shownAxis === 'inregistrari' ? (
              <RecordsTable query={query} counties={counties} state={state} page={page} onPage={setPage} onChange={onChange} className="mt-3" />
            ) : tally === null ? (
              <Pending rows={8} className="mt-3" />
            ) : shownAxis === 'an' ? (
              <YearsBars key={keyOf(query, simulated)} tally={tally} through={read.snapshot?.capturedAt.slice(0, 10) ?? null} className="mt-4" />
            ) : (
              <GroupTable
                key={`${shownAxis}:${keyOf(query, simulated)}`}
                query={query}
                counties={counties}
                tally={tally}
                axis={shownAxis}
                onChange={onChange}
                className="mt-3"
              />
            )}
          </div>
        </RuledFrame>
      </section>
      <RuledFrame className="py-8">
        <SourceLine snapshot={read.snapshot} tally={tally} />
      </RuledFrame>
      <FilterSheet query={query} counties={counties} count={count} onChange={onChange} open={filters} onOpenChange={onFilters} />
    </Shell>
  )
}

// ────────────────────────────────────────────────────────────── listă ──

/**
 * `lista` — the plain searchable list, in the same head: the question as
 * the headline with its count under it, the status as a quick row over the
 * records, the records, the source. No figures band, no breakdowns: the hub
 * says how many and where; this page says which ones.
 */
export function RegistryLista() {
  const [query, move, unread, simulated] = useRegistryQuery()
  const [filters, setFilters] = useState(false)
  return <ListaPage query={query} unread={unread} simulated={simulated} onChange={move} filters={filters} onFilters={setFilters} />
}

function ListaPage({ query, unread, simulated, onChange, filters, onFilters }: PageProps) {
  const [page, setPage] = useTablePage(keyOf(query, simulated))
  const state = useRegistryRead(query, simulated, page)
  const { read, summary, tally } = state
  const notes = notesOf({
    query,
    unread,
    snapshot: read.snapshot,
    summary: SUMMARY,
    summaryMatches: summary === undefined ? null : summary !== null,
    read,
    countsGap: state.countsGap,
    trap: questionOf(query)?.trap ?? null,
  })
  const count = tally?.total ?? null
  const counties = SUMMARY.counties
  const atLeast = countText(read.rows.length)
  const under = read.pending ? (
    <span className="inline-block h-5 w-40 animate-pulse bg-muted/60 align-middle" aria-hidden="true" />
  ) : (
    <p className="text-lg tabular-nums text-muted-foreground">{count !== null ? countText(count) : t`cel puțin ${atLeast}`}</p>
  )
  return (
    <Shell>
      <RegistryHead
        query={query}
        counties={counties}
        snapshot={read.snapshot}
        notes={notes}
        onChange={onChange}
        onFilters={() => onFilters(true)}
        under={under}
      />
      <section className="border-b" aria-label={t`Înregistrările`}>
        <RuledFrame className="py-10 sm:py-14">
          <StatusRow query={query} onChange={onChange} />
          <RecordsTable query={query} counties={counties} state={state} page={page} onPage={setPage} onChange={onChange} className="mt-4" />
        </RuledFrame>
      </section>
      <RuledFrame className="py-8">
        <SourceLine snapshot={read.snapshot} tally={tally} />
      </RuledFrame>
      <FilterSheet query={query} counties={counties} count={count} onChange={onChange} open={filters} onOpenChange={onFilters} />
    </Shell>
  )
}
